export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAvSPEg_2i8Y-wv8cLfTvBvT7gmEHe05Ow",
  authDomain: "englishlearning-c745e.firebaseapp.com",
  projectId: "englishlearning-c745e",
  storageBucket: "englishlearning-c745e.firebasestorage.app",
  messagingSenderId: "687230136261",
  appId: "1:687230136261:web:1e4a74e70bf49d2b0465ac",
  measurementId: "G-8VRR8REMYH"
};

export const FIREBASE_SDK_VERSION = '12.4.0';
export const CURRICULUM_VERSION = '2026.10-mvp.1';
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
export const APP_NAME = 'English Learning Assistant';

export function isFirebaseConfigured() {
  return FIREBASE_CONFIG.apiKey !== 'YOUR_FIREBASE_API_KEY' && FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT_ID';
}
