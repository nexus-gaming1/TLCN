const db = require('../models');

/**
 * IMemberRepository abstraction / implementation using Sequelize
 * Handles database interaction for Member & User Profile management.
 */
class MemberRepository {
  constructor(models = db) {
    this.models = models;
  }

  /**
   * Find member by ID with related User, MembershipRank, and ComputerZone
   */
  async findById(memberId) {
    return await this.models.Member.findByPk(memberId, {
      include: [
        {
          model: this.models.User,
          as: 'userInfo',
          attributes: ['user_id', 'username', 'avatar_url', 'full_name', 'role', 'status']
        },
        {
          model: this.models.MembershipRank,
          attributes: ['rank_id', 'name', 'required_point', 'rank_level', 'discount_percent']
        }
      ]
    });
  }

  /**
   * Find user by ID
   */
  async findUserById(userId) {
    return await this.models.User.findByPk(userId);
  }

  /**
   * Save User instance
   */
  async saveUser(userInstance) {
    return await userInstance.save();
  }

  /**
   * Find member by ID with lock (Pessimistic Locking) for safe financial balance updates
   */
  async findMemberWithLock(memberId, transaction = null) {
    const options = {
      include: [
        {
          model: this.models.User,
          as: 'userInfo',
          attributes: ['user_id', 'username', 'avatar_url', 'full_name', 'role', 'status']
        }
      ]
    };
    if (transaction) {
      options.transaction = transaction;
      options.lock = transaction.LOCK ? transaction.LOCK.UPDATE : true;
    }
    return await this.models.Member.findByPk(memberId, options);
  }

  /**
   * Save Member instance with optional transaction
   */
  async saveMember(memberInstance, transaction = null) {
    return await memberInstance.save(transaction ? { transaction } : undefined);
  }

  /**
   * Retrieve all members with full associations
   */
  async findAll() {
    return await this.models.Member.findAll({
      include: [
        {
          model: this.models.User,
          as: 'userInfo',
          attributes: ['user_id', 'username', 'avatar_url', 'full_name', 'role', 'status']
        },
        {
          model: this.models.MembershipRank
        }
      ],
      order: [['member_id', 'ASC']]
    });
  }
  /**
   * Fetch all membership ranks from database ordered by rank_level
   */
  async findAllRanks() {
    return await this.models.MembershipRank.findAll({
      order: [['rank_level', 'ASC']]
    });
  }
}

module.exports = MemberRepository;
