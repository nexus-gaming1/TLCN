CREATE DATABASE IF NOT EXISTS game_center_db;
USE game_center_db;

-- ==========================================
-- 1. CÁC BẢNG DANH MỤC, CẤU HÌNH & ĐỘC LẬP
-- ==========================================

CREATE TABLE membership_rank (
    rank_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    required_point INT NOT NULL DEFAULT 0,
    rank_level INT NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00
);

CREATE TABLE pricing_plan (
    pricing_plan_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_per_hour DECIMAL(10, 2) NOT NULL,
    plan_type ENUM('LOCAL', 'REMOTE') NOT NULL,
    priority INT DEFAULT 0,
    start_time TIME,
    end_time TIME,
    apply_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE computer_zone (
    zone_id INT AUTO_INCREMENT PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    description TEXT,
    tier_level INT DEFAULT 1
);

CREATE TABLE zone_pricing_plan (
    zone_id INT NOT NULL,
    pricing_plan_id INT NOT NULL,
    PRIMARY KEY (zone_id, pricing_plan_id),
    FOREIGN KEY (zone_id) REFERENCES computer_zone(zone_id) ON DELETE CASCADE,
    FOREIGN KEY (pricing_plan_id) REFERENCES pricing_plan(pricing_plan_id) ON DELETE CASCADE
);

CREATE TABLE service_category (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE game_category (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE promotions (
    promotion_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    discount_type VARCHAR(50) NOT NULL DEFAULT 'PERCENTAGE',
    discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    max_discount_amount DECIMAL(10, 2),
    min_deposit_amount DECIMAL(10, 2),
    start_date DATE,
    end_date DATE,
    schedule_note VARCHAR(100),
    target_audience VARCHAR(50) NOT NULL DEFAULT 'ALL',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    budget_spent DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_budget DECIMAL(12, 2) NOT NULL DEFAULT 60000000.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE hardware_component (
    component_id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- cpu, gpu, ram, storage, monitor, gear
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 2. QUẢN LÝ NGƯỜI DÙNG & LIÊN KẾT KHUYẾN MÃI
-- ==========================================

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, 
    full_name VARCHAR(100) NOT NULL,
    role ENUM('ADMIN', 'EMPLOYEE', 'MEMBER') NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'LOCKED', 'BANNED') DEFAULT 'ACTIVE'
);

CREATE TABLE members (
    member_id INT PRIMARY KEY,
    id_number VARCHAR(50),
    phone VARCHAR(20),
    real_balance DECIMAL(15, 2) DEFAULT 0.00,
    bonus_balance DECIMAL(15, 2) DEFAULT 0.00,
    point INT DEFAULT 0,
    rank_id INT,
    FOREIGN KEY (member_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (rank_id) REFERENCES membership_rank(rank_id) ON DELETE SET NULL
);

-- Bảng theo dõi việc giới hạn sử dụng mã của người dùng
CREATE TABLE member_promotion (
    member_id INT NOT NULL,
    promotion_id INT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at DATETIME NULL,
    PRIMARY KEY (member_id, promotion_id),
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE CASCADE
);

-- ==========================================
-- 3. QUẢN LÝ MÁY TÍNH & PHẦN CỨNG
-- ==========================================

-- Cấu hình phần cứng (Đã xóa các cột text tĩnh)
CREATE TABLE hardware_profile (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    profile_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    zone_id INT,
    FOREIGN KEY (zone_id) REFERENCES computer_zone(zone_id) ON DELETE SET NULL
);

-- Bảng trung gian Cấu hình & Linh kiện (N-N)
CREATE TABLE profile_component (
    profile_id INT NOT NULL,
    component_id INT NOT NULL,
    quantity INT DEFAULT 1, -- Số lượng linh kiện (vd: 2 thanh RAM)
    PRIMARY KEY (profile_id, component_id),
    FOREIGN KEY (profile_id) REFERENCES hardware_profile(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES hardware_component(component_id) ON DELETE CASCADE
);

CREATE TABLE computer (
    computer_id INT AUTO_INCREMENT PRIMARY KEY,
    computer_name VARCHAR(50) NOT NULL UNIQUE,
    ip_address VARCHAR(50),
    status ENUM('ONLINE', 'OFFLINE', 'IN_USE', 'LOCKED', 'MAINTENANCE', 'PAUSE') DEFAULT 'OFFLINE',
    is_remote_enabled BOOLEAN DEFAULT FALSE,
    zone_id INT NOT NULL,
    hardware_profile_id INT,
    FOREIGN KEY (zone_id) REFERENCES computer_zone(zone_id),
    FOREIGN KEY (hardware_profile_id) REFERENCES hardware_profile(profile_id) ON DELETE SET NULL
);

CREATE TABLE computer_status_log (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    computer_id INT NOT NULL,
    member_id INT, 
    status ENUM('ONLINE', 'OFFLINE', 'IN_USE', 'LOCKED', 'MAINTENANCE', 'PAUSE') NOT NULL,
    session_type ENUM('LOCAL', 'REMOTE'), 
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (computer_id) REFERENCES computer(computer_id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE SET NULL
);

-- ==========================================
-- 4. QUẢN LÝ GAME, DỊCH VỤ & COMBO
-- ==========================================

CREATE TABLE game (
    game_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cover_image_url VARCHAR(255),
    executable_path VARCHAR(255),
    is_remote_supported BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    category_id INT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES game_category(category_id)
);

CREATE TABLE computer_game (
    computer_id INT NOT NULL,
    game_id INT NOT NULL,
    PRIMARY KEY (computer_id, game_id),
    FOREIGN KEY (computer_id) REFERENCES computer(computer_id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES game(game_id) ON DELETE CASCADE
);

CREATE TABLE service_item (
    service_item_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    min_discount_rank INT,
    category_id INT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES service_category(category_id),
    FOREIGN KEY (min_discount_rank) REFERENCES membership_rank(rank_id) ON DELETE SET NULL
);

CREATE TABLE combo_package (
    combo_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INT NOT NULL,
    start_time_limit TIME,
    end_time_limit TIME,
    allowed_tier INT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE combo_item (
    combo_item_id INT AUTO_INCREMENT PRIMARY KEY,
    combo_id INT NOT NULL,
    service_item_id INT NOT NULL,
    quantity INT DEFAULT 1,
    FOREIGN KEY (combo_id) REFERENCES combo_package(combo_id) ON DELETE CASCADE,
    FOREIGN KEY (service_item_id) REFERENCES service_item(service_item_id) ON DELETE CASCADE
);

-- ==========================================
-- 5. ĐƠN HÀNG, GIAO DỊCH & THỜI GIAN CHƠI
-- ==========================================

CREATE TABLE service_order (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('PENDING', 'PREPARING', 'DELIVERED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    payment_status ENUM('PAID', 'UNPAID') DEFAULT 'UNPAID',
    used_by INT NOT NULL,
    processed_by INT,
    promotion_id INT NULL, -- FK Liên kết khuyến mãi
    FOREIGN KEY (used_by) REFERENCES members(member_id),
    FOREIGN KEY (processed_by) REFERENCES users(user_id),
    FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE SET NULL
);

CREATE TABLE service_order_item (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    service_item_id INT NOT NULL,
    quantity INT NOT NULL,
    item_name VARCHAR(100) NOT NULL, 
    price DECIMAL(10, 2) NOT NULL,   
    FOREIGN KEY (order_id) REFERENCES service_order(order_id) ON DELETE CASCADE,
    FOREIGN KEY (service_item_id) REFERENCES service_item(service_item_id)
);

CREATE TABLE combo_time (
    combo_time_id INT AUTO_INCREMENT PRIMARY KEY,
    start_time DATETIME,
    end_time DATETIME,
    status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') DEFAULT 'ACTIVE',
    allowed_tier INT,
    order_id INT UNIQUE NOT NULL, 
    FOREIGN KEY (order_id) REFERENCES service_order(order_id) ON DELETE CASCADE
);

CREATE TABLE financial_transaction (
    transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('INCOME', 'EXPENSE') NOT NULL, 
    category ENUM('SERVICE_SALE', 'MEMBER_TOPUP', 'MEMBER_WITHDRAW', 'REFUND', 'COMBO_PURCHASE', 'OTHER') NOT NULL, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    used_by INT NOT NULL, 
    processed_by INT,
    promotion_id INT NULL, -- FK Liên kết khuyến mãi nạp thẻ
    FOREIGN KEY (used_by) REFERENCES members(member_id),
    FOREIGN KEY (processed_by) REFERENCES users(user_id),
    FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE SET NULL
);