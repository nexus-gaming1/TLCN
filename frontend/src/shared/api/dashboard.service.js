import { apiClient } from './client';
import { mapComputerToMachineDTO } from '../adapters/machineAdapter';

export const dashboardService = {
  /**
   * Fetch live dashboard overview & room layout grid directly from backend CSDL Seeder
   */
  async getOverview() {
    try {
      const overviewRequest = apiClient.get('/computers/overview').catch((error) => {
        console.warn('Không thể tải thông tin phiên máy:', error.message);
        return null;
      });
      const [res, overviewRes] = await Promise.all([
        apiClient.get('/computers/grid'),
        overviewRequest
      ]);
      if (res && res.status === 'success' && res.data) {
        const gridData = res.data;
        const summary = gridData.summary || {};
        const zonesData = gridData.zones || [];
        const overviewByIp = new Map(
          (overviewRes?.data || []).map((computer) => [computer.ipAddress, computer])
        );

        const formattedZones = zonesData.map((z) => ({
          id: `zone-${z.zone_id}`,
          zone_id: z.zone_id,
          name: z.zone_name,
          price_per_hour: z.price_per_hour,
          stations: (z.stations || []).map((computer) => mapComputerToMachineDTO({
            ...computer,
            ...(overviewByIp.get(computer.ip_address) || {})
          }))
        }));

        return {
          metrics: {
            totalStations: summary.total || 0,
            occupancyRate: summary.total > 0
              ? ((summary.in_use / summary.total) * 100).toFixed(1)
              : '0.0',
            localCount: summary.in_use || 0,
            cloudCount: summary.remote || 0,
            readyCount: summary.online || 0,
            maintCount: summary.maintenance || 0
          },
          zones: formattedZones
        };
      }
    } catch (error) {
      console.warn('⚡ Không thể kết nối API /api/computers/grid:', error.message);
    }

    return {
      metrics: {
        totalStations: 0,
        occupancyRate: '0.0',
        localCount: 0,
        cloudCount: 0,
        readyCount: 0,
        maintCount: 0
      },
      zones: []
    };
  }
};

export default dashboardService;
