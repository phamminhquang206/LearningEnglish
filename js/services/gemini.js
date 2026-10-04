import { GEMINI_API_BASE } from '../config.js?v=2';

const KEY_NAME = 'ela_gemini_key';
const MODEL_NAME = 'ela_gemini_model';

class GeminiService {
  constructor() { this.memoryKey = sessionStorage.getItem(KEY_NAME) || ''; }
  get key() { return this.memoryKey || localStorage.getItem(KEY_NAME) || ''; }
  get model() { return localStorage.getItem(MODEL_NAME) || sessionStorage.getItem(MODEL_NAME) || ''; }
  configure(key, remember, model = '') {
    this.clear(); this.memoryKey = key.trim(); sessionStorage.setItem(KEY_NAME, this.memoryKey);
    if (remember) localStorage.setItem(KEY_NAME, this.memoryKey);
    if (model) { sessionStorage.setItem(MODEL_NAME, model); if (remember) localStorage.setItem(MODEL_NAME, model); }
  }
  clear() { this.memoryKey = ''; sessionStorage.removeItem(KEY_NAME); sessionStorage.removeItem(MODEL_NAME); localStorage.removeItem(KEY_NAME); localStorage.removeItem(MODEL_NAME); }

  async listModels(key = this.key) {
    if (!key) throw new Error('Hãy nhập Gemini API key trước.');
    const response = await fetch(`${GEMINI_API_BASE}/models?pageSize=200&key=${encodeURIComponent(key)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(this.mapError(response.status, data.error?.message));
    return (data.models || []).filter(model => (model.supportedGenerationMethods || []).includes('generateContent')).map(model => ({ id: model.name.replace('models/',''), name: model.displayName || model.name, methods: model.supportedGenerationMethods || [] }));
  }

  async listLiveModels(key = this.key) {
    if (!key) throw new Error('Chưa có Gemini API key.');
    const response = await fetch(`${GEMINI_API_BASE}/models?pageSize=200&key=${encodeURIComponent(key)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(this.mapError(response.status, data.error?.message));
    return (data.models || [])
      .filter(model => (model.supportedGenerationMethods || []).includes('bidiGenerateContent'))
      .filter(model => !/(transcrib|translate)/i.test(`${model.name} ${model.displayName||''} ${model.description||''}`))
      .sort((a,b)=>liveConversationScore(b)-liveConversationScore(a));
  }

  async evaluate({ type, prompt, answer, transcript = '', pronunciationEvidence = '' }) {
    if (!this.key || !this.model) throw new Error('Tính năng này cần API key và model Gemini trong Cài đặt.');
    const instruction = type === 'speaking'
      ? `Đánh giá phiên hội thoại tiếng Anh của người Việt. Trả về JSON thuần theo schema: {"scores":{"fluency":0-9,"grammar":0-9,"vocabulary":0-9,"interaction":0-9,"pronunciation":0-9 hoặc null},"strengths":["..."],"improvements":["..."],"betterPhrases":["..."],"pronunciation":{"confidence":"high|medium|low|insufficient","summary":"...","observations":[{"issue":"...","evidence":"...","tip":"...","example":"..."}]}}. Chấm fluency, grammar, vocabulary và interaction từ transcript. Riêng pronunciation chỉ được chấm từ phần bằng chứng âm thanh do Live model cung cấp bên dưới; tuyệt đối không suy đoán cách phát âm từ chữ trong transcript. Nếu bằng chứng trống, mơ hồ hoặc nói insufficient thì đặt scores.pronunciation=null, confidence="insufficient", observations=[] và giải thích ngắn trong summary. Tối đa 3 pronunciation observations, ưu tiên trọng âm, âm cuối, nguyên âm/phụ âm và độ dễ hiểu. Transcript: ${transcript}\nBằng chứng phát âm từ Live model: ${pronunciationEvidence||'(không có)'}`
      : `Bạn là giám khảo IELTS thân thiện. Đánh giá câu trả lời theo prompt. Trả về JSON thuần: {"scores":{"task":0-9,"coherence":0-9,"vocabulary":0-9,"grammar":0-9},"summary":"...","strengths":["..."],"improvements":["..."],"rewrite":"..."}. Prompt: ${prompt}\nCâu trả lời: ${answer}`;
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await this.generateJson(instruction + (attempt ? '\nLần trước JSON không hợp lệ. Chỉ trả JSON đúng schema, không markdown.' : ''));
        return this.validateFeedback(type, result);
      } catch (error) { lastError = error; }
    }
    throw lastError;
  }

  async chat({ messages, learnerContext='' }) {
    if (!this.key || !this.model) throw new Error('Hãy cấu hình Gemini API key và model trong Cài đặt.');
    const contents=(messages||[]).slice(-16).filter(item=>item?.text).map(item=>({role:item.role==='model'?'model':'user',parts:[{text:String(item.text)}]}));
    if(!contents.length)throw new Error('Hãy nhập nội dung muốn trò chuyện.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
    try{
      const response=await fetch(`${GEMINI_API_BASE}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.key)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({
          systemInstruction:{parts:[{text:`You are a friendly English coach for a Vietnamese learner. Keep the conversation mainly in English, use clear natural language, and keep each reply under 120 words. Correct only the most useful mistake after answering, with a short Vietnamese explanation when helpful. Ask at most one follow-up question. Learner context: ${learnerContext||'general English learner'}.`}]},
          contents,generationConfig:{temperature:.65,maxOutputTokens:800}
        })
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(this.mapError(response.status,data.error?.message));
      const text=data.candidates?.[0]?.content?.parts?.map(part=>part.text||'').join('').trim();
      if(!text)throw new Error('Gemini không trả về nội dung.');
      return text;
    }catch(error){
      if(error.name==='AbortError')throw new Error('Gemini phản hồi quá lâu. Hãy thử lại.');
      throw error;
    }finally{clearTimeout(timer)}
  }

  async generateJson(text) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`${GEMINI_API_BASE}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.key)}`, {
        method:'POST', headers:{'Content-Type':'application/json'}, signal:controller.signal,
        body:JSON.stringify({ contents:[{ role:'user', parts:[{text}] }], generationConfig:{ temperature:.25, responseMimeType:'application/json', maxOutputTokens:1600 } })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(this.mapError(response.status, data.error?.message));
      const raw = data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') || '';
      if (!raw) throw new Error('Gemini không trả về nội dung.');
      return JSON.parse(raw.replace(/^```json\s*|```$/g,'').trim());
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Gemini phản hồi quá lâu. Hãy thử lại.');
      throw error;
    } finally { clearTimeout(timer); }
  }

  validateFeedback(type, value) {
    if (!value || typeof value !== 'object' || !value.scores || !Array.isArray(value.improvements)) throw new Error('Phản hồi AI không đúng định dạng.');
    const keys = type === 'speaking' ? ['fluency','grammar','vocabulary','interaction'] : ['task','coherence','vocabulary','grammar'];
    keys.forEach(key => { const score = Number(value.scores[key]); if (!Number.isFinite(score) || score < 0 || score > 9) throw new Error('Điểm AI không hợp lệ.'); value.scores[key] = score; });
    if(type==='speaking'){
      const raw=value.scores.pronunciation;
      if(raw===null||raw===undefined||raw==='')value.scores.pronunciation=null;
      else{const score=Number(raw);if(!Number.isFinite(score)||score<0||score>9)throw new Error('Điểm phát âm không hợp lệ.');value.scores.pronunciation=score;}
      const pronunciation=value.pronunciation&&typeof value.pronunciation==='object'?value.pronunciation:{};
      const confidence=['high','medium','low','insufficient'].includes(pronunciation.confidence)?pronunciation.confidence:(value.scores.pronunciation===null?'insufficient':'low');
      value.pronunciation={confidence,summary:String(pronunciation.summary||'Chưa có đủ dữ liệu âm thanh để nhận xét phát âm.'),observations:Array.isArray(pronunciation.observations)?pronunciation.observations.slice(0,3).map(item=>({issue:String(item?.issue||''),evidence:String(item?.evidence||''),tip:String(item?.tip||''),example:String(item?.example||'')})).filter(item=>item.issue||item.tip):[]};
      if(confidence==='insufficient')value.scores.pronunciation=null;
    }
    return value;
  }

  mapError(status, message='') {
    if (status === 400) return 'API key hoặc model không hợp lệ.';
    if (status === 403) return 'API key không có quyền truy cập model này.';
    if (status === 429) return 'Đã đạt hạn mức Gemini. Hãy chờ rồi thử lại.';
    return message || `Không thể kết nối Gemini (HTTP ${status}).`;
  }
}

function liveConversationScore(model){const text=`${model.name} ${model.displayName||''} ${model.description||''}`.toLowerCase();return (text.includes('native audio')?6:0)+(text.includes('native-audio')?6:0)+(text.includes('flash live')?4:0)+(text.includes('-live')?2:0)+(text.includes('audio generation')?2:0)}

export const geminiService = new GeminiService();
