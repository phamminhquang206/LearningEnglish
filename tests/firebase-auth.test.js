import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseAuthFlow, hasCloudLearningData } from '../js/services/firebase.js';

test('Samsung Internet uses popup to avoid partitioned redirect storage', () => {
  const userAgent = 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928B) SamsungBrowser/27.0 Chrome/125.0 Mobile Safari/537.36';
  assert.equal(chooseAuthFlow({ userAgent, mobile: true }), 'popup');
});

test('regular mobile browser uses popup on static hosting', () => {
  assert.equal(chooseAuthFlow({ userAgent: 'Android Chrome Mobile', mobile: true }), 'popup');
});

test('standalone PWA and desktop use popup flow', () => {
  assert.equal(chooseAuthFlow({ userAgent: 'Android Chrome Mobile', mobile: true, standalone: true }), 'popup');
  assert.equal(chooseAuthFlow({ userAgent: 'Desktop Chrome', mobile: false }), 'popup');
});

test('cloud migration only runs when learning data exists locally', () => {
  assert.equal(hasCloudLearningData(null), false);
  assert.equal(hasCloudLearningData({ plans: {}, attempts: [], onboardingComplete: false }), false);
  assert.equal(hasCloudLearningData({ plans: { plan1: { id: 'plan1' } }, attempts: [] }), true);
  assert.equal(hasCloudLearningData({ plans: {}, attempts: [{ id: 'attempt1' }] }), true);
});
