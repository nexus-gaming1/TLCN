const MemberRepository = require('../repositories/memberRepository');
const ProfileDto = require('../dtos/profileDto');

/**
 * ProfileService - Application / Domain Use Cases for Customer Profile Management
 * Follows Single Responsibility Principle and uses Dependency Injection for repository access.
 */
class ProfileService {
  /**
   * @param {MemberRepository} memberRepository 
   */
  constructor(memberRepository = new MemberRepository()) {
    this.memberRepository = memberRepository;
  }

  /**
   * Fetch customer profile DTO by member ID
   */
  async getProfile(memberId) {
    const member = await this.memberRepository.findById(memberId);
    if (!member) {
      throw new Error(`Không tìm thấy hồ sơ hội viên với ID ${memberId}`);
    }
    const allRanks = await this.memberRepository.findAllRanks();
    return ProfileDto.toResponse(member, allRanks);
  }

  /**
   * Update customer basic profile details (Phone, Full Name, etc.)
   */
  async updateProfileInfo(memberId, updatePayload) {
    const validation = ProfileDto.validateUpdate(updatePayload);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const member = await this.memberRepository.findById(memberId);
    if (!member || !member.userInfo) {
      throw new Error('Hội viên không tồn tại hoặc tài khoản người dùng liên kết không hợp lệ');
    }

    if (updatePayload.avatar_url) {
      member.userInfo.avatar_url = updatePayload.avatar_url;
    }
    if (updatePayload.full_name) {
      member.userInfo.full_name = updatePayload.full_name;
    }

    await this.memberRepository.saveUser(member.userInfo);

    // Update member profile instance fields
    await member.updateProfile({
      phone: updatePayload.phone
    });

    // Re-fetch updated record with associations
    const updatedMember = await this.memberRepository.findById(memberId);
    const allRanks = await this.memberRepository.findAllRanks();
    return ProfileDto.toResponse(updatedMember, allRanks);
  }

  /**
   * Update customer avatar image
   */
  async updateAvatar(memberId, avatarUrl) {
    const member = await this.memberRepository.findById(memberId);
    if (!member || !member.userInfo) {
      throw new Error('Hội viên không tồn tại');
    }

    member.userInfo.avatar_url = avatarUrl;
    await this.memberRepository.saveUser(member.userInfo);

    const updatedMember = await this.memberRepository.findById(memberId);
    const allRanks = await this.memberRepository.findAllRanks();
    return ProfileDto.toResponse(updatedMember, allRanks);
  }
}

module.exports = ProfileService;
