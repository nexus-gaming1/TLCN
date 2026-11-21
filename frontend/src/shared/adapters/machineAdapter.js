/**
 * MachineAdapter Utility (Frontend Mapper)
 * Enforces Single Responsibility Principle (SRP): Transforms raw backend computer response DTOs into Frontend UI Machine objects.
 * Uses Object Mapping & Optional Chaining (?.) and maps directly from CSDL Seeder data.
 */

// Zone Icon Mapping Dictionary
const ZONE_ICON_MAP = Object.freeze({
  1: 'military_tech',
  2: 'hotel_class',
  3: 'dns',
  4: 'videocam',
  5: 'cloud_sync'
});

// Computer Status Mapping Dictionary (aligned 100% with backend ComputerStatus enum)
const STATUS_CONFIG_MAP = Object.freeze({
  ONLINE: { status: 'ONLINE', statusLabel: 'Online (Sẵn sàng)', cleanStatus: 'Sẵn sàng nạp khách' },
  IN_USE: { status: 'IN_USE', statusLabel: 'Đang sử dụng', cleanStatus: 'Khách đang hoạt động' },
  MAINTENANCE: { status: 'MAINTENANCE', statusLabel: 'Bảo trì', cleanStatus: 'Đang kiểm tra phần cứng' },
  OFFLINE: { status: 'OFFLINE', statusLabel: 'Offline', cleanStatus: 'Tắt nguồn' },
  LOCKED: { status: 'LOCKED', statusLabel: 'Tạm khóa', cleanStatus: 'Trạm bị khóa' },
  PAUSE: { status: 'LOCKED', statusLabel: 'Tạm dừng', cleanStatus: 'Phiên bị tạm dừng' },
  REMOTE: { status: 'REMOTE', statusLabel: 'Cloud Remote', cleanStatus: 'Trạm kết nối từ xa' }
});

const DEFAULT_STATUS_CONFIG = Object.freeze({
  status: 'OFFLINE',
  statusLabel: 'Offline',
  cleanStatus: 'Tắt nguồn'
});

/**
 * Map single raw Computer entity from API (populated from Seeder CSDL) into UI Machine DTO
 * @param {object} c - Raw Computer item from backend Sequelize query
 */
export function mapComputerToMachineDTO(c) {
  if (!c) return null;

  const zoneId = c.zone_id || c.zoneId || 1;
  const zoneIcon = ZONE_ICON_MAP[zoneId] || 'military_tech';
  const statusConfig = STATUS_CONFIG_MAP[c.status] || DEFAULT_STATUS_CONFIG;

  // Extract zone name & description populated from backend CSDL Seeder
  const zoneName = c.zone_name || c.zoneName || c.ComputerZone?.zone_name || `Zone ${zoneId}`;
  const zoneDesc = c.ComputerZone?.description || '';

  // Optional Chaining (?.): Extract active user info & logs cleanly from backend response
  const latestLog = c.ComputerStatusLogs?.[0] || c.RentalSessions?.[0];
  const memberObj = latestLog?.Member || c.Member;
  const userName = memberObj?.userInfo?.full_name
    || memberObj?.userInfo?.username
    || c.currentUsername
    || c.user
    || null;

  const userInitials = userName
    ? userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : null;

  const currentGame = latestLog?.notes || c.game || (c.status === 'IN_USE' ? 'Phiên chơi hoạt động' : null);

  let type = 'ready';
  if (c.status === 'IN_USE') type = c.is_remote_enabled ? 'cloud' : 'local';
  else if (c.status === 'MAINTENANCE') type = 'maint';
  else if (c.status === 'OFFLINE') type = 'off';
  else if (c.status === 'LOCKED') type = 'locked';

  const pricePerHour = Number(c.ComputerZone?.PricingPlan?.price_per_hour || c.price_per_hour || (zoneId === 2 ? 15000 : zoneId === 3 ? 10000 : zoneId === 4 ? 20000 : zoneId === 5 ? 25000 : 12000));
  const tierLevel = Number(c.ComputerZone?.tier_level || (zoneId === 3 ? 1 : (zoneId === 1 || zoneId === 2) ? 2 : zoneId === 4 ? 3 : 4));

  return {
    id: c.computer_name || c.computerName || c.id || `PC-${c.computer_id || c.computerId}`,
    computer_id: c.computer_id || c.computerId,
    numericId: String(c.computer_id || c.computerId || 1).padStart(2, '0'),
    ip: c.ip_address || c.ipAddress || `192.168.1.${100 + (c.computer_id || c.computerId || 1)}`,
    mac_address: c.mac_address || c.macAddress || 'F4:D4:88:5A:00:00',
    port: `Port #${c.computer_id || c.computerId || 1}`,
    zoneId: `zone-${zoneId}`,
    zone_id: zoneId,
    zoneName,
    zoneIcon,
    tier_level: tierLevel,
    specDescription: zoneDesc,
    price_per_hour: Number(c.hourlyRate ?? pricePerHour),
    zone_name: zoneName,
    member_id: c.memberId || c.member_id || memberObj?.member_id || null,
    memberId: c.memberId || c.member_id || memberObj?.member_id || null,
    real_balance: c.realBalance ?? c.real_balance ?? memberObj?.real_balance ?? null,
    bonus_balance: c.bonusBalance ?? c.bonus_balance ?? memberObj?.bonus_balance ?? null,
    sessionStartedAt: c.sessionStartedAt || null,
    remainingMinutes: c.remainingMinutes ?? null,
    hasActiveCombo: Boolean(c.hasActiveCombo),
    is_remote_enabled: Boolean(c.is_remote_enabled),
    cpu: c.is_remote_enabled ? 'Cloud vGPU Core' : 'Intel Core High Performance',
    gpu: c.is_remote_enabled ? 'RTX 4090 Cloud vGPU' : 'NVIDIA GeForce RTX',
    ram: '32GB DDR5',
    bootImage: 'Win11-Pro-Cyber-v25.02',
    userName,
    user: userName,
    userRank: memberObj?.Rank?.name ? `Rank ${memberObj.Rank.name}` : null,
    userInitials,
    currentGame,
    game: currentGame,
    ip_address: c.ip_address || c.ipAddress || null,
    cleanStatus: statusConfig.cleanStatus,
    status: statusConfig.status,
    statusLabel: statusConfig.statusLabel,
    type
  };
}
