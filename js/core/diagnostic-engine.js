export function selectDiagnosticForm(bank,track,seed=Date.now()){
  const forms=bank?.forms?.[track]||bank?.forms?.communication||[];
  if(!forms.length)return{id:'legacy',questions:Array.isArray(bank)?bank:[]};
  const index=(typeof seed==='number'&&Number.isFinite(seed)?Math.abs(Math.trunc(seed)):positiveHash(`${track}:${seed}`))%forms.length,form=forms[index],byId=new Map((bank.questions||[]).map(question=>[question.id,question]));
  const questions=form.questionIds.map(id=>byId.get(id)).filter(Boolean);
  if(questions.length!==form.questionIds.length)throw new Error(`Diagnostic form ${form.id} thiếu câu hỏi.`);
  return{id:form.id,questions};
}

function positiveHash(value){let hash=0;for(const char of String(value))hash=(hash*31+char.charCodeAt(0))|0;return Math.abs(hash);}
