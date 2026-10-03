import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config.js?v=2';

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
    this.db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
    authMod.onAuthStateChanged(this.auth, user => { this.user = user; this.notify(user); });
    this.ready = true;
    return true;
  }

  onAuth(callback) { this.authSubscribers.add(callback); return () => this.authSubscribers.delete(callback); }
  notify(user) { this.authSubscribers.forEach(fn => fn(user)); }

  async login() {
    if (this.demo) return this.loginDemo();
    const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = this.modules.authMod;
    const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
    const mobile = matchMedia('(max-width: 700px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
    if (mobile) return signInWithRedirect(this.auth, provider);
    return signInWithPopup(this.auth, provider);
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
  async saveSettings(uid, settings) { return this.set(uid, 'settings', 'app', settings); }

  async set(uid, collectionName, id, data) {
    if (this.demo || !this.db) return;
    const { doc, setDoc } = this.modules.fs;
    await setDoc(doc(this.db, 'users', uid, collectionName, id), data, { merge: true });
  }

  async loadUserData(uid) {
    if (this.demo || !this.db) return null;
    const { doc, getDoc, collection, getDocs } = this.modules.fs;
    const [profileSnap, plansSnap, attemptsSnap, reviewsSnap, daysSnap, speakingSnap, settingsSnap] = await Promise.all([
      getDoc(doc(this.db,'users',uid)), getDocs(collection(this.db,'users',uid,'plans')), getDocs(collection(this.db,'users',uid,'attempts')),
      getDocs(collection(this.db,'users',uid,'reviewItems')), getDocs(collection(this.db,'users',uid,'studyDays')), getDocs(collection(this.db,'users',uid,'speakingSessions')), getDoc(doc(this.db,'users',uid,'settings','app'))
    ]);
    const plans = Object.fromEntries(plansSnap.docs.map(d => [d.id,deserializePlanFromFirestore(d.data())]));
    const reviewItems = Object.fromEntries(reviewsSnap.docs.map(d => [d.id,d.data()]));
    const studyDays = Object.fromEntries(daysSnap.docs.map(d => [d.id,d.data()]));
    const profile = profileSnap.exists() ? profileSnap.data() : {};
    return { plans, attempts: attemptsSnap.docs.map(d=>d.data()), reviewItems, studyDays, speakingSessions: speakingSnap.docs.map(d=>d.data()), settings: settingsSnap.exists()?settingsSnap.data():undefined, onboardingComplete: !!profile.onboardingComplete, currentPlanId: profile.currentPlanId || null, updatedAt: profile.updatedAt?.toDate?.().toISOString?.() || '' };
  }
}

export const firebaseService = new FirebaseService();

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
