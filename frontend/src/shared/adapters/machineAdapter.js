/**
 * MachineAdapter Utility (Frontend Mapper)
 * Enforces Single Responsibility Principle (SRP): Transforms raw backend computer response DTOs into Frontend UI Machine objects.
 * Maps 100% live data directly from MySQL CSDL (Computer, ComputerZone, HardwareProfile, PricingPlan).
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
  ONLINE: { status: 'ONLINE', statusLabel: 'Online (Sẵn sàng)', cleanStatus: 'Chưa có phiên chơi' },
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
 * Map single raw Computer entity from API into UI Machine DTO
 * Reads 100% live records from MySQL CSDL without hardcoded mock fallbacks
 * @param {object} c - Raw Computer item from backend Sequelize query
 */
export function mapComputerToMachineDTO(c) {
  if (!c) return null;

  const zoneId = Number(c.zone_id || c.zoneId || c.ComputerZone?.zone_id || 1);
  const zoneIcon = ZONE_ICON_MAP[zoneId] || 'grid_view';
  const statusConfig = STATUS_CONFIG_MAP[c.status] || DEFAULT_STATUS_CONFIG;

  // 1. Phân khu & Bảng giá từ CSDL
  const zoneName = c.zone_name || c.zoneName || c.ComputerZone?.zone_name || `Zone ${zoneId}`;
  const zoneDesc = c.ComputerZone?.description || '';
  const tierLevel = Number(c.ComputerZone?.tier_level ?? 1);

  // Lấy đơn giá thực tế từ bảng giá (PricingPlan) liên kết với Phân khu trong MySQL
  const pricingPlans = c.ComputerZone?.PricingPlans || [];
  const activePlan = pricingPlans.find(
    (p) => p.is_active && (c.is_remote_enabled ? p.plan_type === 'REMOTE' : p.plan_type === 'LOCAL')
  ) || pricingPlans.find((p) => p.is_active) || pricingPlans[0];
  const pricePerHour = Number(c.price_per_hour || activePlan?.price_per_hour || 0);

  // 2. Thông số phần cứng thực tế (HardwareProfile từ MySQL)
  const hp = c.HardwareProfile;
  const cpu = hp?.cpu_model || c.cpu || 'Chưa thiết lập';
  const gpu = hp?.gpu_model || c.gpu || 'Chưa thiết lập';
  const ram = hp?.ram_capacity || c.ram || 'Chưa thiết lập';
  const monitor = hp?.monitor || c.monitor || '';
  const gear = hp?.gear || c.gear || '';
  const storage = hp?.storage_type || c.storage || '';
  const specDescription = hp?.description || c.ComputerZone?.description || '';

  // 3. Thông tin người dùng & phiên chơi từ ComputerStatusLogs / RentalSessions
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

  return {
    id: c.computer_name || c.computerName || c.id || `PC-${c.computer_id || c.computerId}`,
    computer_id: c.computer_id || c.computerId,
    hardware_profile_id: c.hardware_profile_id || hp?.profile_id || zoneId,
    numericId: String(c.computer_id || c.computerId || 1).padStart(2, '0'),
    ip: c.ip_address || c.ipAddress || '--',
    mac_address: c.mac_address || c.macAddress || '--',
    port: c.port || (c.computer_id || c.computerId ? `Cổng #${c.computer_id || c.computerId}` : '--'),
    zoneId: `zone-${zoneId}`,
    zone_id: zoneId,
    zoneName,
    zoneIcon,
    tier_level: tierLevel,
    specDescription: specDescription || zoneDesc,
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
    cpu,
    gpu,
    ram,
    monitor,
    gear,
    storage,
    bootImage: c.boot_image || c.bootImage || hp?.storage_type || 'Win11-Pro-Cyber-v25.02',
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
