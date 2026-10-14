/**
 * StationFormatter Utility
 * Enforces DRY principle & ES2020 Clean Code standards.
 * Uses Optional Chaining (?.), Nullish Coalescing (??), and intelligent Game Name extraction.
 */

// Module-level constant: Reusable status mapping across backend services and tests
const STATUS_MAP = Object.freeze({
  ONLINE: 'ready',
  IN_USE: 'in_use',
  OFFLINE: 'off',
  LOCKED: 'locked',
  PAUSE: 'locked',
  MAINTENANCE: 'maint',
  REMOTE: 'remote'
});

// Prefixes for system logs to distinguish them from actual game names
const SYSTEM_LOG_PREFIXES = ['Đổi trạng thái', 'Đã chuyển', 'Tạm khóa', 'Mở khóa', 'Chuyển phiên'];

/**
 * Extract clean game name from status log notes
 */
function extractGameFromLog(log, status) {
  if (status !== 'IN_USE' || !log?.notes) return null;
  const isSystemNote = SYSTEM_LOG_PREFIXES.some((prefix) => log.notes.startsWith(prefix));
  return isSystemNote ? 'Phiên chơi hoạt động' : log.notes;
}

function calculateDuration(startTime) {
  if (!startTime) return '00:00';
  const start = new Date(startTime).getTime();
  const diffMinutes = Math.max(0, Math.floor((Date.now() - start) / (1000 * 60)));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format Computer model instance into standardized Station DTO
 * Uses ES2020 Optional Chaining (?.) & Nullish Coalescing (??)
 */
function formatStationDTO(computer) {
  if (!computer) return null;

  const raw = computer.toJSON ? computer.toJSON() : computer;

  // Modern ES2020 Optional Chaining & Nullish Coalescing
  const latestLog = raw.ComputerStatusLogs?.[0] ?? null;
  const member = latestLog?.Member ?? null;
  const userInfo = member?.userInfo;

  const user = userInfo?.full_name ?? userInfo?.username ?? (raw.status === 'IN_USE' ? 'Khách chơi' : null);
  const type = STATUS_MAP[raw.status] ?? 'ready';
  const zonePricing = raw.ComputerZone?.PricingPlans?.find?.((p) => p.is_active)
    ?? raw.ComputerZone?.PricingPlans?.[0]
    ?? raw.ComputerZone?.PricingPlan;
  const pricePerHour = Number(zonePricing?.price_per_hour ?? 0);

  return {
    id: raw.computer_name ?? `PC-${raw.computer_id}`,
    computer_id: raw.computer_id,
    computer_name: raw.computer_name,
    ip_address: raw.ip_address,
    mac_address: raw.mac_address ?? null,
    status: raw.status,

    type,
    user,
    member_id: member?.member_id ?? null,
    game: extractGameFromLog(latestLog, raw.status),
    time: latestLog?.start_time ? calculateDuration(latestLog.start_time) : null,
    telemetry: raw.is_remote_enabled ? 'Cloud vGPU • Remote' : 'Standard Node',
    zone_id: raw.zone_id,
    zone_name: raw.ComputerZone?.zone_name ?? 'Khu Thường',
    price_per_hour: pricePerHour
  };
}

module.exports = {
  formatStationDTO,
  calculateDuration,
  extractGameFromLog,
  STATUS_MAP
};
