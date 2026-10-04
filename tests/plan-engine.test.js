import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scoreDiagnostic, createPlan, adaptNextWeek, calculateStreak, extendCurriculum, upgradePlan, personalizeSession } from '../js/core/plan-engine.js';
import { serializePlanForFirestore, deserializePlanFromFirestore } from '../js/services/firebase.js';
import { hydrateGrammarSession, grammarMastery, selectGrammarPath } from '../js/core/grammar-engine.js';

const baseCurriculum=JSON.parse(fs.readFileSync(new URL('../data/curriculum.json',import.meta.url)));
const roadmap=JSON.parse(fs.readFileSync(new URL('../data/roadmap.json',import.meta.url)));
const professions=JSON.parse(fs.readFileSync(new URL('../data/professions.json',import.meta.url))).industries;
const curriculum=extendCurriculum(baseCurriculum,roadmap);
const questions=JSON.parse(fs.readFileSync(new URL('../data/diagnostic.json',import.meta.url)));
const grammarMap=JSON.parse(fs.readFileSync(new URL('../data/grammar-map.json',import.meta.url)));
class FormDataFake { constructor(values){this.values=values} get(key){const value=this.values[key];return Array.isArray(value)?value[0]:value} getAll(key){const value=this.values[key];return value==null?[]:Array.isArray(value)?value:[value]} }

test('diagnostic maps high score to B2 and groups skills',()=>{
  const values=Object.fromEntries(questions.map(q=>[`diagnostic-${q.id}`,String(q.answer)]));
  const score=scoreDiagnostic(questions,new FormDataFake(values));
  assert.equal(score.percentage,100);assert.equal(score.inferredLevel,'B2');assert.ok(score.bySkill.grammar.total>0);
});

test('plan contains a twelve-week curriculum and personal reasons',()=>{
  const form=new FormDataFake({track:'ielts',level:'B1',weakSkills:['reading'],daysPerWeek:'5',minutesPerDay:'25',currentBand:'5',targetBand:'6.5',examDate:'2099-01-10'});
  const diagnostic={percentage:50,inferredLevel:'B1',bySkill:{reading:{correct:0,total:2}}};
  const plan=createPlan({formData:form,diagnostic,curriculum});
  assert.equal(plan.sessions.length,60);assert.equal(plan.totalWeeks,12);assert.equal(plan.track,'ielts');assert.equal(plan.sessions[2].reasonCodes.includes('DIAGNOSTIC_GAP'),true);assert.equal(plan.status,'active');assert.equal('activities' in plan.sessions[0],false);
});

test('both tracks contain unique sessions across twelve weeks',()=>{
  for(const track of ['ielts','communication']){const sessions=curriculum.tracks[track];assert.equal(sessions.length,60);assert.equal(new Set(sessions.map(s=>s.id)).size,60);assert.equal(Math.max(...sessions.map(s=>s.week)),12);}
});

test('weekly load follows the learner schedule',()=>{
  const form=new FormDataFake({track:'communication',level:'A2',weakSkills:['speaking'],daysPerWeek:'3',minutesPerDay:'25',context:'daily'}),plan=createPlan({formData:form,diagnostic:{percentage:45,inferredLevel:'A2',bySkill:{}},curriculum});
  assert.equal(plan.sessions.length,36);assert.equal(plan.schedule.coreSessionsPerWeek,3);assert.equal(plan.sessions.filter(s=>s.week===6).length,3);
});

test('profession profile adds relevant vocabulary to one selected session per week',()=>{
  const form=new FormDataFake({track:'communication',level:'A2',weakSkills:['speaking'],industry:'embedded_automotive',jobRole:'AUTOSAR developer',daysPerWeek:'3',minutesPerDay:'25',context:'work'});
  const plan=createPlan({formData:form,diagnostic:{percentage:45,inferredLevel:'A2',bySkill:{}},curriculum,professions});
  assert.equal(plan.professionalProfile.industryLabel,'Embedded / Automotive');
  assert.equal(plan.sessions.filter(session=>session.professionalFocus).length,12);
  const assignment=plan.sessions.find(session=>session.week===1&&session.professionalFocus);
  const source=curriculum.tracks.communication.find(session=>session.id===assignment.id);
  const personalized=personalizeSession({...source,...assignment},plan,professions);
  assert.equal(personalized.activities[0].title,'Từ vựng Embedded / Automotive');
  assert.match(personalized.activities[0].cards[0][0],/electronic control unit/i);
  assert.ok(assignment.reasonCodes.includes('PROFESSIONAL_VOCABULARY'));
});

test('legacy two-week plan upgrades without replacing completed session ids',()=>{
  const form=new FormDataFake({track:'communication',level:'A2',weakSkills:['speaking'],daysPerWeek:'5',minutesPerDay:'25',context:'work'}),plan=createPlan({formData:form,diagnostic:{percentage:45,inferredLevel:'A2',bySkill:{}},curriculum});
  plan.sessions=plan.sessions.slice(0,10);delete plan.totalWeeks;delete plan.totalSessions;const firstId=plan.sessions[0].id;
  assert.equal(upgradePlan(plan,curriculum),true);assert.equal(plan.sessions.length,60);assert.equal(plan.sessions[0].id,firstId);assert.equal(plan.totalWeeks,12);
});

test('Firestore plan codec avoids nested arrays and restores ordered collections',()=>{
  const form=new FormDataFake({track:'ielts',level:'B1',weakSkills:['reading'],daysPerWeek:'5',minutesPerDay:'25',currentBand:'5',targetBand:'6.5',examDate:'2099-01-10'});
  const plan=createPlan({formData:form,diagnostic:{percentage:50,inferredLevel:'B1',bySkill:{}},curriculum});
  plan.adaptations.push({week:2,prioritySkills:['reading'],missedSessionIds:['ielts-01'],reasonCodes:['LOW_MASTERY'],mastery:{reading:40},createdAt:new Date().toISOString()});
  const encoded=serializePlanForFirestore(plan);
  assert.equal(Array.isArray(encoded.sessions),false);assert.equal(Array.isArray(encoded.adaptations),false);
  const nested=[];const walk=(value,parentArray=false,path='root')=>{if(Array.isArray(value)){if(parentArray)nested.push(path);value.forEach((item,index)=>walk(item,true,`${path}[${index}]`));}else if(value&&typeof value==='object'){Object.entries(value).forEach(([key,item])=>walk(item,false,`${path}.${key}`));}};walk(encoded);
  assert.deepEqual(nested,[]);const decoded=deserializePlanFromFirestore(encoded);assert.equal(decoded.sessions.length,60);assert.equal(decoded.adaptations.length,1);
});

test('weekly adaptation prioritizes weak skills and records reason codes',()=>{
  const form=new FormDataFake({track:'communication',level:'A2',weakSkills:[],daysPerWeek:'5',minutesPerDay:'20',context:'work'});
  const plan=createPlan({formData:form,diagnostic:{percentage:50,inferredLevel:'A2',bySkill:{}},curriculum});
  const attempts=[{sessionId:'comm-01',skill:'speaking',score:.3},{sessionId:'comm-01',sessionComplete:true},{sessionId:'comm-02',sessionComplete:true},{sessionId:'comm-03',sessionComplete:true},{sessionId:'comm-04',sessionComplete:true}];
  const result=adaptNextWeek(plan,attempts);
  assert.ok(result.prioritySkills.includes('speaking'));assert.ok(result.reasonCodes.includes('MISSED_SESSIONS'));assert.equal(plan.weekIndex,2);
});

test('streak accepts today and consecutive previous days',()=>{
  const map={};for(let i=0;i<3;i++){const d=new Date();d.setDate(d.getDate()-i);map[d.toISOString().slice(0,10)]={totalMinutes:10}}
  assert.equal(calculateStreak(map),3);
});

test('grammar diagnostic records exact knowledge gaps',()=>{
  const values=Object.fromEntries(questions.map(q=>[`diagnostic-${q.id}`,String(q.answer)]));
  values['diagnostic-d1']='0';
  const score=scoreDiagnostic(questions,new FormDataFake(values));
  assert.ok(score.grammarProfile.failedTopicIds.includes('present-simple'));
  assert.ok(score.grammarProfile.masteredTopicIds.includes('future-perfect'));
});

test('three-day plans keep one sequenced grammar lesson every week',()=>{
  const form=new FormDataFake({track:'communication',level:'A2',weakSkills:['speaking'],industry:'general',daysPerWeek:'3',minutesPerDay:'25',context:'work'});
  const plan=createPlan({formData:form,diagnostic:{percentage:48,inferredLevel:'A2',bySkill:{grammar:{correct:2,total:5}},grammarProfile:{failedTopicIds:['present-simple']}},curriculum,professions,grammarMap});
  assert.equal(plan.grammarPath.length,12);
  assert.equal(plan.sessions.filter(session=>session.grammarTopicId).length,12);
  assert.equal(plan.grammarPath[0],'present-simple');
});

test('offline grammar lesson has form meaning use and four learning steps',()=>{
  const path=selectGrammarPath(grammarMap,{selfReportedLevel:'B1',diagnostic:{inferredLevel:'B1',bySkill:{grammar:{correct:3,total:4}}},totalWeeks:12});
  const topic=path[0],session=hydrateGrammarSession({id:'grammar-test',skill:'grammar',grammarTopicId:topic.id},{track:'ielts',professionalProfile:{industryLabel:'Kế toán'}},grammarMap);
  assert.equal(session.activities.length,4);
  assert.equal(session.activities[0].type,'grammar-concept');
  assert.equal(session.activities[1].type,'mcq');
  assert.ok(session.activities[0].lesson.form);
});

test('grammar mastery is tracked per topic instead of only per skill',()=>{
  const attempts=[{grammarTopicId:'passive-voice',activityId:'a',type:'mcq',score:1},{grammarTopicId:'passive-voice',activityId:'b',type:'fill',score:.5},{grammarTopicId:'second-conditional',activityId:'c',type:'mcq',score:1}];
  const result=grammarMastery(attempts,'passive-voice');
  assert.equal(result.score,75);assert.equal(result.status,'review');assert.equal(result.attempts,2);
});
