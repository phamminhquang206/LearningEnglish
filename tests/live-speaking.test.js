import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveSpeakingService } from '../js/services/live-speaking.js';

test('live speaking starts at a safe output volume and clamps changes',()=>{
  const service=new LiveSpeakingService();
  assert.equal(service.outputVolume,.35);
  assert.equal(service.setOutputVolume(.6),.6);
  assert.equal(service.setOutputVolume(-1),0);
  assert.equal(service.setOutputVolume(2),1);
});

