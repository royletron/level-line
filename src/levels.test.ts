import assert from 'node:assert/strict';
import { addSample, emptyStats, zoneOf, CLIP_DB } from './levels.ts';

// Equal-power average: half the time at 0 dB, half at -80 dB is ~-3 dB, not -40.
let s = emptyStats();
s = addSample(s, 0);
s = addSample(s, -80);
assert.ok(Math.abs(s.avg - -3.01) < 0.05, `avg ${s.avg}`);
assert.equal(s.max, 0);
assert.equal(s.clipped, true);

// Clamping.
assert.equal(addSample(emptyStats(), 5).current, 0);
assert.equal(addSample(emptyStats(), -200).current, -80);

// Peak hold holds, then falls, and never drops below the current level.
s = addSample(emptyStats(), -10);
for (let i = 0; i < 15; i++) s = addSample(s, -50);
assert.equal(s.hold, -10);
for (let i = 0; i < 10; i++) s = addSample(s, -50);
assert.ok(s.hold < -10 && s.hold >= -50);

assert.equal(s.clipped, false);
assert.equal(zoneOf(-20), 'safe');
assert.equal(zoneOf(-6), 'warm');
assert.equal(zoneOf(CLIP_DB), 'hot');
console.log('levels ok');
