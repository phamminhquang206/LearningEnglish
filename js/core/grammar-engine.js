const LEVEL_RANK={A1:0,A2:1,B1:2,B2:3};

export function selectGrammarPath(grammarMap,{selfReportedLevel='A1',diagnostic={},totalWeeks=12}={}){
  const topics=[...(grammarMap?.topics||[])].sort((a,b)=>a.order-b.order);
  if(!topics.length)return[];
  const reported=LEVEL_RANK[selfReportedLevel]??0,inferred=LEVEL_RANK[diagnostic.inferredLevel]??reported;
  const grammarScore=diagnostic.bySkill?.grammar;
  let startRank=Math.min(reported,inferred);
  if(grammarScore&&grammarScore.total&&grammarScore.correct/grammarScore.total<.6)startRank=Math.max(0,startRank-1);
  if(startRank===LEVEL_RANK.B2)startRank=LEVEL_RANK.B1;
  const failedIds=diagnostic.grammarProfile?.failedTopicIds||[];
  const priority=failedIds.map(id=>topics.find(topic=>topic.id===id)).filter(Boolean);
  const sequence=topics.filter(topic=>(LEVEL_RANK[topic.level]??0)>=startRank);
  const unique=[...priority,...sequence].filter((topic,index,list)=>list.findIndex(item=>item.id===topic.id)===index);
  return Array.from({length:Math.min(totalWeeks,unique.length)},(_,index)=>unique[index]);
}

export function assignGrammarPath(plan,grammarMap){
  if(!plan||!grammarMap?.topics?.length)return false;
  const path=selectGrammarPath(grammarMap,{selfReportedLevel:plan.selfReportedLevel,diagnostic:plan.diagnostic,totalWeeks:plan.totalWeeks||12});
  let changed=JSON.stringify(plan.grammarPath||[])!==JSON.stringify(path.map(topic=>topic.id));
  plan.grammarPath=path.map(topic=>topic.id);plan.grammarVersion=grammarMap.version;
  const grammarSessions=(plan.sessions||[]).filter(session=>session.skill==='grammar'||session.containsGrammar).sort((a,b)=>a.week-b.week||a.order-b.order);
  grammarSessions.forEach(session=>{const topic=path[Math.max(0,session.week-1)]||path[grammarSessions.indexOf(session)];if(topic&&session.grammarTopicId!==topic.id){session.grammarTopicId=topic.id;session.reasonCodes=[...new Set([...(session.reasonCodes||[]),'GRAMMAR_SPINE'])];changed=true;}});
  return changed;
}

export function grammarTopicById(grammarMap,id){return grammarMap?.topics?.find(topic=>topic.id===id)||null;}

export function staticGrammarLesson(topic,{track='communication',industryLabel='công việc',role=''}={}){
  const contextual=topic.examples?.[track]||topic.examples?.communication||topic.examples?.general||'';
  return{
    topicId:topic.id,source:'static',summary:topic.explanation,form:topic.form,uses:[...(topic.uses||[])],
    examples:[{sentence:topic.examples?.general||'',meaning:'Ví dụ nền tảng'},{sentence:contextual,meaning:track==='ielts'?'Ứng dụng IELTS':`Ứng dụng ${industryLabel}${role?` · ${role}`:''}`}].filter(item=>item.sentence),
    commonErrors:[...(topic.commonErrors||[])],exercises:{...topic.practice}
  };
}

export function hydrateGrammarSession(session,plan,grammarMap,generatedLesson=null){
  if(!session?.grammarTopicId)return session;
  const topic=grammarTopicById(grammarMap,session.grammarTopicId);if(!topic)return session;
  const profile=plan?.professionalProfile||{};
  const fallback=staticGrammarLesson(topic,{track:plan?.track,industryLabel:profile.industryLabel,role:profile.role});
  const lesson=generatedLesson||fallback,exercises=lesson.exercises||fallback.exercises;
  return{...session,title:`Grammar · ${topic.title}`,skill:'grammar',level:topic.level,reason:`Grammar Spine ${topic.level}: ${topic.explanation}`,grammarTopicId:topic.id,activities:[
    {id:`${topic.id}-concept`,type:'grammar-concept',skill:'grammar',title:topic.title,topic,lesson},
    {id:`${topic.id}-recognition`,type:'mcq',skill:'grammar',title:'Nhận biết',...(exercises.mcq||fallback.exercises.mcq)},
    {id:`${topic.id}-controlled`,type:'fill',skill:'grammar',title:'Luyện có kiểm soát',...(exercises.fill||fallback.exercises.fill)},
    {id:`${topic.id}-production`,type:'short',skill:'grammar',title:'Vận dụng',...(exercises.production||fallback.exercises.production)}
  ]};
}

export function grammarMastery(attempts,topicId){
  const relevant=(attempts||[]).filter(item=>item.grammarTopicId===topicId&&!item.sessionComplete&&item.type!=='grammar-concept');
  if(!relevant.length)return{score:0,status:'not_started',attempts:0};
  const latest=new Map();relevant.forEach(item=>latest.set(item.activityId,item));
  const values=[...latest.values()].map(item=>Number(item.score)).filter(Number.isFinite);
  const score=Math.round(100*values.reduce((sum,value)=>sum+value,0)/Math.max(1,values.length));
  return{score,status:score>=80?'mastered':score>=60?'review':'relearn',attempts:relevant.length};
}

export function grammarPathProgress(plan,grammarMap,attempts){
  return(plan?.grammarPath||[]).map(id=>{const topic=grammarTopicById(grammarMap,id);return topic?{...topic,mastery:grammarMastery(attempts,id)}:null}).filter(Boolean);
}
