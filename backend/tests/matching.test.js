const test = require('node:test');
const assert = require('node:assert/strict');
const { checkDietaryCompatibility } = require('../services/matchingEngine');

test('Matching Engine - Dietary Compatibility Logic', () => {
  // ANY accepted accepts anything
  assert.equal(checkDietaryCompatibility('VEG', ['ANY']), 100);
  assert.equal(checkDietaryCompatibility('NON_VEG', ['ANY']), 100);
  assert.equal(checkDietaryCompatibility('VEGAN', ['ANY']), 100);

  // VEG only
  assert.equal(checkDietaryCompatibility('VEG', ['VEG']), 100);
  assert.equal(checkDietaryCompatibility('VEGAN', ['VEG']), 100);
  assert.equal(checkDietaryCompatibility('NON_VEG', ['VEG']), null); // Incompatible

  // NON_VEG only
  assert.equal(checkDietaryCompatibility('NON_VEG', ['NON_VEG']), 100);
  assert.equal(checkDietaryCompatibility('VEG', ['NON_VEG']), null); // Incompatible
});
