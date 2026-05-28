import { useState } from "react";
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
  AreaChart,
  Area,
} from "recharts";
import type { FinancialData } from "../types";

interface FinancialChartProps {
  data: FinancialData[];
  companyName: string;
}

type ChartType = "bar" | "area";

/** Format large numbers into readable Thai format */
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
      style={{
        background: "rgba(6, 10, 20, 0.97)",
        border: "1px solid rgba(139, 92, 246, 0.2)",
        borderRadius: "12px",
        padding: "14px 18px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      <p style={{
        color: "var(--color-accent-light)",
        fontWeight: 600,
        marginBottom: "8px",
        fontSize: "0.85rem",
      }}>
        ปี {label}
      </p>
      {payload.map((entry, index) => (
        <p key={index} style={{
          fontSize: "0.8rem",
          marginBottom: "4px",
          color: entry.color,
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
        }}>
          <span>{entry.name}</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {entry.value.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
          </span>
        </p>
      ))}
    </div>
  );
}

export default function FinancialChart({ data, companyName }: FinancialChartProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");

  return (
    <div className="glass-card slide-up" style={{ padding: "24px", animationDelay: "0.1s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div className="section-header-icon section-header-icon--chart">📊</div>
          <div>
            <h2>กราฟข้อมูลการเงิน</h2>
            <p>{companyName}</p>
          </div>
        </div>

        <div className="chart-toggle">
          <button
            className={`chart-toggle-btn ${chartType === "bar" ? "active" : ""}`}
            onClick={() => setChartType("bar")}
          >
            แท่ง
          </button>
          <button
            className={`chart-toggle-btn ${chartType === "area" ? "active" : ""}`}
            onClick={() => setChartType("area")}
          >
            พื้นที่
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        {chartType === "bar" ? (
          <BarChart
            data={data}
            margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
            barCategoryGap="25%"
            barGap={8}
          >
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={1} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.7} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 13, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
            <YAxis tickFormatter={formatThaiCurrency} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(139, 92, 246, 0.04)" }} />
            <Legend wrapperStyle={{ fontFamily: "var(--font-thai)", fontSize: "0.8rem", paddingTop: "12px" }} />

            <Bar dataKey="revenue" name="รายได้รวม" fill="url(#goldGradient)" radius={[8, 8, 0, 0]} animationDuration={800} animationEasing="ease-out">
              {data.map((_entry, index) => (
                <Cell key={`rev-${index}`} fill="url(#goldGradient)" />
              ))}
            </Bar>

            <Bar dataKey="netProfit" name="กำไรสุทธิ" fill="url(#cyanGradient)" radius={[8, 8, 0, 0]} animationDuration={800} animationEasing="ease-out" animationBegin={200}>
              {data.map((_entry, index) => (
                <Cell key={`np-${index}`} fill="url(#cyanGradient)" />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="goldAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cyanAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 13, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
            <YAxis tickFormatter={formatThaiCurrency} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: "var(--font-thai)", fontSize: "0.8rem", paddingTop: "12px" }} />

            <Area type="monotone" dataKey="revenue" name="รายได้รวม" stroke="#fbbf24" strokeWidth={2.5} fill="url(#goldAreaGradient)" animationDuration={800} dot={{ r: 5, fill: "#fbbf24", strokeWidth: 2, stroke: "#0a0e1a" }} />
            <Area type="monotone" dataKey="netProfit" name="กำไรสุทธิ" stroke="#22d3ee" strokeWidth={2.5} fill="url(#cyanAreaGradient)" animationDuration={800} animationBegin={200} dot={{ r: 5, fill: "#22d3ee", strokeWidth: 2, stroke: "#0a0e1a" }} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
