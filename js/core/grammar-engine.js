export function selectGrammarPath(grammarMap,{selfReportedLevel='A1',diagnostic={},totalWeeks=12}={}){
  const topics=[...(grammarMap?.topics||[])].sort((a,b)=>a.order-b.order);
  if(!topics.length)return[];
  // The diagnostic changes depth and review priority, but never removes a
  // grammar topic. Two ordered topics are assigned to every curriculum week.
  return topics.slice(0,Math.min(topics.length,Math.max(1,totalWeeks)*2));
}

export function assignGrammarPath(plan,grammarMap){
  if(!plan||!grammarMap?.topics?.length)return false;
  const path=selectGrammarPath(grammarMap,{selfReportedLevel:plan.selfReportedLevel,diagnostic:plan.diagnostic,totalWeeks:plan.totalWeeks||12});
  let changed=JSON.stringify(plan.grammarPath||[])!==JSON.stringify(path.map(topic=>topic.id));
  plan.grammarPath=path.map(topic=>topic.id);plan.grammarVersion=grammarMap.version;
  const grammarSessions=(plan.sessions||[]).filter(session=>session.skill==='grammar'||session.containsGrammar).sort((a,b)=>a.week-b.week||a.order-b.order);
  grammarSessions.forEach((session,index)=>{const offset=Math.max(0,(session.week-1)*2),assigned=path.slice(offset,offset+2);if(!assigned.length)return;const ids=assigned.map(topic=>topic.id);if(JSON.stringify(session.grammarTopicIds||[])!==JSON.stringify(ids)||session.grammarTopicId!==ids[0]){session.grammarTopicIds=ids;session.grammarTopicId=ids[0];session.reasonCodes=[...new Set([...(session.reasonCodes||[]),'GRAMMAR_SPINE'])];changed=true;}});
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

export function hydrateGrammarSession(session,plan,grammarMap,generatedLessons=null){
  const topicIds=session?.grammarTopicIds?.length?session.grammarTopicIds:[session?.grammarTopicId].filter(Boolean);if(!topicIds.length)return session;
  const topics=topicIds.map(id=>grammarTopicById(grammarMap,id)).filter(Boolean);if(!topics.length)return session;
  const profile=plan?.professionalProfile||{};
  const lessonByTopic=generatedLessons?.topicId?{[generatedLessons.topicId]:generatedLessons}:(generatedLessons||{});
  const activities=topics.flatMap((topic,topicIndex)=>{
    const fallback=staticGrammarLesson(topic,{track:plan?.track,industryLabel:profile.industryLabel,role:profile.role}),lesson=lessonByTopic[topic.id]||fallback,exercises=lesson.exercises||fallback.exercises,label=`Topic ${topicIndex+1}/2`;
    return[
      {id:`${topic.id}-concept`,type:'grammar-concept',skill:'grammar',grammarTopicId:topic.id,title:`${label} · ${topic.title}`,topic,lesson},
      {id:`${topic.id}-recognition`,type:'mcq',skill:'grammar',grammarTopicId:topic.id,title:`${label} · Nhận biết`,...(exercises.mcq||fallback.exercises.mcq)},
      {id:`${topic.id}-controlled`,type:'fill',skill:'grammar',grammarTopicId:topic.id,title:`${label} · Luyện có kiểm soát`,...(exercises.fill||fallback.exercises.fill)},
      {id:`${topic.id}-production`,type:'short',skill:'grammar',grammarTopicId:topic.id,title:`${label} · Vận dụng`,...(exercises.production||fallback.exercises.production)}
    ];
  });
  return{...session,title:`Grammar · ${topics.map(topic=>topic.title).join(' + ')}`,skill:'grammar',level:`${topics[0].level}${topics.at(-1).level!==topics[0].level?`–${topics.at(-1).level}`:''}`,minutes:Math.max(35,Number(session.minutes)||0),reason:`Grammar Spine tuần ${session.week}: ${topics.map(topic=>topic.title).join(' → ')}`,grammarTopicId:topics[0].id,grammarTopicIds:topics.map(topic=>topic.id),activities};
}

export function grammarMastery(attempts,topicId){
  const relevant=(attempts||[]).filter(item=>item.grammarTopicId===topicId&&!item.sessionComplete&&item.type!=='grammar-concept'&&item.scored!==false);
  if(!relevant.length)return{score:0,status:'not_started',attempts:0};
  const latest=new Map();relevant.forEach(item=>latest.set(item.activityId,item));
  const values=[...latest.values()].map(item=>Number(item.score)).filter(Number.isFinite);
  const score=Math.round(100*values.reduce((sum,value)=>sum+value,0)/Math.max(1,values.length));
  return{score,status:score>=80?'mastered':score>=60?'review':'relearn',attempts:relevant.length};
}

export function grammarPathProgress(plan,grammarMap,attempts){
  return(plan?.grammarPath||[]).map(id=>{const topic=grammarTopicById(grammarMap,id);return topic?{...topic,mastery:grammarMastery(attempts,id)}:null}).filter(Boolean);
}
