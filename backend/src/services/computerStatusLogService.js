const db = require('../models');
const { SessionType } = require('../constants/enums');

async function recordStatusChange(
  computer,
  previousStatus,
  nextStatus,
  memberId = null,
  transaction = undefined
) {
  if (!computer || previousStatus === nextStatus) {
    return null;
  }

  return db.ComputerStatusLog.create({
    computer_id: computer.computer_id,
    member_id: memberId,
    status: nextStatus,
    session_type: memberId ? SessionType.MEMBER : SessionType.SYSTEM,
  }, { transaction });
}

module.exports = {
  recordStatusChange
};
