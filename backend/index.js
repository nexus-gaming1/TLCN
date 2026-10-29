const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const http = require('http');
// Kéo toàn bộ cấu hình Database và Models vào đây
const db = require('./src/models');
// Import migration runner & seeder
const runMigrations = require('./src/utils/migrationRunner');
const seedData = require('./src/utils/seeder');

// Import Routes
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const memberRoutes = require('./src/routes/memberRoutes');
const computerRoutes = require('./src/routes/computerRoutes');
const pricingPlanRoutes = require('./src/routes/pricingPlanRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const { initSocket } = require('./src/sockets');
const healthRoutes = require('./src/routes/healthRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const serviceCatalogRoutes = require('./src/routes/serviceCatalogRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const comboRoutes = require('./src/routes/comboRoutes');
const gameRoutes = require('./src/routes/gameRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const comboTimeService = require('./src/services/comboTimeService');
const orderRoutes = require('./src/routes/orderRoutes');

const errorHandler = require('./src/middleware/errorHandler');
const computerSocketService = require('./src/services/computerSocketService');

const app = express();
const PORT = process.env.PORT || 3001;

// Cấu hình CORS an toàn hỗ trợ HttpOnly Cookie Credentials
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Cookie Parser Middleware
app.use(cookieParser());

// Middleware Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health Check Endpoint (dùng cho Load Balancer & Monitoring System)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Welcome to NEXUS Cloud Cyber OS API!' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/computers', computerRoutes);
app.use('/api/pricing-plans', pricingPlanRoutes);
app.use('/api/promotions', pricingPlanRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/catalog/combos', comboRoutes);
app.use('/api/combos', comboRoutes);
app.use('/api/catalog', serviceCatalogRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/orders', orderRoutes);

// Centralized Error Handler
app.use(errorHandler);
const server = http.createServer(app);

// Gắn Socket.IO vào HTTP Server
const io = initSocket(server)

// Khi có client kết nối
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Client ngắt kết nối
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});
computerSocketService.init(io);
// CHẠY MIGRATIONS, ĐỒNG BỘ DATABASE & BẬT SERVER
async function startServer() {
  try {
    // 1. Chạy Sequelize CLI Migrations tự động trước
    await runMigrations();

    // 2. Kết nối và đồng bộ ORM
    await db.sequelize.sync();
    console.log('✅ Kết nối & Đồng bộ CSDL MySQL thành công!');

    // 3. Chạy seeder nạp dữ liệu mẫu
    await seedData(db);

    // 4. Quét & xử lý các combo đã hết hạn trong lúc backend tắt/restart (Rule 2.6)
    const expiredCount = await comboTimeService.checkAndExpireCombos();
    if (expiredCount > 0) {
      console.log(`⚡ [ComboTime Sweeper] Đã phát hiện và xử lý ${expiredCount} gói Combo hết hạn khi server khởi động lại.`);
    }

    // 5. Khởi chạy scheduler định kỳ kiểm tra combo hết hạn (mỗi 5 giây, unref để không treo tiến trình)
    const expirationScheduler = setInterval(async () => {
      try {
        await comboTimeService.checkAndExpireCombos();
      } catch (err) {
        console.error('[ComboTime Scheduler Error]:', err.message);
      }
    }, 5000);
    if (expirationScheduler.unref) expirationScheduler.unref();

    // 6. Bật server
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Lỗi khởi tạo ứng dụng Backend:', err);
  }
}

startServer();