import type { FinancialData } from "../types";

interface FinancialTableProps {
  data: FinancialData[];
}

/** Format number as Thai Baht with commas and 2 decimal places */
function formatBaht(value: number): string {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Calculate YoY change percentage */
function getYoYChange(data: FinancialData[], index: number, key: "revenue" | "netProfit"): number | null {
  if (index === 0) return null;
  const prev = data[index - 1][key];
  const curr = data[index][key];
  if (prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function TrendBadge({ change }: { change: number | null }) {
  if (change === null) return <span style={{ color: "var(--color-text-muted)", fontSize: "0.7rem" }}>—</span>;

  const isUp = change >= 0;
  return (
    <span className={isUp ? "trend-up" : "trend-down"} style={{ fontSize: "0.72rem", fontWeight: 500 }}>
      <span className="trend-icon">{isUp ? "▲" : "▼"}</span>
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

export default function FinancialTable({ data }: FinancialTableProps) {
  return (
    <div className="glass-card slide-up" style={{ padding: "24px", animationDelay: "0.25s" }}>
      <div className="section-header">
        <div className="section-header-icon section-header-icon--table">📋</div>
        <div>
          <h2>ตารางข้อมูลการเงิน</h2>
          <p>หน่วย: บาท</p>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table id="financial-table" className="data-table">
          <thead>
            <tr>
              <th style={{ width: "12%" }}>ปี</th>
              <th style={{ width: "30%" }}>รายได้รวม (Revenue)</th>
              <th style={{ width: "12%" }}>YoY</th>
              <th style={{ width: "30%" }}>กำไรสุทธิ (Net Profit)</th>
              <th style={{ width: "12%" }}>YoY</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.year} className="fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <td>{row.year}</td>
                <td>
                  <span className={row.revenue >= 0 ? "text-positive" : "text-negative"}>
                    {formatBaht(row.revenue)}
                  </span>
                </td>
                <td>
                  <TrendBadge change={getYoYChange(data, index, "revenue")} />
                </td>
                <td>
                  <span className={row.netProfit >= 0 ? "text-positive" : "text-negative"}>
                    {formatBaht(row.netProfit)}
                  </span>
                </td>
                <td>
                  <TrendBadge change={getYoYChange(data, index, "netProfit")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Row */}
      <div className="summary-bar">
        <div className="summary-item">
          <span className="summary-item-label">รายได้เฉลี่ย</span>
          <span className="summary-item-value" style={{ color: "var(--color-gold-light)" }}>
            {formatBaht(data.reduce((sum, d) => sum + d.revenue, 0) / data.length)} บาท
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-item-label">กำไรสุทธิเฉลี่ย</span>
          <span className="summary-item-value" style={{ color: "var(--color-cyan-light)" }}>
            {formatBaht(data.reduce((sum, d) => sum + d.netProfit, 0) / data.length)} บาท
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-item-label">อัตรากำไรเฉลี่ย</span>
          <span className="summary-item-value" style={{ color: "var(--color-green)" }}>
            {(() => {
              const avgRev = data.reduce((s, d) => s + d.revenue, 0) / data.length;
              const avgProfit = data.reduce((s, d) => s + d.netProfit, 0) / data.length;
              if (avgRev === 0) return "N/A";
              return `${((avgProfit / avgRev) * 100).toFixed(1)}%`;
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}
