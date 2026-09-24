const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateUrgency, isDonationExpired } = require('../services/urgencyEngine');

test('Urgency Engine - correctly calculates urgency levels based on remaining time', () => {
  const now = Date.now();

  // LOW: > 4 hours (e.g. 5 hours)
  const lowExpiry = new Date(now + 5 * 60 * 60 * 1000);
  const lowResult = calculateUrgency(lowExpiry);
  assert.equal(lowResult.level, 'LOW');
  assert.equal(lowResult.score, 25);
  assert.equal(lowResult.isExpired, false);

  // MEDIUM: 2 to 4 hours (e.g. 3 hours)
  const medExpiry = new Date(now + 3 * 60 * 60 * 1000);
  const medResult = calculateUrgency(medExpiry);
  assert.equal(medResult.level, 'MEDIUM');
  assert.equal(medResult.score, 50);
  assert.equal(medResult.isExpired, false);

  // HIGH: 1 to 2 hours (e.g. 90 minutes)
  const highExpiry = new Date(now + 90 * 60 * 1000);
  const highResult = calculateUrgency(highExpiry);
  assert.equal(highResult.level, 'HIGH');
  assert.equal(highResult.score, 80);
  assert.equal(highResult.isExpired, false);

  // CRITICAL: < 1 hour (e.g. 45 minutes)
  const critExpiry = new Date(now + 45 * 60 * 1000);
  const critResult = calculateUrgency(critExpiry);
  assert.equal(critResult.level, 'CRITICAL');
  assert.equal(critResult.score, 100);
  assert.equal(critResult.isExpired, false);

  // EXPIRED: past time
  const expiredTime = new Date(now - 10 * 60 * 1000);
  const expResult = calculateUrgency(expiredTime);
  assert.equal(expResult.level, 'EXPIRED');
  assert.equal(expResult.score, 0);
  assert.equal(expResult.isExpired, true);

  assert.equal(isDonationExpired({ perishability: { expiryTime: expiredTime } }), true);
  assert.equal(isDonationExpiry({ perishability: { expiryTime: lowExpiry } }), false);
});

function isDonationExpiry(d) {
  return isDonationExpired(d);
}
