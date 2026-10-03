import { CURRICULUM_VERSION } from '../config.js?v=5';

export function extendCurriculum(base, roadmap) {
  const tracks={...base.tracks};
  for(const track of ['ielts','communication']){
    const generated=(roadmap.tracks[track]||[]).flatMap(spec=>buildWeekSessions(track,spec));
    tracks[track]=[...(base.tracks[track]||[]),...generated];
  }
  return {...base,version:roadmap.version||base.version,tracks};
}

function buildWeekSessions(track,spec){
  const start=(spec.week-1)*5;
  const make=(day,title,skill,activities,reason)=>({id:`${track==='ielts'?'ielts':'comm'}-${String(start+day).padStart(2,'0')}`,week:spec.week,day,title,skill,minutes:track==='ielts'?35:25,level:spec.week<5?'A2-B1':'B1-B2',phase:spec.phase,reason:reason||`${spec.phase}: ${spec.focus}.`,activities});
  if(track==='ielts')return[
    make(1,`Vocabulary: ${spec.focus}`,'vocabulary',[{id:`i${start+1}-a`,type:'flashcards',title:'Academic language',cards:spec.vocab}]),
    make(2,`Grammar: ${spec.focus}`,'grammar',[{id:`i${start+2}-a`,type:'mcq',skill:'grammar',...spec.grammar}]),
    make(3,`Reading: ${spec.focus}`,'reading',[{id:`i${start+3}-a`,type:'mcq',skill:'reading',...spec.reading}]),
    make(4,spec.writing.title,'writing',[{id:`i${start+4}-a`,type:'writing',skill:'writing',...spec.writing}]),
    make(5,`Checkpoint tuần ${spec.week}`,'mixed',[{id:`i${start+5}-a`,type:'mcq',skill:'mixed',...spec.checkpoint},{id:`i${start+5}-b`,type:'short',skill:'writing',prompt:`Tóm tắt điều bạn đã cải thiện về ${spec.focus} trong tuần này.`,sample:'I improved by reviewing my errors and applying the strategy in a timed task.'}])
  ];
  return[
    make(1,`Useful phrases: ${spec.focus}`,'vocabulary',[{id:`c${start+1}-a`,type:'flashcards',title:'Useful chunks',cards:spec.vocab}]),
    make(2,`Grammar in conversation`,'grammar',[{id:`c${start+2}-a`,type:'mcq',skill:'grammar',...spec.grammar}]),
    make(3,`Listening: ${spec.focus}`,'listening',[{id:`c${start+3}-a`,type:'listening',skill:'listening',...spec.listening}]),
    make(4,spec.speaking.title,'speaking',[{id:`c${start+4}-a`,type:'short',skill:'speaking',...spec.speaking}]),
    make(5,`Role-play & checkpoint tuần ${spec.week}`,'mixed',[{id:`c${start+5}-a`,type:'mcq',skill:'speaking',...spec.checkpoint},{id:`c${start+5}-b`,type:'short',skill:'speaking',prompt:`Tạo một câu trả lời thực tế dùng ít nhất hai mẫu câu của chủ đề ${spec.focus}.`,sample:spec.speaking.sample}])
  ];
}

export function scoreDiagnostic(questions, formData) {
  const bySkill = {};
  let correct = 0;
  questions.forEach(q => {
    const selected = Number(formData.get(`diagnostic-${q.id}`));
    const ok = selected === q.answer;
    correct += ok ? 1 : 0;
    const skill = bySkill[q.skill] || { correct: 0, total: 0 };
    skill.total += 1; skill.correct += ok ? 1 : 0; bySkill[q.skill] = skill;
  });
  const percentage = Math.round((correct / questions.length) * 100);
  const inferredLevel = percentage >= 80 ? 'B2' : percentage >= 58 ? 'B1' : percentage >= 35 ? 'A2' : 'A1';
  return { correct, total: questions.length, percentage, inferredLevel, bySkill };
}

export function createPlan({ formData, diagnostic, curriculum, professions=[] }) {
  const track = formData.get('track');
  const weakSkills = formData.getAll('weakSkills');
  const industryId=formData.get('industry')||'general';
  const industry=professions.find(item=>item.id===industryId);
  const customIndustry=String(formData.get('customIndustry')||'').trim();
  const professionalProfile={
    industryId,
    industryLabel:industryId==='other'?(customIndustry||'Ngành khác'):(industry?.label||'Tiếng Anh công việc'),
    vocabularyPackId:industry?.packId||industryId,
    role:String(formData.get('jobRole')||'').trim()
  };
  const totalWeeks=goalWeeks(track,formData.get('examDate'),curriculum.tracks[track]);
  const daysPerWeek=Number(formData.get('daysPerWeek')),selected=selectWeeklySessions(curriculum.tracks[track].filter(session=>session.week<=totalWeeks),track,weakSkills,daysPerWeek);
  const professionSessionIds=new Set([...new Set(selected.map(session=>session.week))].map(week=>{
    const weekSessions=selected.filter(session=>session.week===week);
    return (weekSessions.find(session=>session.skill==='vocabulary')||weekSessions[0]).id;
  }));
  const sessions = selected.map((session, index) => {
    const { activities: _curriculumActivities, ...assignment } = session;
    return {
      ...assignment,
      order: index + 1,
      status: index === 0 ? 'current' : 'upcoming',
      reasonCodes: [...buildReasonCodes(session, weakSkills, diagnostic),...(professionSessionIds.has(session.id)?['PROFESSIONAL_VOCABULARY']:[])],
      professionalFocus:professionSessionIds.has(session.id),
      scheduledOffset: (session.week-1)*7+selected.filter(s=>s.week===session.week&&s.day<session.day).length
    };
  });
  const now = new Date();
  sessions.forEach(session => {
    const date = new Date(now); date.setDate(now.getDate() + session.scheduledOffset);
    session.scheduledDate = date.toISOString().slice(0, 10);
  });
  return {
    id: `plan-${Date.now()}`,
    track,
    goal: track === 'ielts' ? {
      currentBand: Number(formData.get('currentBand')),
      targetBand: Number(formData.get('targetBand')),
      examDate: formData.get('examDate') || null
    } : { context: formData.get('context') || 'daily' },
    schedule: { daysPerWeek, minutesPerDay: Number(formData.get('minutesPerDay')), coreSessionsPerWeek:Math.min(5,daysPerWeek), reviewDaysPerWeek:Math.max(0,daysPerWeek-5) },
    selfReportedLevel: formData.get('level'), weakSkills, diagnostic, professionalProfile,
    sessions, weekIndex: 1, totalWeeks, totalSessions:sessions.length, status: 'active', curriculumVersion: CURRICULUM_VERSION,
    adaptations: [], createdAt: now.toISOString(), updatedAt: now.toISOString()
  };
}

export function personalizeSession(session,plan,professions=[]){
  if(!session?.professionalFocus||!session.activities?.length||!plan?.professionalProfile)return session;
  const profile=plan.professionalProfile,packId=profile.vocabularyPackId||profile.industryId;
  const industry=professions.find(item=>item.id===packId)||professions.find(item=>item.id==='general');
  if(!industry?.terms?.length)return session;
  const count=3,start=((Math.max(1,session.week)-1)*count)%industry.terms.length;
  const terms=Array.from({length:count},(_,index)=>industry.terms[(start+index)%industry.terms.length]);
  const roleContext=profile.role?` cho vai trò ${profile.role}`:'';
  const activity={
    id:`${session.id}-profession`,type:'flashcards',skill:'vocabulary',
    title:`Từ vựng ${profile.industryLabel}`,
    cards:terms.map(term=>[term.en,`${term.vi} · ${term.example}`])
  };
  return {...session,reason:`${session.reason} Có thêm từ vựng ${profile.industryLabel}${roleContext}.`,activities:[activity,...session.activities]};
}

function goalWeeks(track,examDate,sessions){const max=Math.max(...sessions.map(s=>s.week));if(track!=='ielts'||!examDate)return max;const remaining=Math.ceil((new Date(examDate)-new Date())/604800000);return Math.max(4,Math.min(max,Number.isFinite(remaining)?remaining:max));}
function selectWeeklySessions(sessions,track,weakSkills,daysPerWeek){const count=Math.min(5,Math.max(3,daysPerWeek)),core=track==='ielts'?['writing','reading','mixed']:['speaking','listening','mixed'];return [...new Set(sessions.map(s=>s.week))].flatMap(week=>sessions.filter(s=>s.week===week).sort((a,b)=>(weakSkills.includes(b.skill)?3:0)+(core.includes(b.skill)?2:0)-(weakSkills.includes(a.skill)?3:0)-(core.includes(a.skill)?2:0)||a.day-b.day).slice(0,count).sort((a,b)=>a.day-b.day));}

export function upgradePlan(plan,curriculum){
  const source=curriculum.tracks[plan.track]||[],totalWeeks=plan.totalWeeks||goalWeeks(plan.track,plan.goal?.examDate,source),eligible=selectWeeklySessions(source.filter(s=>s.week<=totalWeeks),plan.track,plan.weakSkills||[],plan.schedule?.daysPerWeek||5),existing=new Set(plan.sessions.map(s=>s.id));let changed=false;
  const professionIds=new Set([...new Set(eligible.map(session=>session.week))].map(week=>{const weekSessions=eligible.filter(session=>session.week===week);return (weekSessions.find(session=>session.skill==='vocabulary')||weekSessions[0]).id;}));
  eligible.filter(s=>!existing.has(s.id)).forEach(session=>{const{activities:_activities,...assignment}=session,weekPosition=eligible.filter(s=>s.week===session.week&&s.day<session.day).length,offset=(session.week-1)*7+weekPosition,professionalFocus=professionIds.has(session.id);plan.sessions.push({...assignment,order:plan.sessions.length+1,status:'upcoming',professionalFocus,reasonCodes:[...buildReasonCodes(session,plan.weakSkills||[],plan.diagnostic||{bySkill:{}}),...(professionalFocus&&plan.professionalProfile?['PROFESSIONAL_VOCABULARY']:[])],scheduledOffset:offset,scheduledDate:addDays(plan.createdAt,offset)});changed=true});
  plan.totalWeeks=totalWeeks;plan.totalSessions=plan.sessions.length;if(changed){plan.curriculumVersion=CURRICULUM_VERSION;plan.updatedAt=new Date().toISOString()}return changed;
}
function addDays(start,offset){const date=new Date(start||Date.now());date.setDate(date.getDate()+offset);return date.toISOString().slice(0,10)}

function buildReasonCodes(session, weakSkills, diagnostic) {
  const codes = ['CURRICULUM_CORE'];
  if (weakSkills.includes(session.skill)) codes.push('SELF_REPORTED_WEAK');
  const measured = diagnostic.bySkill[session.skill];
  if (measured && measured.correct / measured.total < .6) codes.push('DIAGNOSTIC_GAP');
  return codes;
}

export function adaptNextWeek(plan, attempts, completedWeek=plan.weekIndex||1) {
  const targetWeek=Math.min(completedWeek+1,plan.totalWeeks||Math.max(...plan.sessions.map(s=>s.week)));
  const weekOneIds = new Set(plan.sessions.filter(s => s.week === completedWeek).map(s => s.id));
  const relevant = attempts.filter(a => weekOneIds.has(a.sessionId) && !a.sessionComplete);
  const skillMap = {};
  relevant.forEach(a => {
    const item = skillMap[a.skill] || { points: 0, count: 0 };
    item.points += Number(a.score || 0); item.count += 1; skillMap[a.skill] = item;
  });
  const mastery = Object.fromEntries(Object.entries(skillMap).map(([skill, data]) => [skill, Math.round((data.points / data.count) * 100)]));
  const completed = new Set(attempts.filter(a => a.sessionComplete).map(a => a.sessionId));
  const missed = plan.sessions.filter(s => s.week === completedWeek && !completed.has(s.id)).map(s => s.id);
  const weak = Object.entries(mastery).filter(([, score]) => score < 65).map(([skill]) => skill);
  const reasonCodes = [...(missed.length ? ['MISSED_SESSIONS'] : []), ...(weak.length ? ['LOW_MASTERY'] : []), 'WEEKLY_REBALANCE'];
  plan.sessions.filter(s => s.week === targetWeek).forEach(session => { if (weak.includes(session.skill)) session.reasonCodes = [...new Set([...session.reasonCodes, 'LOW_MASTERY'])]; });
  const adaptation = { week: targetWeek, fromWeek:completedWeek, mastery, missedSessionIds: missed, prioritySkills: weak, reasonCodes, createdAt: new Date().toISOString() };
  plan.adaptations.push(adaptation); plan.weekIndex = targetWeek; plan.updatedAt = adaptation.createdAt;
  return adaptation;
}

export function masteryBySkill(attempts) {
  const buckets = {};
  attempts.filter(a => a.skill && a.skill !== 'session').forEach(a => {
    const b = buckets[a.skill] || { total: 0, count: 0 };
    b.total += Number(a.score || 0); b.count += 1; buckets[a.skill] = b;
  });
  return Object.fromEntries(Object.entries(buckets).map(([key, b]) => [key, Math.round(100 * b.total / b.count)]));
}

export function calculateStreak(studyDays) {
  const dates = new Set(Object.keys(studyDays).filter(date => studyDays[date].totalMinutes > 0));
  let streak = 0; const cursor = new Date();
  if (!dates.has(cursor.toISOString().slice(0,10))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(cursor.toISOString().slice(0,10))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}
