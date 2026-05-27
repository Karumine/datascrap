import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { FinancialData } from "../types";

interface FinancialChartProps {
  data: FinancialData[];
  companyName: string;
}

/** Format large numbers into readable Thai format with ล้านบาท / พันบาท */
function formatThaiCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} ล้าน`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)} พัน`;
  }
  return value.toLocaleString("th-TH");
}

/** Custom tooltip */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="glass-card p-4"
      style={{
        background: "rgba(10, 14, 26, 0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <p className="text-[var(--color-gold)] font-semibold mb-2">ปี {label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm mb-1" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
        </p>
      ))}
    </div>
  );
}

const GOLD_GRADIENT = "url(#goldGradient)";
const BLUE_GRADIENT = "url(#blueGradient)";

export default function FinancialChart({ data, companyName }: FinancialChartProps) {
  return (
    <div className="glass-card p-6 slide-up" style={{ animationDelay: "0.1s" }}>
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
        📊 กราฟข้อมูลการเงิน
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">{companyName}</p>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
          barCategoryGap="25%"
          barGap={8}
        >
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0d060" stopOpacity={1} />
              <stop offset="100%" stopColor="#d4af37" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />

          <XAxis
            dataKey="year"
            tick={{ fontSize: 14, fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          />

          <YAxis
            tickFormatter={formatThaiCurrency}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={80}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />

          <Legend
            wrapperStyle={{
              fontFamily: "var(--font-thai)",
              fontSize: "0.85rem",
              paddingTop: "12px",
            }}
          />

          <Bar
            dataKey="revenue"
            name="รายได้รวม"
            fill={GOLD_GRADIENT}
            radius={[6, 6, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((_entry, index) => (
              <Cell key={`rev-${index}`} fill={GOLD_GRADIENT} />
            ))}
          </Bar>

          <Bar
            dataKey="netProfit"
            name="กำไรสุทธิ"
            fill={BLUE_GRADIENT}
            radius={[6, 6, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
            animationBegin={200}
          >
            {data.map((_entry, index) => (
              <Cell key={`np-${index}`} fill={BLUE_GRADIENT} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
