const bcrypt = require('bcryptjs');
const { UserRole, UserStatus, ComputerStatus, SessionType, TransactionType, TransactionCategory } = require('../constants/enums');

/**
 * Database Seeder Utility for NEXUS Cyber Management System
 * Populates production-ready seed data aligned 100% with backend/src/config/model.js & sql.sql.
 * Wrapped with safe constraint handling to prevent startup crashes.
 */
const seedData = async (db) => {
  try {
    const hashedPassword = bcrypt.hashSync('123456', 10);

    // Helper for safe seeding: inserts missing items or updates duplicate fields
    const safeSeed = async (model, data, updateFields) => {
      try {
        if (updateFields) {
          await model.bulkCreate(data, { updateOnDuplicate: updateFields });
        } else {
          await model.bulkCreate(data, { ignoreDuplicates: true });
        }
      } catch (err) {
        console.warn(`[Seeder Warning] Error seeding ${model.name || 'table'}:`, err.message);
      }
    };

    // 1. Seed Membership Ranks
    await safeSeed(db.MembershipRank, [
      { rank_id: 1, name: 'Đồng', required_point: 0, rank_level: 1, discount_percent: 0.00 },
      { rank_id: 2, name: 'Bạc', required_point: 500, rank_level: 2, discount_percent: 5.00 },
      { rank_id: 3, name: 'Vàng', required_point: 1500, rank_level: 3, discount_percent: 10.00 },
      { rank_id: 4, name: 'Kim Cương', required_point: 3000, rank_level: 4, discount_percent: 15.00 }
    ]);

    // 1.5. Seed Users & Customer Members
    if (db.User && db.Member) {
      await safeSeed(db.User, [
        {
          user_id: 1,
          username: 'admin',
          avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAs8dBAUHnsFAlRsHsjgaT6wrKt-GrttfGiw1_eIniAUOa-8Njbsfgqvj8LCwo2GG725KkvX-7UNAQWJU9OuU_WzUP2CgXPbJRiUV2hQPM7ZklsLgfjfm4Z126zsxn16iDfJkNt5VahCr6FbdbVPCJ1uVXn-eawT4Ch_6ofpZq9gypCMIlKT5S6zHbGA5K0ArpqFJa2jp1YtccknO3eEtqIE2EFI4SYJqeoQORRG8KlTgY0AUReON8',
          password_hash: hashedPassword,
          full_name: 'Quản Trị Viên',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE
        },
        {
          user_id: 2,
          username: 'user',
          avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAs8dBAUHnsFAlRsHsjgaT6wrKt-GrttfGiw1_eIniAUOa-8Njbsfgqvj8LCwo2GG725KkvX-7UNAQWJU9OuU_WzUP2CgXPbJRiUV2hQPM7ZklsLgfjfm4Z126zsxn16iDfJkNt5VahCr6FbdbVPCJ1uVXn-eawT4Ch_6ofpZq9gypCMIlKT5S6zHbGA5K0ArpqFJa2jp1YtccknO3eEtqIE2EFI4SYJqeoQORRG8KlTgY0AUReON8',
          password_hash: hashedPassword,
          full_name: 'Khách Hàng VIP',
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE
        },
        {
          user_id: 3,
          username: 'staff',
          avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAs8dBAUHnsFAlRsHsjgaT6wrKt-GrttfGiw1_eIniAUOa-8Njbsfgqvj8LCwo2GG725KkvX-7UNAQWJU9OuU_WzUP2CgXPbJRiUV2hQPM7ZklsLgfjfm4Z126zsxn16iDfJkNt5VahCr6FbdbVPCJ1uVXn-eawT4Ch_6ofpZq9gypCMIlKT5S6zHbGA5K0ArpqFJa2jp1YtccknO3eEtqIE2EFI4SYJqeoQORRG8KlTgY0AUReON8',
          password_hash: hashedPassword,
          full_name: 'Nhân Viên Thu Ngân A',
          role: UserRole.EMPLOYEE || UserRole.STAFF || 'STAFF',
          status: UserStatus.ACTIVE
        },
        {
          user_id: 4,
          username: 'employee',
          avatar_url: '',
          password_hash: hashedPassword,
          full_name: 'Nhân Viên Thu Ngân B',
          role: UserRole.EMPLOYEE || UserRole.STAFF || 'STAFF',
          status: UserStatus.ACTIVE
        },
        {
          user_id: 5,
          username: 'customer',
          avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAs8dBAUHnsFAlRsHsjgaT6wrKt-GrttfGiw1_eIniAUOa-8Njbsfgqvj8LCwo2GG725KkvX-7UNAQWJU9OuU_WzUP2CgXPbJRiUV2hQPM7ZklsLgfjfm4Z126zsxn16iDfJkNt5VahCr6FbdbVPCJ1uVXn-eawT4Ch_6ofpZq9gypCMIlKT5S6zHbGA5K0ArpqFJa2jp1YtccknO3eEtqIE2EFI4SYJqeoQORRG8KlTgY0AUReON8',
          password_hash: hashedPassword,
          full_name: 'Khách Hàng VIP',
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE
        },
        {
          user_id: 6,
          username: 'nam.nv',
          avatar_url: '',
          password_hash: hashedPassword,
          full_name: 'Nguyễn Văn Nam',
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE
        },
        {
          user_id: 7,
          username: 'long.hoang',
          avatar_url: '',
          password_hash: hashedPassword,
          full_name: 'Hoàng Long',
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE
        },
        {
          user_id: 8,
          username: 'baotran99',
          avatar_url: '',
          password_hash: hashedPassword,
          full_name: 'Trần Quốc Bảo',
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE
        },
        {
          user_id: 9,
          username: 'khoa_cyber',
          avatar_url: '',
          password_hash: hashedPassword,
          full_name: 'Lê Minh Khoa',
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE
        },
        {
          user_id: 10,
          username: 'linh.stream',
          avatar_url: '',
          password_hash: hashedPassword,
          full_name: 'Phạm Thùy Linh',
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE
        },
        {
          user_id: 11,
          username: 'dang.dh',
          avatar_url: '',
          password_hash: hashedPassword,
          full_name: 'Đỗ Hải Đăng',
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE
        }
      ], ['username', 'password_hash', 'full_name', 'role', 'status']);

      await safeSeed(db.Member, [
        {
          member_id: 2,
          phone: '+84 900 000 002',
          real_balance: 500000.00,
          bonus_balance: 50000.00,
          point: 100,
          rank_id: 3
        },
        {
          member_id: 3,
          phone: '+84 912 849 201',
          real_balance: 1250000.00,
          bonus_balance: 350000.00,
          point: 2850,
          rank_id: 3
        },
        {
          member_id: 4,
          phone: '+84 988 777 666',
          real_balance: 500000.00,
          bonus_balance: 100000.00,
          point: 1200,
          rank_id: 2
        },
        {
          member_id: 5,
          phone: '+84 977 111 222',
          real_balance: 3200000.00,
          bonus_balance: 800000.00,
          point: 4500,
          rank_id: 4
        },
        {
          member_id: 6,
          phone: '+84 933 444 555',
          real_balance: 150000.00,
          bonus_balance: 20000.00,
          point: 350,
          rank_id: 1
        },
        {
          member_id: 7,
          phone: '+84 905 666 777',
          real_balance: 850000.00,
          bonus_balance: 150000.00,
          point: 1800,
          rank_id: 3
        }
      ]);
    }

    // 2. Seed Pricing Plans
    await safeSeed(db.PricingPlan, [
      { pricing_plan_id: 1, name: 'Gói Tiêu Chuẩn', price_per_hour: 10000.00, plan_type: SessionType.LOCAL, priority: 1, is_active: true },
      { pricing_plan_id: 2, name: 'Gói VIP', price_per_hour: 15000.00, plan_type: SessionType.LOCAL, priority: 2, is_active: true },
      { pricing_plan_id: 3, name: 'Gói Streamer Pro', price_per_hour: 20000.00, plan_type: SessionType.LOCAL, priority: 3, is_active: true },
      { pricing_plan_id: 4, name: 'Gói Cloud vGPU Remote', price_per_hour: 25000.00, plan_type: SessionType.REMOTE, priority: 4, is_active: true }
    ]);

    // 3. Seed Service Categories & Game Categories
    await safeSeed(db.ServiceCategory, [
      { category_id: 1, name: 'Đồ Uống & Nước Giải Khát' },
      { category_id: 2, name: 'Đồ Ăn Nhanh & Ẩm Thực' },
      { category_id: 3, name: 'Thẻ Game & Dịch Vụ' }
    ]);

    await safeSeed(db.GameCategory, [
      { category_id: 1, name: 'Esports - Bắn Súng (FPS)' },
      { category_id: 2, name: 'Esports - MOBA' },
      { category_id: 3, name: 'AAA Trải Nghiệm & Nhập Vai' }
    ]);

    // 4. Seed Computer Zones
    await safeSeed(db.ComputerZone, [
      { zone_id: 1, zone_name: 'Zone 1: Esports Pro Arena', description: 'Máy thi đấu 360Hz BenQ ZOWIE, CPU i9 14900K, RTX 4080', tier_level: 2 },
      { zone_id: 2, zone_name: 'Zone 2: VIP Gaming Suite', description: 'Phòng VIP riêng biệt, ghế da cao cấp, RTX 4070 Ti Super', tier_level: 2 },
      { zone_id: 3, zone_name: 'Zone 3: Tiêu Chuẩn Combat', description: 'Khu vực phổ thông i5 14400F, RTX 4060, Màn 240Hz', tier_level: 1 },
      { zone_id: 4, zone_name: 'Zone 4: Stream Studio', description: 'Phòng Studio cách âm, Cam 4K, GoXLR, RTX 4090 24GB', tier_level: 3 },
      { zone_id: 5, zone_name: 'Zone 5: Cloud Remote Nodes', description: 'Cụm Cloud vGPU stream WebRTC 1.1ms AV1 Dual EPYC', tier_level: 4 }
    ], ['zone_name', 'description', 'tier_level']);

    // 4.5. Seed Hardware Profiles into MySQL CSDL
    if (db.HardwareProfile) {
      await safeSeed(
        db.HardwareProfile,
        [
          {
            profile_id: 1,
            profile_name: 'Dàn Thi Đấu Esports Pro',
            description: 'Cấu hình cao cấp thi đấu giải FPS, màn 240Hz Fast-IPS, i9 + RTX 4080 Super',
            cpu_model: 'Intel Core i9-14900K (24 Cores / 32 Threads @ 5.8GHz)',
            gpu_model: 'RTX 4080 Super 16GB (ASUS ROG Strix OC)',
            ram_capacity: '64GB DDR5 6000MHz CL30 (Kingston Beast)',
            storage_type: 'SAN NVMe 10Gbps (iSCSI Boot + 2TB Writeback RAM)',
            monitor: '25" Fast-IPS 240Hz (BenQ ZOWIE XL2546K)',
            gear: 'Chuột Logitech G Pro X Superlight + Phím Cơ Custom + Tai Cloud II',
            zone_id: 1
          },
          {
            profile_id: 2,
            profile_name: 'Dàn VIP Gaming Pro',
            description: 'Cấu hình VIP Pro phòng riêng biệt, i7 + RTX 4070 Ti Super',
            cpu_model: 'Intel Core i7-14700K (20 Cores / 28 Threads @ 5.6GHz)',
            gpu_model: 'RTX 4070 Ti Super 16GB (MSI Gaming X Slim)',
            ram_capacity: '32GB DDR5 6000MHz CL30 (Kingston Beast)',
            storage_type: 'High Throughput Cache 1TB SAN Boot',
            monitor: '27" 2K OLED 240Hz (ASUS ROG Swift PG27AQDM)',
            gear: 'Chuột Razer DeathAdder V3 + Phím Huntsman + Tai Kraken',
            zone_id: 2
          },
          {
            profile_id: 3,
            profile_name: 'Dàn Phổ Thông Standard',
            description: 'Cấu hình tiêu chuẩn phổ thông combat game online i5 + RTX 4060',
            cpu_model: 'Intel Core i5-13400F (10 Cores / 16 Threads @ 4.6GHz)',
            gpu_model: 'RTX 4060 8GB (Zotac Gaming Twin Edge)',
            ram_capacity: '32GB DDR4 3200MHz Dual Channel TeamGroup',
            storage_type: 'SAN NVMe 10Gbps (iSCSI Boot + 2TB Writeback RAM)',
            monitor: '24" Full HD 180Hz (ViewSonic Gaming)',
            gear: 'Bộ Peripherals Standard Cyber Gaming',
            zone_id: 3
          },
          {
            profile_id: 4,
            profile_name: 'Dàn Stream Studio Pro',
            description: 'Cụm máy Studio Livestream 4K, Ryzen 9 + RTX 4090 24GB',
            cpu_model: 'AMD Ryzen 9 7950X (16 Cores / 32 Threads @ 5.7GHz)',
            gpu_model: 'RTX 4090 24GB (Gigabyte AORUS Master)',
            ram_capacity: '64GB DDR5 6000MHz (G.Skill Trident Z5 Neo)',
            storage_type: 'Dual NVMe 2TB PCIe 4.0 Direct Capture',
            monitor: '25" 360Hz BenQ ZOWIE XL2566K',
            gear: 'Chuột Logitech G Pro X Superlight + Phím Cơ Custom + Tai Cloud II',
            zone_id: 4
          },
          {
            profile_id: 5,
            profile_name: 'Dàn Cloud Remote Nodes',
            description: 'Cụm máy Cloud vGPU WebRTC Hypervisor',
            cpu_model: 'AMD EPYC 7763 (64 Cores / 128 Threads Hypervisor)',
            gpu_model: 'RTX 4090 24GB (Gigabyte AORUS Master)',
            ram_capacity: '128GB ECC Reg Quad-Channel',
            storage_type: '40Gbps Fiber SAN (Direct RDMA Ultra-low Latency)',
            monitor: '25" Fast-IPS 240Hz (BenQ ZOWIE XL2546K)',
            gear: 'Bộ Peripherals Standard Cyber Gaming',
            zone_id: 5
          }
        ],
        ['profile_name', 'description', 'cpu_model', 'gpu_model', 'ram_capacity', 'storage_type', 'monitor', 'gear', 'zone_id']
      );
    }

    // 4.6. Seed Hardware Component Presets (CPUs, GPUs, RAMs, Storages, Monitors, Gears)
    if (db.HardwareComponent) {
      await safeSeed(
        db.HardwareComponent,
        [
          // CPU
          { component_id: 1, category: 'cpu', name: 'Intel Core i9-14900K (24 Cores / 32 Threads @ 5.8GHz)' },
          { component_id: 2, category: 'cpu', name: 'Intel Core i7-14700K (20 Cores / 28 Threads @ 5.6GHz)' },
          { component_id: 3, category: 'cpu', name: 'Intel Core i5-13400F (10 Cores / 16 Threads @ 4.6GHz)' },
          { component_id: 4, category: 'cpu', name: 'AMD Ryzen 9 7950X (16 Cores / 32 Threads @ 5.7GHz)' },
          { component_id: 5, category: 'cpu', name: 'AMD EPYC 7763 (64 Cores / 128 Threads Hypervisor)' },
          // GPU
          { component_id: 6, category: 'gpu', name: 'RTX 4090 24GB (Gigabyte AORUS Master)' },
          { component_id: 7, category: 'gpu', name: 'RTX 4080 Super 16GB (ASUS ROG Strix OC)' },
          { component_id: 8, category: 'gpu', name: 'RTX 4070 Ti Super 16GB (MSI Gaming X Slim)' },
          { component_id: 9, category: 'gpu', name: 'RTX 4060 8GB (Zotac Gaming Twin Edge)' },
          // RAM
          { component_id: 10, category: 'ram', name: '64GB DDR5 6000MHz CL30 (Kingston Beast)' },
          { component_id: 11, category: 'ram', name: '32GB DDR5 6000MHz CL30 (Kingston Beast)' },
          { component_id: 12, category: 'ram', name: '32GB DDR4 3200MHz Dual Channel TeamGroup' },
          { component_id: 13, category: 'ram', name: '128GB ECC Reg Quad-Channel Server' },
          // Storage
          { component_id: 14, category: 'storage', name: 'SAN NVMe 10Gbps (iSCSI Boot + 2TB Writeback RAM)' },
          { component_id: 15, category: 'storage', name: 'High Throughput Cache 1TB SAN Boot' },
          { component_id: 16, category: 'storage', name: 'Dual NVMe 2TB PCIe 4.0 Direct Capture' },
          { component_id: 17, category: 'storage', name: '40Gbps Fiber SAN (Direct RDMA Ultra-low Latency)' },
          // Monitor
          { component_id: 18, category: 'monitor', name: '25" Fast-IPS 240Hz (BenQ ZOWIE XL2546K)' },
          { component_id: 19, category: 'monitor', name: '27" 2K OLED 240Hz (ASUS ROG Swift PG27AQDM)' },
          { component_id: 20, category: 'monitor', name: '24" Full HD 180Hz (ViewSonic Gaming)' },
          { component_id: 21, category: 'monitor', name: '25" 360Hz BenQ ZOWIE XL2566K' },
          // Gear
          { component_id: 22, category: 'gear', name: 'Chuột Logitech G Pro X Superlight + Phím Cơ Custom + Tai Cloud II' },
          { component_id: 23, category: 'gear', name: 'Chuột Razer DeathAdder V3 + Phím Huntsman + Tai Kraken' },
          { component_id: 24, category: 'gear', name: 'Bộ Peripherals Standard Cyber Gaming' }
        ],
        ['category', 'name', 'is_active']
      );
    }

    // 6. Seed Computers (Rich set of 36 computers with MAC addresses & Hardware Profile mapping)
    await safeSeed(db.Computer, [
      // Zone 1: Esports Pro Arena (8 trạm)
      { computer_id: 1, computer_name: 'ESP-01', ip_address: '192.168.1.101', mac_address: 'F4:D4:88:5A:01:01', status: ComputerStatus.ONLINE, is_remote_enabled: true, zone_id: 1, hardware_profile_id: 1 },
      { computer_id: 2, computer_name: 'ESP-02', ip_address: '192.168.1.102', mac_address: 'F4:D4:88:5A:01:02', status: ComputerStatus.IN_USE, is_remote_enabled: true, zone_id: 1, hardware_profile_id: 1 },
      { computer_id: 3, computer_name: 'ESP-03', ip_address: '192.168.1.103', mac_address: 'F4:D4:88:5A:01:03', status: ComputerStatus.ONLINE, is_remote_enabled: true, zone_id: 1, hardware_profile_id: 1 },
      { computer_id: 4, computer_name: 'ESP-04', ip_address: '192.168.1.104', mac_address: 'F4:D4:88:5A:01:04', status: ComputerStatus.IN_USE, is_remote_enabled: true, zone_id: 1, hardware_profile_id: 1 },
      { computer_id: 5, computer_name: 'ESP-05', ip_address: '192.168.1.105', mac_address: 'F4:D4:88:5A:01:05', status: ComputerStatus.ONLINE, is_remote_enabled: true, zone_id: 1, hardware_profile_id: 1 },
      { computer_id: 6, computer_name: 'ESP-06', ip_address: '192.168.1.106', mac_address: 'F4:D4:88:5A:01:06', status: ComputerStatus.IN_USE, is_remote_enabled: true, zone_id: 1, hardware_profile_id: 1 },
      { computer_id: 7, computer_name: 'ESP-07', ip_address: '192.168.1.107', mac_address: 'F4:D4:88:5A:01:07', status: ComputerStatus.MAINTENANCE, is_remote_enabled: true, zone_id: 1, hardware_profile_id: 1 },
      { computer_id: 8, computer_name: 'ESP-08', ip_address: '192.168.1.108', mac_address: 'F4:D4:88:5A:01:08', status: ComputerStatus.ONLINE, is_remote_enabled: true, zone_id: 1, hardware_profile_id: 1 },

      // Zone 2: VIP Gaming Suite (8 trạm)
      { computer_id: 9, computer_name: 'VIP-01', ip_address: '192.168.1.201', mac_address: 'F4:D4:88:5A:02:01', status: ComputerStatus.ONLINE, is_remote_enabled: false, zone_id: 2, hardware_profile_id: 2 },
      { computer_id: 10, computer_name: 'VIP-02', ip_address: '192.168.1.202', mac_address: 'F4:D4:88:5A:02:02', status: ComputerStatus.IN_USE, is_remote_enabled: false, zone_id: 2, hardware_profile_id: 2 },
      { computer_id: 11, computer_name: 'VIP-03', ip_address: '192.168.1.203', mac_address: 'F4:D4:88:5A:02:03', status: ComputerStatus.LOCKED, is_remote_enabled: false, zone_id: 2, hardware_profile_id: 2 },
      { computer_id: 12, computer_name: 'VIP-04', ip_address: '192.168.1.204', mac_address: 'F4:D4:88:5A:02:04', status: ComputerStatus.IN_USE, is_remote_enabled: false, zone_id: 2, hardware_profile_id: 2 },
      { computer_id: 13, computer_name: 'VIP-05', ip_address: '192.168.1.205', mac_address: 'F4:D4:88:5A:02:05', status: ComputerStatus.ONLINE, is_remote_enabled: false, zone_id: 2, hardware_profile_id: 2 },
      { computer_id: 14, computer_name: 'VIP-06', ip_address: '192.168.1.206', mac_address: 'F4:D4:88:5A:02:06', status: ComputerStatus.IN_USE, is_remote_enabled: false, zone_id: 2, hardware_profile_id: 2 },
      { computer_id: 15, computer_name: 'VIP-07', ip_address: '192.168.1.207', mac_address: 'F4:D4:88:5A:02:07', status: ComputerStatus.ONLINE, is_remote_enabled: false, zone_id: 2, hardware_profile_id: 2 },
      { computer_id: 16, computer_name: 'VIP-08', ip_address: '192.168.1.208', mac_address: 'F4:D4:88:5A:02:08', status: ComputerStatus.OFFLINE, is_remote_enabled: false, zone_id: 2, hardware_profile_id: 2 },

      // Zone 3: Tiêu Chuẩn Combat (10 trạm)
      { computer_id: 17, computer_name: 'STD-01', ip_address: '192.168.1.301', mac_address: 'F4:D4:88:5A:03:01', status: ComputerStatus.OFFLINE, is_remote_enabled: false, zone_id: 3, hardware_profile_id: 3 },
      { computer_id: 18, computer_name: 'STD-02', ip_address: '192.168.1.302', mac_address: 'F4:D4:88:5A:03:02', status: ComputerStatus.ONLINE, is_remote_enabled: false, zone_id: 3, hardware_profile_id: 3 },
      { computer_id: 19, computer_name: 'STD-03', ip_address: '192.168.1.303', mac_address: 'F4:D4:88:5A:03:03', status: ComputerStatus.IN_USE, is_remote_enabled: false, zone_id: 3, hardware_profile_id: 3 },
      { computer_id: 20, computer_name: 'STD-04', ip_address: '192.168.1.304', mac_address: 'F4:D4:88:5A:03:04', status: ComputerStatus.ONLINE, is_remote_enabled: false, zone_id: 3, hardware_profile_id: 3 },
      { computer_id: 21, computer_name: 'STD-05', ip_address: '192.168.1.305', mac_address: 'F4:D4:88:5A:03:05', status: ComputerStatus.IN_USE, is_remote_enabled: false, zone_id: 3, hardware_profile_id: 3 },
      { computer_id: 22, computer_name: 'STD-06', ip_address: '192.168.1.306', mac_address: 'F4:D4:88:5A:03:06', status: ComputerStatus.MAINTENANCE, is_remote_enabled: false, zone_id: 3, hardware_profile_id: 3 },
      { computer_id: 23, computer_name: 'STD-07', ip_address: '192.168.1.307', mac_address: 'F4:D4:88:5A:03:07', status: ComputerStatus.OFFLINE, is_remote_enabled: false, zone_id: 3, hardware_profile_id: 3 },
      { computer_id: 24, computer_name: 'STD-08', ip_address: '192.168.1.308', mac_address: 'F4:D4:88:5A:03:08', status: ComputerStatus.ONLINE, is_remote_enabled: false, zone_id: 3, hardware_profile_id: 3 },
      { computer_id: 25, computer_name: 'STD-09', ip_address: '192.168.1.309', mac_address: 'F4:D4:88:5A:03:09', status: ComputerStatus.IN_USE, is_remote_enabled: false, zone_id: 3, hardware_profile_id: 3 },
      { computer_id: 26, computer_name: 'STD-10', ip_address: '192.168.1.310', mac_address: 'F4:D4:88:5A:03:10', status: ComputerStatus.ONLINE, is_remote_enabled: false, zone_id: 3, hardware_profile_id: 3 },

      // Zone 4: Stream Studio (4 trạm)
      { computer_id: 27, computer_name: 'STR-01', ip_address: '192.168.1.401', mac_address: 'F4:D4:88:5A:04:01', status: ComputerStatus.IN_USE, is_remote_enabled: true, zone_id: 4, hardware_profile_id: 4 },
      { computer_id: 28, computer_name: 'STR-02', ip_address: '192.168.1.402', mac_address: 'F4:D4:88:5A:04:02', status: ComputerStatus.ONLINE, is_remote_enabled: true, zone_id: 4, hardware_profile_id: 4 },
      { computer_id: 29, computer_name: 'STR-03', ip_address: '192.168.1.403', mac_address: 'F4:D4:88:5A:04:03', status: ComputerStatus.IN_USE, is_remote_enabled: true, zone_id: 4, hardware_profile_id: 4 },
      { computer_id: 30, computer_name: 'STR-04', ip_address: '192.168.1.404', mac_address: 'F4:D4:88:5A:04:04', status: ComputerStatus.ONLINE, is_remote_enabled: true, zone_id: 4, hardware_profile_id: 4 },

      // Zone 5: Cloud Remote Nodes (6 trạm)
      { computer_id: 31, computer_name: 'CLOUD-01', ip_address: '192.168.1.501', mac_address: 'F4:D4:88:5A:05:01', status: ComputerStatus.ONLINE, is_remote_enabled: true, zone_id: 5, hardware_profile_id: 5 },
      { computer_id: 32, computer_name: 'CLOUD-02', ip_address: '192.168.1.502', mac_address: 'F4:D4:88:5A:05:02', status: ComputerStatus.IN_USE, is_remote_enabled: true, zone_id: 5, hardware_profile_id: 5 },
      { computer_id: 33, computer_name: 'CLOUD-03', ip_address: '192.168.1.503', mac_address: 'F4:D4:88:5A:05:03', status: ComputerStatus.ONLINE, is_remote_enabled: true, zone_id: 5, hardware_profile_id: 5 },
      { computer_id: 34, computer_name: 'CLOUD-04', ip_address: '192.168.1.504', mac_address: 'F4:D4:88:5A:05:04', status: ComputerStatus.IN_USE, is_remote_enabled: true, zone_id: 5, hardware_profile_id: 5 },
      { computer_id: 35, computer_name: 'CLOUD-05', ip_address: '192.168.1.505', mac_address: 'F4:D4:88:5A:05:05', status: ComputerStatus.REMOTE, is_remote_enabled: true, zone_id: 5, hardware_profile_id: 5 },
      { computer_id: 36, computer_name: 'CLOUD-06', ip_address: '192.168.1.506', mac_address: 'F4:D4:88:5A:05:06', status: ComputerStatus.ONLINE, is_remote_enabled: true, zone_id: 5, hardware_profile_id: 5 }
    ]);

    // Seed Status Logs for active machines
    await safeSeed(db.ComputerStatusLog, [
      { computer_id: 2, member_id: 3, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 45 * 60 * 1000), notes: 'Valorant Ranked' },
      { computer_id: 4, member_id: 4, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 120 * 60 * 1000), notes: 'Counter-Strike 2' },
      { computer_id: 6, member_id: 5, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 35 * 60 * 1000), notes: 'League of Legends' },
      { computer_id: 10, member_id: 6, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 90 * 60 * 1000), notes: 'FC Online 4' },
      { computer_id: 12, member_id: 7, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 50 * 60 * 1000), notes: 'Cyberpunk 2077 RT' },
      { computer_id: 14, member_id: 3, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 15 * 60 * 1000), notes: 'Dota 2 Ranked' },
      { computer_id: 19, member_id: 4, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 75 * 60 * 1000), notes: 'Grand Theft Auto V' },
      { computer_id: 21, member_id: 6, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 110 * 60 * 1000), notes: 'Apex Legends' },
      { computer_id: 25, member_id: 7, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 40 * 60 * 1000), notes: 'PUBG Battlegrounds' },
      { computer_id: 27, member_id: 5, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 180 * 60 * 1000), notes: 'OBS 4K Stream • Cyberpunk 2077 RT' },
      { computer_id: 29, member_id: 4, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 65 * 60 * 1000), notes: 'VTuber Live Stream' },
      { computer_id: 32, member_id: 3, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 25 * 60 * 1000), notes: 'Cloud Stream WebRTC' },
      { computer_id: 34, member_id: 6, status: ComputerStatus.IN_USE, session_type: SessionType.MEMBER, start_time: new Date(Date.now() - 85 * 60 * 1000), notes: 'Elden Ring Shadow of Erdtree' }
    ]);

    // 6.5. Seed Game Categories
    if (db.GameCategory) {
      await safeSeed(db.GameCategory, [
        { category_id: 1, name: 'Esports - Bắn Súng (FPS)' },
        { category_id: 2, name: 'Esports - MOBA' },
        { category_id: 3, name: 'AAA Trải Nghiệm & Nhập Vai' }
      ], ['name']);
    }

    // 7. Seed Games
    await safeSeed(db.Game, [
      { game_id: 1, name: 'Valorant', category_id: 1, cover_image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Riot Games\\VALORANT\\live\\VALORANT.exe', is_remote_supported: true, is_available: true },
      { game_id: 2, name: 'Counter-Strike 2', category_id: 1, cover_image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\bin\\win64\\cs2.exe', is_remote_supported: true, is_available: true },
      { game_id: 3, name: 'League of Legends', category_id: 2, cover_image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Riot Games\\League of Legends\\LeagueClient.exe', is_remote_supported: true, is_available: true },
      { game_id: 4, name: 'FC Online 4', category_id: 2, cover_image_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Garena\\FCO\\FCO.exe', is_remote_supported: false, is_available: true },
      { game_id: 5, name: 'Cyberpunk 2077 RT', category_id: 3, cover_image_url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Steam\\steamapps\\common\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe', is_remote_supported: true, is_available: true },
      { game_id: 6, name: 'Grand Theft Auto V', category_id: 3, cover_image_url: 'https://images.unsplash.com/photo-1552824722-ddab1374e622?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Rockstar Games\\Grand Theft Auto V\\GTA5.exe', is_remote_supported: true, is_available: true },
      { game_id: 7, name: 'Apex Legends', category_id: 1, cover_image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Steam\\steamapps\\common\\Apex Legends\\r5apex.exe', is_remote_supported: true, is_available: true },
      { game_id: 8, name: 'Black Myth: Wukong', category_id: 3, cover_image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Steam\\steamapps\\common\\BlackMythWukong\\b1\\Binaries\\Win64\\b1-Win64-Shipping.exe', is_remote_supported: true, is_available: true },
      { game_id: 9, name: 'Dota 2', category_id: 2, cover_image_url: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Steam\\steamapps\\common\\dota 2 beta\\game\\bin\\win64\\dota2.exe', is_remote_supported: true, is_available: true },
      { game_id: 10, name: 'PUBG: BATTLEGROUNDS', category_id: 1, cover_image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Steam\\steamapps\\common\\PUBG\\TslGame\\Binaries\\Win64\\TslGame.exe', is_remote_supported: false, is_available: true },
      { game_id: 11, name: 'Elden Ring', category_id: 3, cover_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Steam\\steamapps\\common\\ELDEN RING\\Game\\eldenring.exe', is_remote_supported: true, is_available: true },
      { game_id: 12, name: 'Naraka: Bladepoint', category_id: 3, cover_image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80', executable_path: 'D:\\Games\\Steam\\steamapps\\common\\NARAKA BLADEPOINT\\NarakaBladepoint.exe', is_remote_supported: true, is_available: false }
    ], ['name', 'category_id', 'cover_image_url', 'executable_path', 'is_remote_supported', 'is_available']);

    // 7.1 Seed ComputerGame (Gán game vào trạm máy trên phân khu)
    if (db.ComputerGame) {
      const computerGameMappings = [];
      // Phổ biến Esports (Game 1, 2, 3, 9) cài trên toàn bộ 36 máy
      for (let c = 1; c <= 36; c++) {
        computerGameMappings.push({ computer_id: c, game_id: 1 });
        computerGameMappings.push({ computer_id: c, game_id: 2 });
        computerGameMappings.push({ computer_id: c, game_id: 3 });
        computerGameMappings.push({ computer_id: c, game_id: 9 });
      }
      // AAA Games (Game 5, 6, 8, 11) cài trên Zone 1 (ESP 1-8), Zone 2 (VIP 9-16), Zone 4 (Stream 27-30), Zone 5 (Cloud 31-36)
      const highEndComputers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];
      for (const compId of highEndComputers) {
        computerGameMappings.push({ computer_id: compId, game_id: 5 });
        computerGameMappings.push({ computer_id: compId, game_id: 6 });
        computerGameMappings.push({ computer_id: compId, game_id: 8 });
        computerGameMappings.push({ computer_id: compId, game_id: 11 });
      }
      // Game 4, 7, 10, 12 trên các trạm còn lại
      for (let c = 1; c <= 26; c++) {
        computerGameMappings.push({ computer_id: c, game_id: 4 });
        computerGameMappings.push({ computer_id: c, game_id: 7 });
        computerGameMappings.push({ computer_id: c, game_id: 10 });
        computerGameMappings.push({ computer_id: c, game_id: 12 });
      }
      await safeSeed(db.ComputerGame, computerGameMappings);
    }

    // 8. Seed Service Items
    await safeSeed(db.ServiceItem, [
      { service_item_id: 1, name: 'Mì Trứng Bò Hầm ProGamer', price: 35000.00, stock_quantity: 50, is_available: true, category_id: 2 },
      { service_item_id: 2, name: 'Sting Dâu Ướp Lạnh', price: 15000.00, stock_quantity: 100, is_available: true, category_id: 1 },
      { service_item_id: 3, name: 'Cà Phê Muối Cháy Đêm', price: 25000.00, stock_quantity: 40, is_available: true, category_id: 1 },
      { service_item_id: 4, name: 'Combo Đêm 6 TIẾNG + Sting', price: 65000.00, stock_quantity: 999, is_available: true, category_id: 2 }
    ]);

    // 9. Seed Combo Packages
    await safeSeed(db.ComboPackage, [
      { combo_id: 1, name: 'Combo Đêm Xuyên Màn Đêm', description: 'Gói xuyên đêm 6 tiếng dành cho cú đêm chiến game thả ga', price: 50000.00, duration_minutes: 360, allowed_tier: 1, is_active: true },
      { combo_id: 2, name: 'Combo Chiến Game 3H + Nước', description: 'Gói 3 tiếng chơi game kèm 1 phần nước Sting dâu mát lạnh', price: 40000.00, duration_minutes: 180, allowed_tier: 1, is_active: true }
    ]);

    // 9.1 Seed Combo Items (Dịch vụ đi kèm thực tế: Combo 2 kèm 1x Sting Dâu Ướp Lạnh)
    if (db.ComboItem) {
      await safeSeed(db.ComboItem, [
        { combo_id: 2, service_item_id: 2, quantity: 1 }
      ]);
    }

    // 10. Seed Hardware Components Catalog directly into MySQL CSDL
    if (db.HardwareComponent) {
      await safeSeed(db.HardwareComponent, [
        // CPUs
        { component_id: 1, category: 'cpu', name: 'Intel Core i9-14900K (24 Cores / 32 Threads @ 5.8GHz)' },
        { component_id: 2, category: 'cpu', name: 'Intel Core i7-14700K (20 Cores / 28 Threads @ 5.6GHz)' },
        { component_id: 3, category: 'cpu', name: 'Intel Core i5-13400F (10 Cores / 16 Threads @ 4.6GHz)' },
        { component_id: 4, category: 'cpu', name: 'AMD Ryzen 7 7800X3D (8 Cores / 16 Threads @ 5.0GHz)' },
        { component_id: 5, category: 'cpu', name: 'AMD Ryzen 9 7950X (16 Cores / 32 Threads @ 5.7GHz)' },
        { component_id: 6, category: 'cpu', name: 'AMD EPYC 7763 (64 Cores / 128 Threads Hypervisor)' },

        // GPUs
        { component_id: 7, category: 'gpu', name: 'RTX 4090 24GB (Gigabyte AORUS Master)' },
        { component_id: 8, category: 'gpu', name: 'RTX 4080 Super 16GB (ASUS ROG Strix OC)' },
        { component_id: 9, category: 'gpu', name: 'RTX 4070 Ti Super 16GB (MSI Gaming X Slim)' },
        { component_id: 10, category: 'gpu', name: 'RTX 4060 8GB (Zotac Gaming Twin Edge)' },
        { component_id: 11, category: 'gpu', name: 'RTX 3060 12GB Dual Fan' },

        // RAMs
        { component_id: 12, category: 'ram', name: '32GB DDR5 6000MHz CL30 (Kingston Beast)' },
        { component_id: 13, category: 'ram', name: '64GB DDR5 6000MHz (G.Skill Trident Z5 Neo)' },
        { component_id: 14, category: 'ram', name: '32GB DDR4 3200MHz Dual Channel TeamGroup' },
        { component_id: 15, category: 'ram', name: '128GB ECC Reg Quad-Channel' },

        // Storages
        { component_id: 16, category: 'storage', name: 'SAN NVMe 10Gbps (iSCSI Boot + 2TB Writeback RAM)' },
        { component_id: 17, category: 'storage', name: 'High Throughput Cache 1TB SAN Boot' },
        { component_id: 18, category: 'storage', name: 'Dual NVMe 2TB PCIe 4.0 Direct Capture' },
        { component_id: 19, category: 'storage', name: '40Gbps Fiber SAN (Direct RDMA Ultra-low Latency)' },

        // Monitors
        { component_id: 20, category: 'monitor', name: '25" Fast-IPS 240Hz (BenQ ZOWIE XL2546K)' },
        { component_id: 21, category: 'monitor', name: '27" 2K OLED 240Hz (ASUS ROG Swift PG27AQDM)' },
        { component_id: 22, category: 'monitor', name: '24" Full HD 180Hz (ViewSonic Gaming)' },
        { component_id: 23, category: 'monitor', name: '25" 360Hz BenQ ZOWIE XL2566K' },

        // Gears
        { component_id: 24, category: 'gear', name: 'Chuột Logitech G Pro X Superlight + Phím Cơ Custom + Tai Cloud II' },
        { component_id: 25, category: 'gear', name: 'Chuột Razer DeathAdder V3 + Phím Huntsman + Tai Kraken' },
        { component_id: 26, category: 'gear', name: 'Bộ Peripherals Standard Cyber Gaming' }
      ]);
    }
    // Seed Pricing Plans & Zone Associations (Bảng giá máy & Giờ vàng)
    if (db.PricingPlan) {
      await safeSeed(db.PricingPlan, [
        {
          pricing_plan_id: 1,
          name: 'Giá Tiêu Chuẩn Tại Quán',
          price_per_hour: 10000.00,
          plan_type: SessionType.LOCAL,
          priority: 0,
          start_time: null,
          end_time: null,
          apply_date: null,
          is_active: true
        },
        {
          pricing_plan_id: 2,
          name: 'Giờ Vàng Buổi Chiều',
          price_per_hour: 6000.00,
          plan_type: SessionType.LOCAL,
          priority: 10,
          start_time: '13:00:00',
          end_time: '17:00:00',
          apply_date: null,
          is_active: true
        },
        {
          pricing_plan_id: 3,
          name: 'Gói Chơi Xuyên Đêm',
          price_per_hour: 4000.00,
          plan_type: SessionType.LOCAL,
          priority: 20,
          start_time: '23:00:00',
          end_time: '06:00:00',
          apply_date: null,
          is_active: true
        },
        {
          pricing_plan_id: 4,
          name: 'Giá Tiêu Chuẩn Từ Xa',
          price_per_hour: 15000.00,
          plan_type: SessionType.REMOTE,
          priority: 0,
          start_time: null,
          end_time: null,
          apply_date: null,
          is_active: true
        },
        {
          pricing_plan_id: 5,
          name: 'Ưu Đãi Ngày Cuối Tuần',
          price_per_hour: 8000.00,
          plan_type: SessionType.LOCAL,
          priority: 5,
          start_time: null,
          end_time: null,
          apply_date: '2026-10-18',
          is_active: true
        }
      ], ['name', 'price_per_hour', 'plan_type', 'priority', 'start_time', 'end_time', 'apply_date', 'is_active']);
    }

    if (db.ZonePricingPlan) {
      await safeSeed(db.ZonePricingPlan, [
        { zone_id: 1, pricing_plan_id: 1 },
        { zone_id: 2, pricing_plan_id: 1 },
        { zone_id: 3, pricing_plan_id: 1 },
        { zone_id: 4, pricing_plan_id: 1 },
        { zone_id: 5, pricing_plan_id: 1 },
        { zone_id: 1, pricing_plan_id: 2 },
        { zone_id: 2, pricing_plan_id: 2 },
        { zone_id: 3, pricing_plan_id: 2 },
        { zone_id: 1, pricing_plan_id: 3 },
        { zone_id: 2, pricing_plan_id: 3 },
        { zone_id: 3, pricing_plan_id: 3 },
        { zone_id: 1, pricing_plan_id: 4 },
        { zone_id: 2, pricing_plan_id: 4 },
        { zone_id: 3, pricing_plan_id: 4 },
        { zone_id: 4, pricing_plan_id: 4 },
        { zone_id: 5, pricing_plan_id: 4 },
        { zone_id: 2, pricing_plan_id: 5 },
        { zone_id: 3, pricing_plan_id: 5 }
      ]);
    }

    // 10. Seed dữ liệu mẫu cho Sổ Cái Giao Dịch & 4 thẻ KPI Tài Chính (Đảm bảo có giao dịch hôm nay và hôm qua)
    if (db.FinancialTransaction) {
      const { Op } = require('sequelize');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayCount = await db.FinancialTransaction.count({
        where: { created_at: { [Op.gte]: todayStart } }
      });

      if (todayCount === 0) {
        const now = new Date();
        const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000);
        const daysAgo = (d, h = 0) => new Date(now.getTime() - (d * 24 + h) * 3600 * 1000);

        await db.FinancialTransaction.bulkCreate([
          // Giao dịch hôm nay (Today)
          {
            txn_code: 'TXN-00001',
            type: TransactionType.INCOME,
            category: TransactionCategory.MEMBER_TOPUP,
            amount: 100000.00,
            payment_method: 'CASH',
            status: 'COMPLETED',
            description: 'Nạp tiền giờ chơi tại quầy thu ngân',
            computer_name: 'VIP-01',
            staff_name: 'Quản Trị Viên',
            used_by: 2,
            processed_by: 1,
            created_at: hoursAgo(2)
          },
          {
            txn_code: 'SEPAY-1729012345',
            type: TransactionType.INCOME,
            category: TransactionCategory.MEMBER_TOPUP,
            amount: 50000.00,
            payment_method: 'VIETQR',
            status: 'COMPLETED',
            description: '[SePay Auto Topup] Tự động nạp qua VietQR cho hội viên #3',
            computer_name: 'VIP-02',
            staff_name: 'Hệ thống SePay',
            used_by: 3,
            processed_by: null,
            created_at: hoursAgo(3)
          },
          {
            txn_code: 'TXN-00003',
            type: TransactionType.INCOME,
            category: TransactionCategory.SERVICE_SALE,
            amount: 45000.00,
            payment_method: 'CASH',
            status: 'COMPLETED',
            description: '1x Mì xào bò trứng + 1x Nước ngọt Sting dâu',
            computer_name: 'VIP-01',
            staff_name: 'Quản Trị Viên',
            used_by: 2,
            processed_by: 1,
            created_at: hoursAgo(1)
          },
          {
            txn_code: 'TXN-00004',
            type: TransactionType.INCOME,
            category: TransactionCategory.COMBO_PURCHASE,
            amount: 120000.00,
            payment_method: 'VIETQR',
            status: 'COMPLETED',
            description: 'Combo Đêm Hoàng Kim (6h chơi + Bò Húc + Mì cay)',
            computer_name: 'STREAM-01',
            staff_name: 'Quản Trị Viên',
            used_by: 4,
            processed_by: 1,
            created_at: hoursAgo(4)
          },
          {
            txn_code: 'TXN-00005',
            type: TransactionType.INCOME,
            category: TransactionCategory.MEMBER_TOPUP,
            amount: 200000.00,
            payment_method: 'CASH',
            status: 'COMPLETED',
            description: 'Nạp tài khoản hội viên thân thiết VIP',
            computer_name: 'FPS-05',
            staff_name: 'Quản Trị Viên',
            used_by: 3,
            processed_by: 1,
            created_at: hoursAgo(0.5)
          },
          {
            txn_code: 'TXN-00006',
            type: TransactionType.INCOME,
            category: TransactionCategory.MEMBER_TOPUP,
            amount: 50000.00,
            payment_method: 'VIETQR',
            status: 'PENDING',
            description: 'Chờ đối soát SePay biến động số dư ngân hàng',
            computer_name: '—',
            staff_name: 'Hệ thống SePay',
            used_by: 4,
            processed_by: null,
            created_at: hoursAgo(0.2)
          },
          // Giao dịch hôm qua (Yesterday - để tính tỷ lệ tăng trưởng doanh thu thực tế)
          {
            txn_code: 'TXN-00007',
            type: TransactionType.INCOME,
            category: TransactionCategory.MEMBER_TOPUP,
            amount: 200000.00,
            payment_method: 'CASH',
            status: 'COMPLETED',
            description: 'Nạp tiền giờ chơi tại quầy',
            computer_name: 'VIP-03',
            staff_name: 'Quản Trị Viên',
            used_by: 2,
            processed_by: 1,
            created_at: daysAgo(1, 4)
          },
          {
            txn_code: 'TXN-00008',
            type: TransactionType.INCOME,
            category: TransactionCategory.SERVICE_SALE,
            amount: 60000.00,
            payment_method: 'CASH',
            status: 'COMPLETED',
            description: '2x Cơm gà xối mỡ giòn cay',
            computer_name: 'FPS-02',
            staff_name: 'Quản Trị Viên',
            used_by: 3,
            processed_by: 1,
            created_at: daysAgo(1, 6)
          },
          {
            txn_code: 'TXN-00009',
            type: TransactionType.INCOME,
            category: TransactionCategory.MEMBER_TOPUP,
            amount: 150000.00,
            payment_method: 'VIETQR',
            status: 'COMPLETED',
            description: 'Nạp tiền tài khoản hội viên qua QR',
            computer_name: 'STREAM-02',
            staff_name: 'Hệ thống SePay',
            used_by: 4,
            processed_by: null,
            created_at: daysAgo(1, 8)
          },
          // Giao dịch các ngày trước (3 - 6 ngày trước)
          {
            txn_code: 'TXN-00010',
            type: TransactionType.INCOME,
            category: TransactionCategory.MEMBER_TOPUP,
            amount: 100000.00,
            payment_method: 'CASH',
            status: 'COMPLETED',
            description: 'Nạp tiền giờ chơi cuối tuần',
            computer_name: 'VIP-01',
            staff_name: 'Quản Trị Viên',
            used_by: 2,
            processed_by: 1,
            created_at: daysAgo(3, 2)
          },
          {
            txn_code: 'TXN-00011',
            type: TransactionType.INCOME,
            category: TransactionCategory.MEMBER_TOPUP,
            amount: 50000.00,
            payment_method: 'CASH',
            status: 'REFUNDED',
            description: 'Khách nạp nhầm số tài khoản bạn bè',
            notes: 'Lý do hoàn: Thu ngân hoàn tiền mặt tại quầy',
            computer_name: 'VIP-02',
            staff_name: 'Quản Trị Viên',
            used_by: 3,
            processed_by: 1,
            created_at: daysAgo(4, 5)
          },
          {
            txn_code: 'TXN-00012',
            type: TransactionType.INCOME,
            category: TransactionCategory.SERVICE_SALE,
            amount: 85000.00,
            payment_method: 'VIETQR',
            status: 'COMPLETED',
            description: 'Combo trà đào cam sả + Bắp rang bơ',
            computer_name: 'COUPLE-01',
            staff_name: 'Quản Trị Viên',
            used_by: 2,
            processed_by: 1,
            created_at: daysAgo(6, 3)
          }
        ]);


      // 11. Giả lập Mua đồ ăn F&B và Thanh toán hỗn hợp
        if (db.ServiceOrder && db.ServiceOrderItem) {
          const orderCount = await db.ServiceOrder.count();
          if (orderCount === 0) {
            // A. Tạo 1 Đơn hàng mẫu
            await db.ServiceOrder.create({
              order_id: 101, // ID cứng để dễ tham chiếu
              status: 'COMPLETED',
              payment_status: 'PAID',
              used_by: 2, // Hội viên có member_id = 2
              processed_by: 1, // Nhân viên thu ngân
              created_at: hoursAgo(2)
            });

            // B. Thêm 2 món ăn vào đơn 101 (Tổng tiền = 85.000đ)
            await db.ServiceOrderItem.bulkCreate([
              { order_id: 101, service_item_id: 1, item_name: 'Mì Trứng Bò Hầm ProGamer', price: 35000, quantity: 2 }, // 70.000
              { order_id: 101, service_item_id: 2, item_name: 'Sting Dâu Ướp Lạnh', price: 15000, quantity: 1 } // 15.000
            ]);

            // C. Giả lập Thanh toán cho đơn 101 (Trả 50k bằng VÍ, 35k bằng TIỀN MẶT)
            await db.FinancialTransaction.bulkCreate([
              {
                txn_code: 'TXN-SPLIT-01',
                type: TransactionType.EXPENSE, // Tiền ví bị trừ
                category: TransactionCategory.SERVICE_SALE,
                amount: 50000.00,
                payment_method: 'WALLET', // Trừ bằng ví hội viên
                status: 'COMPLETED',
                description: 'Thanh toán đơn F&B #101 bằng số dư ví',
                used_by: 2,
                order_id: 101, // Liên kết với đơn hàng
                created_at: hoursAgo(2)
              },
              {
                txn_code: 'TXN-SPLIT-02',
                type: TransactionType.INCOME, // Tiền mặt thu thêm vào két
                category: TransactionCategory.SERVICE_SALE,
                amount: 35000.00,
                payment_method: 'CASH', // Thu thêm tiền mặt
                status: 'COMPLETED',
                description: 'Thu thêm tiền mặt cho đơn F&B #101',
                used_by: 2,
                order_id: 101, // Liên kết với đơn hàng
                created_at: hoursAgo(2)
              }
            ]);
            console.log('✅ Seeded 1 sample F&B Order with Split Payment (WALLET + CASH).');
          }
        }

        console.log('✅ Seeded 12 sample Financial Transactions for Sổ Cái & KPI.');
      }
    }

    console.log('✅ Database Seeding Completed Successfully.');
  } catch (error) {
    console.error('❌ Database Seeding Error:', error);
  }
};

module.exports = seedData;
