class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(){super();this.buffer=[];this.target=2048;}
  process(inputs){const input=inputs[0]?.[0];if(!input)return true;this.buffer.push(...input);if(this.buffer.length>=this.target){this.port.postMessage(Float32Array.from(this.buffer.splice(0,this.target)));}return true;}
}
registerProcessor('pcm-capture',PcmCaptureProcessor);
