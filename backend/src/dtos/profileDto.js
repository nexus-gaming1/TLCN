const {
  DEFAULT_AVATAR_URL,
  DEFAULT_RANK_NAME,
  SYSTEM_UID_PREFIX
} = require('../constants/profileDefaults');

/**
 * Profile Data Transfer Object & Response Formatter
 * Formats DB models into UI DTO responses and validates incoming update requests.
 */
class ProfileDto {
  /**
   * Dynamically generate UID based on member_id
   */
  static generateUid(memberId) {
    const validMemberId = memberId ?? 0;
    const paddedId = String(validMemberId).padStart(4, '0');
    return `${SYSTEM_UID_PREFIX}-${paddedId}`;
  }


  /**
   * Format DB model into UI Profile Response DTO object
   */
  static toResponse(member, allRanks = []) {
    if (!member) return null;
    const user = member.userInfo || {};
    const rank = member.MembershipRank || {};

    const rankLevel = Number(rank.rank_level || 1);
    const requiredPoint = Number(rank.required_point || 0);

    // Find next rank in tier hierarchy
    const nextRank = allRanks.find((r) => Number(r.rank_level) === rankLevel + 1) || null;

    const dynamicUid = ProfileDto.generateUid(member.member_id);

    return {
      member_id: member.member_id,
      uid: dynamicUid,
      username: user.username || '',
      avatar_url: user.avatar_url || DEFAULT_AVATAR_URL,
      full_name: user.full_name || '',
      phone: member.phone || '',
      status: user.status || 'ACTIVE',
      rank: {
        rank_id: Number(member.rank_id || 1),
        name: rank.name || DEFAULT_RANK_NAME,
        rank_level: rankLevel,
        required_point: requiredPoint,
        discount_percent: parseFloat(rank.discount_percent || 0),
        next_rank: nextRank ? {
          rank_id: Number(nextRank.rank_id),
          name: nextRank.name,
          rank_level: Number(nextRank.rank_level),
          required_point: Number(nextRank.required_point),
          discount_percent: parseFloat(nextRank.discount_percent || 0)
        } : null
      },
      balances: {
        real_balance: parseFloat(member.real_balance || 0),
        bonus_balance: parseFloat(member.bonus_balance || 0),
        points: Number(member.point || 0)
      }
    };
  }

  /**
   * Comprehensive validation for profile update payload
   */
  static validateUpdate(data = {}) {
    const errors = [];

    // 1. Phone validation
    if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
      if (!/^\+?[0-9\s-]{9,15}$/.test(data.phone)) {
        errors.push('Số điện thoại không đúng định dạng (9-15 chữ số)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = ProfileDto;
