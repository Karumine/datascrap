import type { FinancialData } from "../types";

interface StatCardsProps {
  data: FinancialData[];
  source: "cache" | "scraped";
}

function formatBahtCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)} ล้าน`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)} พัน`;
  return value.toLocaleString("th-TH");
}

function getTrend(data: FinancialData[], key: "revenue" | "netProfit"): { pct: number; direction: "up" | "down" | "flat" } {
  if (data.length < 2) return { pct: 0, direction: "flat" };
  const prev = data[data.length - 2][key];
  const curr = data[data.length - 1][key];
  if (prev === 0) return { pct: 0, direction: "flat" };
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  return {
    pct: Math.abs(pct),
    direction: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat",
  };
}

export default function StatCards({ data, source }: StatCardsProps) {
  const latest = data[data.length - 1];
  const revenueTrend = getTrend(data, "revenue");
  const profitTrend = getTrend(data, "netProfit");

  return (
    <div className="stat-cards-grid fade-in">
      {/* Revenue */}
      <div className="stat-card stat-card--gold">
        <div className="stat-card-icon">💰</div>
        <div className="stat-card-label">รายได้รวม ({latest.year})</div>
        <div className="stat-card-value">{formatBahtCompact(latest.revenue)}</div>
        {revenueTrend.direction !== "flat" && (
          <div className="stat-card-sub">
            <span className={revenueTrend.direction === "up" ? "trend-up" : "trend-down"}>
              <span className="trend-icon">{revenueTrend.direction === "up" ? "▲" : "▼"}</span>
              {revenueTrend.pct.toFixed(1)}% YoY
            </span>
          </div>
        )}
      </div>

      {/* Net Profit */}
      <div className="stat-card stat-card--cyan">
        <div className="stat-card-icon">📊</div>
        <div className="stat-card-label">กำไรสุทธิ ({latest.year})</div>
        <div className="stat-card-value">{formatBahtCompact(latest.netProfit)}</div>
        {profitTrend.direction !== "flat" && (
          <div className="stat-card-sub">
            <span className={profitTrend.direction === "up" ? "trend-up" : "trend-down"}>
              <span className="trend-icon">{profitTrend.direction === "up" ? "▲" : "▼"}</span>
              {profitTrend.pct.toFixed(1)}% YoY
            </span>
          </div>
        )}
      </div>

      {/* Profit Margin */}
      <div className="stat-card stat-card--green">
        <div className="stat-card-icon">📈</div>
        <div className="stat-card-label">อัตรากำไรสุทธิ</div>
        <div className="stat-card-value">
          {latest.revenue !== 0
            ? `${((latest.netProfit / latest.revenue) * 100).toFixed(1)}%`
            : "N/A"}
        </div>
        <div className="stat-card-sub">
          Net Profit Margin
        </div>
      </div>

      {/* Source */}
      <div className="stat-card stat-card--accent">
        <div className="stat-card-icon">📅</div>
        <div className="stat-card-label">ข้อมูลย้อนหลัง</div>
        <div className="stat-card-value">{data.length} ปี</div>
        <div className="stat-card-sub">
          {source === "cache" ? "💾 จากแคช" : "🌐 ดึงข้อมูลใหม่"}
        </div>
      </div>
    </div>
  );
}
