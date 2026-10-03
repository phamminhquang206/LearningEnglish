import { CURRICULUM_VERSION } from '../config.js?v=2';

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

export function createPlan({ formData, diagnostic, curriculum }) {
  const track = formData.get('track');
  const weakSkills = formData.getAll('weakSkills');
  const sessions = curriculum.tracks[track].map((session, index) => {
    const { activities: _curriculumActivities, ...assignment } = session;
    return {
      ...assignment,
      order: index + 1,
      status: index === 0 ? 'current' : 'upcoming',
      reasonCodes: buildReasonCodes(session, weakSkills, diagnostic),
      scheduledOffset: Math.floor(index / Math.max(1, Number(formData.get('daysPerWeek')))) * 7 + (index % Number(formData.get('daysPerWeek')))
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
    schedule: { daysPerWeek: Number(formData.get('daysPerWeek')), minutesPerDay: Number(formData.get('minutesPerDay')) },
    selfReportedLevel: formData.get('level'), weakSkills, diagnostic,
    sessions, weekIndex: 1, status: 'active', curriculumVersion: CURRICULUM_VERSION,
    adaptations: [], createdAt: now.toISOString(), updatedAt: now.toISOString()
  };
}

function buildReasonCodes(session, weakSkills, diagnostic) {
  const codes = ['CURRICULUM_CORE'];
  if (weakSkills.includes(session.skill)) codes.push('SELF_REPORTED_WEAK');
  const measured = diagnostic.bySkill[session.skill];
  if (measured && measured.correct / measured.total < .6) codes.push('DIAGNOSTIC_GAP');
  return codes;
}

export function adaptNextWeek(plan, attempts) {
  const weekOneIds = new Set(plan.sessions.filter(s => s.week === 1).map(s => s.id));
  const relevant = attempts.filter(a => weekOneIds.has(a.sessionId) && !a.sessionComplete);
  const skillMap = {};
  relevant.forEach(a => {
    const item = skillMap[a.skill] || { points: 0, count: 0 };
    item.points += Number(a.score || 0); item.count += 1; skillMap[a.skill] = item;
  });
  const mastery = Object.fromEntries(Object.entries(skillMap).map(([skill, data]) => [skill, Math.round((data.points / data.count) * 100)]));
  const completed = new Set(attempts.filter(a => a.sessionComplete).map(a => a.sessionId));
  const missed = plan.sessions.filter(s => s.week === 1 && !completed.has(s.id)).map(s => s.id);
  const weak = Object.entries(mastery).filter(([, score]) => score < 65).map(([skill]) => skill);
  const reasonCodes = [...(missed.length ? ['MISSED_SESSIONS'] : []), ...(weak.length ? ['LOW_MASTERY'] : []), 'WEEKLY_REBALANCE'];
  plan.sessions.filter(s => s.week === 2).sort((a, b) => (weak.includes(b.skill) ? 1 : 0) - (weak.includes(a.skill) ? 1 : 0)).forEach((session, index) => { session.order = 6 + index; if (weak.includes(session.skill)) session.reasonCodes = [...new Set([...session.reasonCodes, 'LOW_MASTERY'])]; });
  const adaptation = { week: 2, mastery, missedSessionIds: missed, prioritySkills: weak, reasonCodes, createdAt: new Date().toISOString() };
  plan.adaptations.push(adaptation); plan.weekIndex = 2; plan.updatedAt = adaptation.createdAt;
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
