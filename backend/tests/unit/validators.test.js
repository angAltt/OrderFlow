const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  STATUS_TRANSITIONS,
  isNonEmptyString,
  toLikePattern,
  isValidPrice,
  isNonNegativeInt,
  isValidEmail,
  parseId,
} = require('../../src/utils/validators');

describe('validators', () => {
  it('parseId accepts only positive integers', () => {
    assert.equal(parseId('42'), 42);
    assert.equal(parseId('0'), null);
    assert.equal(parseId('-1'), null);
    assert.equal(parseId('1.5'), null);
    assert.equal(parseId('abc'), null);
  });

  it('isValidPrice rejects negatives, strings and NaN', () => {
    assert.equal(isValidPrice(0), true);
    assert.equal(isValidPrice(19.99), true);
    assert.equal(isValidPrice(-1), false);
    assert.equal(isValidPrice('10'), false);
    assert.equal(isValidPrice(Number.NaN), false);
  });

  it('isNonNegativeInt rejects decimals', () => {
    assert.equal(isNonNegativeInt(0), true);
    assert.equal(isNonNegativeInt(3.2), false);
  });

  it('isValidEmail checks a basic email shape', () => {
    assert.equal(isValidEmail('a@b.co'), true);
    assert.equal(isValidEmail('a@b'), false);
  });

  it('Delivered and Cancelled are final states', () => {
    assert.deepEqual(STATUS_TRANSITIONS.Delivered, []);
    assert.deepEqual(STATUS_TRANSITIONS.Cancelled, []);
  });

  it('a Shipped order can only move to Delivered', () => {
    assert.deepEqual(STATUS_TRANSITIONS.Shipped, ['Delivered']);
  });

  it('isNonEmptyString applies the optional max length to the trimmed value', () => {
    assert.equal(isNonEmptyString('  abc  ', 3), true);
    assert.equal(isNonEmptyString('abcd', 3), false);
    assert.equal(isNonEmptyString('   '), false);
  });

  it('toLikePattern escapes LIKE wildcards', () => {
    assert.equal(toLikePattern(' 50%_off '), '%50\\%\\_off%');
  });
});
