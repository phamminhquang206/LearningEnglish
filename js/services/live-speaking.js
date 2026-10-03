import { GEMINI_LIVE_URL } from '../config.js?v=2';

function bytesToBase64(bytes) {
  let binary = ''; const size = 8192;
  for (let i=0;i<bytes.length;i+=size) binary += String.fromCharCode(...bytes.subarray(i,i+size));
  return btoa(binary);
}
function resample(input, fromRate, toRate=16000) {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate; const length = Math.round(input.length / ratio); const out = new Float32Array(length);
  for (let i=0;i<length;i++) { const start=Math.floor(i*ratio), end=Math.min(Math.floor((i+1)*ratio),input.length); let sum=0; for(let j=start;j<end;j++)sum+=input[j]; out[i]=sum/Math.max(1,end-start); }
  return out;
}
function pcm16(float32) { const buffer=new ArrayBuffer(float32.length*2),view=new DataView(buffer); float32.forEach((value,i)=>{const s=Math.max(-1,Math.min(1,value));view.setInt16(i*2,s<0?s*0x8000:s*0x7fff,true)});return new Uint8Array(buffer); }

export class LiveSpeakingService extends EventTarget {
  constructor() { super(); this.socket=null;this.stream=null;this.context=null;this.worklet=null;this.playback=null;this.sources=new Set();this.transcript=[];this.active=false;this.sessionHandle=null;this.reconnects=0;this.timer=null; }
  emit(name,detail={}) { this.dispatchEvent(new CustomEvent(name,{detail})); }

  async connect({ apiKey, model, scenario }) {
    if (!apiKey || !model) throw new Error('Cần API key và model hỗ trợ Gemini Live.');
    this.apiKey=apiKey;this.model=model.startsWith('models/')?model:`models/${model}`;this.scenario=scenario;this.reconnects=0;this.transcript=[];
    await this.openSocket();
  }

  openSocket() {
    return new Promise((resolve,reject)=>{
      const socket=new WebSocket(`${GEMINI_LIVE_URL}?key=${encodeURIComponent(this.apiKey)}`);this.socket=socket;
      let ready=false;
      const timeout=setTimeout(()=>{socket.close();reject(new Error('Hết thời gian kết nối Gemini Live.'));},15000);
      socket.onopen=()=>{
        const setup={ setup:{ model:this.model, generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:'Kore'}}}},systemInstruction:{parts:[{text:`${this.scenario} Respond in English. Keep each turn under 35 words. Do not reveal reasoning.`}]},inputAudioTranscription:{},outputAudioTranscription:{},realtimeInputConfig:{activityHandling:'START_OF_ACTIVITY_INTERRUPTS'},sessionResumption:{} } };
        if(this.sessionHandle) setup.setup.sessionResumption={handle:this.sessionHandle};
        socket.send(JSON.stringify(setup));
      };
      socket.onmessage=event=>this.handleMessage(event.data,()=>{ready=true;clearTimeout(timeout);resolve();},error=>{clearTimeout(timeout);this.emit('error',{message:error.message});if(socket.readyState<2)socket.close(1000,'Unsupported Live configuration');if(!ready)reject(error)});
      socket.onerror=()=>{clearTimeout(timeout);reject(new Error('Không thể mở kết nối Gemini Live.'));};
      socket.onclose=event=>{clearTimeout(timeout);const message=event.reason||'Kết nối Gemini Live đã đóng.';this.emit('status',{state:'closed',message});if(!ready)reject(new Error(message));else if(this.active&&this.reconnects<2)this.reconnect();};
    });
  }

  handleMessage(raw,onReady=()=>{},onFailure=()=>{}) {
    if(raw instanceof Blob){raw.text().then(text=>this.handleMessage(text,onReady,onFailure));return;}
    let data;try{data=JSON.parse(raw)}catch{return;}
    if(data.error){onFailure(new Error(data.error.message||'Gemini Live từ chối cấu hình phiên.'));return;}
    if(data.setupComplete){this.active=true;this.emit('status',{state:'ready',message:'Sẵn sàng trò chuyện'});this.timer=setTimeout(()=>this.stop(),10*60*1000);onReady();return;}
    if(data.sessionResumptionUpdate?.newHandle)this.sessionHandle=data.sessionResumptionUpdate.newHandle;
    if(data.goAway){this.emit('status',{state:'reconnecting',message:'Đang nối lại phiên...'});return;}
    const sc=data.serverContent;if(!sc)return;
    if(sc.interrupted)this.clearPlayback();
    if(sc.inputTranscription?.text)this.addTranscript('user',sc.inputTranscription.text);
    if(sc.outputTranscription?.text)this.addTranscript('ai',sc.outputTranscription.text);
    (sc.modelTurn?.parts||[]).forEach(part=>{if(part.inlineData?.mimeType?.startsWith('audio/pcm'))this.playAudio(part.inlineData.data)});
  }

  addTranscript(role,text){const last=this.transcript.at(-1);if(last?.role===role)last.text+=text;else this.transcript.push({role,text});this.emit('transcript',{transcript:this.transcript});}

  async startMicrophone() {
    if(!this.socket||this.socket.readyState!==WebSocket.OPEN)throw new Error('Phiên nói chưa sẵn sàng.');
    this.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    this.context=new AudioContext();await this.context.audioWorklet.addModule('./js/services/pcm-worklet.js');
    const source=this.context.createMediaStreamSource(this.stream);this.worklet=new AudioWorkletNode(this.context,'pcm-capture');
    this.worklet.port.onmessage=event=>{if(!this.active||this.socket.readyState!==WebSocket.OPEN)return;const samples=resample(event.data,this.context.sampleRate);const peak=samples.reduce((m,v)=>Math.max(m,Math.abs(v)),0);if(peak>.08)this.clearPlayback();this.socket.send(JSON.stringify({realtimeInput:{audio:{data:bytesToBase64(pcm16(samples)),mimeType:'audio/pcm;rate=16000'}}}));};
    source.connect(this.worklet);this.worklet.connect(this.context.destination);this.emit('status',{state:'listening',message:'Đang nghe — hãy nói tự nhiên'});
  }

  stopMicrophone(){this.worklet?.disconnect();this.worklet=null;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.context?.close();this.context=null;if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}));this.emit('status',{state:'ready',message:'Đã dừng micro'});}
  async reconnect(){this.reconnects+=1;await new Promise(r=>setTimeout(r,500*this.reconnects));try{await this.openSocket();if(this.stream)await this.startMicrophone();}catch(error){this.emit('error',{message:error.message});}}
  playAudio(base64){if(!this.playback)this.playback=new AudioContext({sampleRate:24000});const raw=atob(base64),pcm=new Int16Array(raw.length/2);for(let i=0;i<pcm.length;i++)pcm[i]=(raw.charCodeAt(i*2)|(raw.charCodeAt(i*2+1)<<8));const buffer=this.playback.createBuffer(1,pcm.length,24000),channel=buffer.getChannelData(0);for(let i=0;i<pcm.length;i++)channel[i]=pcm[i]/32768;const source=this.playback.createBufferSource();source.buffer=buffer;source.connect(this.playback.destination);this.nextPlay=Math.max(this.nextPlay||0,this.playback.currentTime);source.start(this.nextPlay);this.nextPlay+=buffer.duration;this.sources.add(source);source.onended=()=>this.sources.delete(source);}
  clearPlayback(){this.sources.forEach(source=>{try{source.stop()}catch{}});this.sources.clear();this.nextPlay=this.playback?.currentTime||0;}
  stop(){clearTimeout(this.timer);this.active=false;this.stopMicrophone();this.clearPlayback();this.socket?.close(1000,'User ended session');this.socket=null;this.playback?.close();this.playback=null;this.emit('status',{state:'ended',message:'Phiên nói đã kết thúc'});return this.transcript;}
}
