import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';


//Hàm rút gọn đơn vị tiền tệ trên trục Y 
const formatCompactVND = (value) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`;
  }
  return value;
};


//Custom Tooltip hiển thị chi tiết khi hover chuột vào biểu đồ
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const topup = data.topupRevenue || 0;
    const service = data.serviceRevenue || 0;
    const total = data.totalRevenue || topup + service;

    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700/80 text-xs backdrop-blur-md min-w-[190px]">
        <p className="font-mono text-slate-400 font-bold mb-2 pb-1.5 border-b border-slate-700">
          Ngày {data.date} ({label})
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-sky-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              Nạp Giờ Chơi:
            </span>
            <span className="font-mono font-bold">{topup.toLocaleString('vi-VN')} đ</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Dịch Vụ F&amp;B:
            </span>
            <span className="font-mono font-bold">{service.toLocaleString('vi-VN')} đ</span>
          </div>

          <div className="pt-2 mt-2 border-t border-slate-700 flex items-center justify-between gap-3 font-extrabold text-emerald-400">
            <span>Tổng Ngày:</span>
            <span className="font-mono text-sm">{total.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center text-slate-400 text-xs font-mono">
        Không có dữ liệu biểu đồ trong khoảng thời gian này
      </div>
    );
  }

  return (
    <div className="w-full h-[360px] pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          {/* màu lạnh và màu nóng */}
          <defs>
            <linearGradient id="colorTopup" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorService" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

          <XAxis
            dataKey="displayDate"
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
          />

          <YAxis
            tickFormatter={formatCompactVND}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '16px', fontSize: '12px', fontWeight: 'bold' }}
            formatter={(value) => (
              <span className="text-slate-700 ml-1">
                {value === 'topupRevenue' ? 'Tiền Nạp Giờ Chơi' : 'Doanh Thu Dịch Vụ (F&B)'}
              </span>
            )}
          />

          {/* Vùng tiền nạp (màu lạnh)*/}
          <Area
            type="monotone"
            dataKey="topupRevenue"
            name="topupRevenue"
            stroke="#0ea5e9"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorTopup)"
          />

          {/* Vùng tiền đồ ăn ( màu nóng )*/}
          <Area
            type="monotone"
            dataKey="serviceRevenue"
            name="serviceRevenue"
            stroke="#f59e0b"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorService)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}