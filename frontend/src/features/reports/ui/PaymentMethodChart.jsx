import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { CreditCard } from 'lucide-react';

// Bảng màu cho từng phương thức thanh toán
const METHOD_COLORS = {
  CASH: '#10b981',    // Xanh lá nhạt (Tiền mặt )
  VIETQR: '#0ea5e9',  // Xanh dương(Chuyển khoản SePay)
  OTHER: '#94a3b8'    // Xám mặc định
};

const METHOD_LABELS = {
  CASH: 'Tiền mặt tại quầy',
  VIETQR: 'Chuyển khoản VietQR',
  OTHER: 'Khác'
};


// Custom tooltip cho PieChart (hiển thị cả số tiền và %)
const CustomPieTooltip = ({ active, payload, totalAmount }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const total = Number(data.value || 0);
    const pct = totalAmount > 0 ? ((total / totalAmount) * 100).toFixed(1) : '0.0';
    const name = METHOD_LABELS[data.name] || data.name;
    return (
      <div className="bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md">
        <span className="font-bold block text-slate-300">{name}</span>
        <span className="font-mono text-sm font-black text-emerald-400 mt-0.5 block">
          {total.toLocaleString('vi-VN')} đ ({pct}%)
        </span>
      </div>
    );
  }
  return null;
};

export default function PaymentMethodChart({ data = [] }) {
  // Lọc bỏ các phương thức có số tiền bằng 0
  const validData = data.filter((item) => Number(item.total) > 0);
  const totalAmount = validData.reduce((acc, curr) => acc + Number(curr.total || 0), 0);

  if (validData.length === 0 || totalAmount === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col items-center justify-center min-h-[280px] h-full text-center">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-2">
          <CreditCard className="w-5 h-5" />
        </div>
        <p className="text-xs font-bold text-slate-700">Chưa có dữ liệu thanh toán</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Không phát sinh nạp tiền trong chu kỳ này</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 font-bold">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 leading-tight">Phương Thức Thanh Toán</h3>
            <p className="text-[11px] text-slate-400 font-medium">Tỷ trọng dòng tiền nạp</p>
          </div>
        </div>
      </div>
      {/* Donut chart container */}
      <div className="w-full h-[190px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={validData}
              dataKey="total"
              nameKey="method"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={78}
              paddingAngle={4}
              stroke="none"
            >
              {validData.map((entry) => (
                <Cell
                  key={entry.method}
                  fill={METHOD_COLORS[entry.method] || METHOD_COLORS.OTHER}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip totalAmount={totalAmount} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Chú thích kèm số tiền và tỷ trọng (%) */}
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
        {validData.map((entry) => {
          const amount = Number(entry.total || 0);
          const pct = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0.0';
          const color = METHOD_COLORS[entry.method] || METHOD_COLORS.OTHER;
          return (
            <div key={entry.method} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-bold text-slate-700 truncate">
                  {METHOD_LABELS[entry.method] || entry.method}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono shrink-0">
                <span className="font-black text-slate-900">
                  {amount.toLocaleString('vi-VN')} đ
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}