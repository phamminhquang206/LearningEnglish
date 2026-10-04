import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config.js?v=5';

const SDK = 'https://www.gstatic.com/firebasejs/12.4.0';
class FirebaseService {
  constructor() { this.ready = false; this.demo = !isFirebaseConfigured(); this.auth = null; this.db = null; this.user = null; this.authSubscribers = new Set(); }

  async init() {
    if (this.demo) {
      queueMicrotask(() => this.notify(null));
      return false;
    }
    const [{ initializeApp }, authMod, fs] = await Promise.all([
      import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`)
    ]);
    this.modules = { authMod, fs };
    const app = initializeApp(FIREBASE_CONFIG);
    this.auth = authMod.getAuth(app);
    await authMod.setPersistence(this.auth, authMod.browserLocalPersistence);
    this.db = fs.initializeFirestore(app, { localCache: fs.memoryLocalCache() });
    authMod.onAuthStateChanged(this.auth, user => { this.user = user; this.notify(user); });
    try {
      await authMod.getRedirectResult(this.auth);
    } catch (error) {
      throw normalizeAuthError(error);
    }
    this.ready = true;
    return true;
  }

  onAuth(callback) { this.authSubscribers.add(callback); return () => this.authSubscribers.delete(callback); }
  notify(user) { this.authSubscribers.forEach(fn => fn(user)); }

  async login() {
    if (this.demo) return this.loginDemo();
    const { GoogleAuthProvider, signInWithPopup } = this.modules.authMod;
    const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
    try {
      // Popup is the reliable Firebase option for static hosts such as GitHub
      // Pages because the app host cannot serve Firebase's /__/auth/handler.
      return await signInWithPopup(this.auth, provider);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  }

  loginDemo() {
    const user = { uid: 'demo-user', displayName: 'Học viên Demo', email: 'demo@local', photoURL: '' };
    this.user = user; sessionStorage.setItem('ela_demo_auth', '1'); this.notify(user); return Promise.resolve({ user });
  }

  restoreDemo() { if (this.demo && sessionStorage.getItem('ela_demo_auth')) this.loginDemo(); }

  async logout() {
    if (this.demo) { sessionStorage.removeItem('ela_demo_auth'); this.user = null; this.notify(null); return; }
    return this.modules.authMod.signOut(this.auth);
  }

  async upsertProfile(user, onboardingComplete, currentPlanId) {
    if (this.demo || !this.db) return;
    const { doc, setDoc, serverTimestamp } = this.modules.fs;
    await setDoc(doc(this.db, 'users', user.uid), { displayName: user.displayName || '', email: user.email || '', photoURL: user.photoURL || '', onboardingComplete, currentPlanId: currentPlanId || null, updatedAt: serverTimestamp() }, { merge: true });
  }

  async savePlan(uid, plan) { return this.set(uid, 'plans', plan.id, serializePlanForFirestore(plan)); }
  async saveAttempt(uid, attempt) { return this.set(uid, 'attempts', attempt.id, attempt); }
  async saveReview(uid, review) { return this.set(uid, 'reviewItems', review.id, review); }
  async saveStudyDay(uid, day) { return this.set(uid, 'studyDays', day.date, day); }
  async saveSpeaking(uid, session) { return this.set(uid, 'speakingSessions', session.id, session); }
  async saveGrammarLesson(uid, lesson) { return this.set(uid, 'grammarLessons', lesson.id, lesson); }
  async saveSettings(uid, settings) { return this.set(uid, 'settings', 'app', settings); }

  async migrateLocalState(user, state) {
    if (this.demo || !this.db || !state) return;
    const writes = [
      ...Object.values(state.plans || {}).map(plan => this.savePlan(user.uid, plan)),
      ...(state.attempts || []).map(attempt => this.saveAttempt(user.uid, attempt)),
      ...Object.values(state.reviewItems || {}).map(review => this.saveReview(user.uid, review)),
      ...Object.values(state.studyDays || {}).map(day => this.saveStudyDay(user.uid, day)),
      ...(state.speakingSessions || []).map(session => this.saveSpeaking(user.uid, session)),
      ...Object.values(state.grammarLessons || {}).map(lesson => this.saveGrammarLesson(user.uid, lesson)),
      this.saveSettings(user.uid, state.settings || {})
    ];
    await Promise.all(writes);
    await this.upsertProfile(user, !!state.onboardingComplete, state.currentPlanId || null);
  }

  async set(uid, collectionName, id, data) {
    if (this.demo || !this.db) return;
    const { doc, setDoc } = this.modules.fs;
    await setDoc(doc(this.db, 'users', uid, collectionName, id), data, { merge: true });
  }

  async loadUserData(uid) {
    if (this.demo || !this.db) return null;
    const { doc, getDocFromServer, collection, getDocsFromServer } = this.modules.fs;
    const [profileSnap, plansSnap, attemptsSnap, reviewsSnap, daysSnap, speakingSnap, grammarLessonsSnap, settingsSnap] = await Promise.all([
      getDocFromServer(doc(this.db,'users',uid)), getDocsFromServer(collection(this.db,'users',uid,'plans')), getDocsFromServer(collection(this.db,'users',uid,'attempts')),
      getDocsFromServer(collection(this.db,'users',uid,'reviewItems')), getDocsFromServer(collection(this.db,'users',uid,'studyDays')), getDocsFromServer(collection(this.db,'users',uid,'speakingSessions')), getDocsFromServer(collection(this.db,'users',uid,'grammarLessons')), getDocFromServer(doc(this.db,'users',uid,'settings','app'))
    ]);
    const plans = Object.fromEntries(plansSnap.docs.map(d => [d.id,deserializePlanFromFirestore(d.data())]));
    const reviewItems = Object.fromEntries(reviewsSnap.docs.map(d => [d.id,d.data()]));
    const studyDays = Object.fromEntries(daysSnap.docs.map(d => [d.id,d.data()]));
    const grammarLessons = Object.fromEntries(grammarLessonsSnap.docs.map(d => [d.id,d.data()]));
    const profile = profileSnap.exists() ? profileSnap.data() : {};
    return { plans, attempts: attemptsSnap.docs.map(d=>d.data()), reviewItems, studyDays, speakingSessions: speakingSnap.docs.map(d=>d.data()), grammarLessons, settings: settingsSnap.exists()?settingsSnap.data():undefined, onboardingComplete: !!profile.onboardingComplete, currentPlanId: profile.currentPlanId || null, updatedAt: profile.updatedAt?.toDate?.().toISOString?.() || '' };
  }
}

export const firebaseService = new FirebaseService();

export function chooseAuthFlow() {
  return 'popup';
}

export function hasCloudLearningData(state) {
  return !!(state?.currentPlanId || state?.onboardingComplete || Object.keys(state?.plans || {}).length || (state?.attempts || []).length);
}

function normalizeAuthError(error) {
  const messages = {
    'auth/unauthorized-domain': 'Domain hiện tại chưa được thêm vào Firebase Authentication > Authorized domains.',
    'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép pop-up cho trang này rồi thử lại.',
    'auth/popup-closed-by-user': 'Cửa sổ đăng nhập đã được đóng trước khi hoàn tất.',
    'auth/web-storage-unsupported': 'Trình duyệt đang chặn storage cần cho đăng nhập. Hãy cho phép cookie/site data cho trang này.',
    'auth/operation-not-supported-in-this-environment': 'Trình duyệt hiện tại không hỗ trợ cách đăng nhập này.'
  };
  const normalized = new Error(messages[error?.code] || error?.message || 'Không thể hoàn tất đăng nhập Google.');
  normalized.code = error?.code || 'auth/unknown';
  return normalized;
}

export function serializePlanForFirestore(plan) {
  const sessions = Object.fromEntries((plan.sessions || []).map(session => {
    const { activities: _curriculumActivities, ...assignment } = session;
    return [assignment.id, assignment];
  }));
  const adaptations = Object.fromEntries((plan.adaptations || []).map((adaptation, index) => [
    `week-${adaptation.week || index + 1}-${index}`,
    adaptation
  ]));
  return { ...plan, sessions, adaptations };
}

export function deserializePlanFromFirestore(plan) {
  return {
    ...plan,
    sessions: Array.isArray(plan.sessions) ? plan.sessions : Object.values(plan.sessions || {}),
    adaptations: Array.isArray(plan.adaptations) ? plan.adaptations : Object.values(plan.adaptations || {})
  };
}
