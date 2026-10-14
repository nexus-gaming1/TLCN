const test = require('node:test');
const assert = require('node:assert');
const { ComputerStatus, SessionType } = require('../../../src/constants/enums');

test('Station Enums Validation (Staff Station Management)', () => {
  assert.strictEqual(ComputerStatus.ONLINE, 'ONLINE');
  assert.strictEqual(ComputerStatus.IN_USE, 'IN_USE');
  assert.strictEqual(ComputerStatus.OFFLINE, 'OFFLINE');
  assert.strictEqual(ComputerStatus.LOCKED, 'LOCKED');
  assert.strictEqual(ComputerStatus.MAINTENANCE, 'MAINTENANCE');
  assert.strictEqual(ComputerStatus.REMOTE, 'REMOTE');

  assert.strictEqual(SessionType.MEMBER, 'MEMBER');
  assert.strictEqual(SessionType.GUEST, 'GUEST');
  assert.strictEqual(SessionType.SYSTEM, 'SYSTEM');
});
