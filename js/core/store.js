const STATE_VERSION = 1;

function blankState(uid) {
  return {
    version: STATE_VERSION,
    uid,
    profile: null,
    onboardingComplete: false,
    currentPlanId: null,
    plans: {},
    attempts: [],
    reviewItems: {},
    studyDays: {},
    speakingSessions: [],
    grammarLessons: {},
    settings: { theme: 'light', locale: 'vi', trustedDevice: false },
    updatedAt: new Date().toISOString()
  };
}

class AppStore {
  constructor() {
    this.state = blankState('anonymous');
    this.listeners = new Set();
    this.persistLocally = true;
  }

  key(uid = this.state.uid) { return `ela_state_${uid}`; }

  readLocal(uid) {
    const raw = localStorage.getItem(this.key(uid));
    if (!raw) return null;
    try { return { ...blankState(uid), ...JSON.parse(raw), uid }; } catch { return null; }
  }

  clearLocal(uid = this.state.uid) { localStorage.removeItem(this.key(uid)); }

  load(uid, profile = null, { persistLocally = true } = {}) {
    this.persistLocally = persistLocally;
    const raw = persistLocally ? localStorage.getItem(this.key(uid)) : null;
    let next = blankState(uid);
    if (raw) {
      try { next = { ...next, ...JSON.parse(raw), uid }; } catch { /* reset malformed local state */ }
    }
    next.profile = profile || next.profile;
    this.state = next;
    document.documentElement.dataset.theme = next.settings?.theme || 'light';
    this.persist(false);
    return this.state;
  }

  mergeRemote(remote) {
    if (!remote) return;
    const safeRemote = Object.fromEntries(Object.entries(remote).filter(([,value]) => value !== undefined));
    this.state = { ...blankState(this.state.uid), ...safeRemote, uid: this.state.uid, profile: this.state.profile };
    document.documentElement.dataset.theme = this.state.settings?.theme || 'light';
    this.persist();
  }

  update(mutator) {
    mutator(this.state);
    this.state.updatedAt = new Date().toISOString();
    this.persist();
  }

  persist(notify = true) {
    if (this.persistLocally) localStorage.setItem(this.key(), JSON.stringify(this.state));
    else this.clearLocal();
    if (notify) this.listeners.forEach(fn => fn(this.state));
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  get activePlan() { return this.state.plans[this.state.currentPlanId] || null; }
  get completedIds() { return new Set(this.state.attempts.filter(a => a.sessionComplete).map(a => a.sessionId)); }

  setPlan(plan) {
    this.update(state => {
      Object.values(state.plans).forEach(item => { if (item.status === 'active') item.status = 'archived'; });
      state.plans[plan.id] = plan;
      state.currentPlanId = plan.id;
      state.onboardingComplete = true;
    });
  }

  recordAttempt(attempt) {
    this.update(state => {
      const index = state.attempts.findIndex(item => item.id === attempt.id);
      if (index >= 0) state.attempts[index] = attempt; else state.attempts.push(attempt);
      if (attempt.reviewItem) state.reviewItems[attempt.reviewItem.id] = attempt.reviewItem;
      const date = attempt.date;
      const day = state.studyDays[date] || { date, activityIds: [], completedSessionIds: [], totalMinutes: 0, updatedAt: attempt.updatedAt };
      if (!day.activityIds.includes(attempt.activityId)) day.activityIds.push(attempt.activityId);
      day.totalMinutes += Math.max(1, Math.round((attempt.durationSeconds || 60) / 60));
      day.updatedAt = attempt.updatedAt;
      state.studyDays[date] = day;
    });
  }

  completeSession(sessionId, minutes) {
    const now = new Date().toISOString();
    const date = now.slice(0, 10);
    const attempt = { id: `session-${sessionId}`, sessionId, activityId: `session-${sessionId}`, skill: 'session', score: 1, sessionComplete: true, date, durationSeconds: minutes * 60, updatedAt: now };
    this.update(state => {
      const index = state.attempts.findIndex(item => item.id === attempt.id);
      if (index >= 0) state.attempts[index] = attempt; else state.attempts.push(attempt);
      const day = state.studyDays[date] || { date, activityIds: [], completedSessionIds: [], totalMinutes: 0 };
      if (!day.completedSessionIds.includes(sessionId)) { day.completedSessionIds.push(sessionId); day.totalMinutes += minutes; }
      day.updatedAt = now;
      state.studyDays[date] = day;
    });
    return attempt;
  }
}

export const store = new AppStore();
export { blankState };
