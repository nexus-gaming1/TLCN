const assert = require('assert');
const ProfileService = require('../src/services/profileService');
const ProfileDto = require('../src/dtos/profileDto');


/**
 * Mock MemberRepository implementing IMemberRepository contract for unit testing
 */
class MockMemberRepository {
  constructor() {
    this.members = [
      {
        member_id: 3,
        phone: '+84 912 849 201',
        real_balance: 1250000.00,
        bonus_balance: 350000.00,
        point: 2850,
        rank_id: 3,
        userInfo: {
          user_id: 3,
          username: 'kaelen_nexus',
          avatar_url: 'https://example.com/avatar.jpg',
          full_name: 'Nguyễn Hoàng Nam',
          role: 'MEMBER',
          status: 'ACTIVE'
        },
        MembershipRank: {
          rank_id: 3,
          name: 'VIP Gold',
          discount_percent: 10.0
        },
        updateProfile: async function(fields) {
          Object.assign(this, fields);
          return this;
        }
      }
    ];
  }

  async findById(id) {
    return this.members.find((m) => m.member_id === Number(id)) || null;
  }

  async saveUser(userInstance) {
    return userInstance;
  }

  async saveMember(memberInstance) {
    return memberInstance;
  }

  async findAllRanks() {
    return [
      { rank_id: 1, name: 'Đồng', required_point: 0, rank_level: 1, discount_percent: 0.00 },
      { rank_id: 2, name: 'Bạc', required_point: 500, rank_level: 2, discount_percent: 5.00 },
      { rank_id: 3, name: 'Vàng', required_point: 1500, rank_level: 3, discount_percent: 10.00 },
      { rank_id: 4, name: 'Kim Cương', required_point: 3000, rank_level: 4, discount_percent: 15.00 }
    ];
  }
}

async function runTests() {
  console.log('🧪 Running ProfileService Unit Tests (Dependency Injection Verification)...');

  const mockRepo = new MockMemberRepository();
  const profileService = new ProfileService(mockRepo);

  // Test 1: Fetch Profile DTO
  const profile = await profileService.getProfile(3);
  assert.strictEqual(profile.phone, '+84 912 849 201');
  assert.strictEqual(profile.rank.name, 'VIP Gold');
  console.log('✅ Test 1 Passed: Fetch Profile DTO returned correct fields.');

  // Test 2: Update Profile Info
  const updated = await profileService.updateProfileInfo(3, {
    phone: '+84 999 888 777'
  });
  assert.strictEqual(updated.phone, '+84 999 888 777');
  console.log('✅ Test 2 Passed: Update Profile Info modified member correctly.');

  // Test 3: ProfileDto.generateUid Edge Cases
  assert.strictEqual(ProfileDto.generateUid(5), 'NX-0005');
  assert.strictEqual(ProfileDto.generateUid(null), 'NX-0000');
  console.log('✅ Test 3 Passed: ProfileDto.generateUid edge cases verified.');



  console.log('🎉 All ProfileService Unit Tests Passed Successfully!');
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('❌ Test Failed:', err);
    process.exit(1);
  });
}

module.exports = runTests;
