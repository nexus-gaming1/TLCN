const test = require('node:test');
const assert = require('node:assert');
const { formatStationDTO, calculateDuration, extractGameFromLog } = require('../../../src/utils/stationFormatter');

test('Station Formatter - calculateDuration formats minutes correctly', () => {
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const formatted = calculateDuration(tenMinsAgo);
  assert.strictEqual(formatted, '00:10');
});

test('Station Formatter - extractGameFromLog distinguishes system log notes vs game names', () => {
  const systemNoteLog = { notes: 'Đổi trạng thái từ ONLINE sang IN_USE' };
  const gameNoteLog = { notes: 'Valorant Ranked' };

  assert.strictEqual(extractGameFromLog(systemNoteLog, 'IN_USE'), 'Phiên chơi hoạt động');
  assert.strictEqual(extractGameFromLog(gameNoteLog, 'IN_USE'), 'Valorant Ranked');
  assert.strictEqual(extractGameFromLog(gameNoteLog, 'ONLINE'), null);
});

test('Station Formatter - formatStationDTO formats Computer model instance correctly with ES2020 operators', () => {
  const mockComputer = {
    computer_id: 1,
    computer_name: 'PC-01',
    ip_address: '192.168.1.101',
    status: 'IN_USE',
    is_remote_enabled: false,
    zone_id: 1,
    ComputerZone: {
      zone_name: 'Zone 1 - Gaming Esports',
      PricingPlan: { price_per_hour: '15000.00' }
    },
    ComputerStatusLogs: [
      {
        status: 'IN_USE',
        start_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        notes: 'Valorant Ranked',
        Member: {
          member_id: 10,
          userInfo: { username: 'gamer01', full_name: 'Nguyễn Văn A' }
        }
      }
    ]
  };

  const dto = formatStationDTO(mockComputer);

  assert.strictEqual(dto.id, 'PC-01');
  assert.strictEqual(dto.computer_id, 1);
  assert.strictEqual(dto.status, 'IN_USE');
  assert.strictEqual(dto.type, 'in_use');
  assert.strictEqual(dto.user, 'Nguyễn Văn A');
  assert.strictEqual(dto.member_id, 10);
  assert.strictEqual(dto.game, 'Valorant Ranked');
  assert.strictEqual(dto.price_per_hour, 15000);
});
