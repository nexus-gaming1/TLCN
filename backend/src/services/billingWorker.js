const billingService = require('./billingService');

class BillingWorker {
  constructor(intervalMs = 10000) {
    this.intervalMs = intervalMs;
    this.timer = null;
    this.running = false;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    if (this.timer.unref) this.timer.unref();
    this.tick();
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await billingService.billActiveSessions();
    } catch (error) {
      console.error('[Billing Worker] Lỗi xử lý phiên thuê máy:', error);
    } finally {
      this.running = false;
    }
  }
}

module.exports = new BillingWorker();
