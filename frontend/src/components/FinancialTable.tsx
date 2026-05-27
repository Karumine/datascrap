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

export default function FinancialTable({ data }: FinancialTableProps) {
  return (
    <div className="glass-card p-6 slide-up" style={{ animationDelay: "0.25s" }}>
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
        📋 ตารางข้อมูลการเงิน
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        หน่วย: บาท
      </p>

      <div className="overflow-x-auto">
        <table id="financial-table" className="data-table">
          <thead>
            <tr>
              <th style={{ width: "20%" }}>ปี</th>
              <th style={{ width: "40%" }}>รายได้รวม (Revenue)</th>
              <th style={{ width: "40%" }}>กำไรสุทธิ (Net Profit)</th>
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
                  <span className={row.netProfit >= 0 ? "text-positive" : "text-negative"}>
                    {formatBaht(row.netProfit)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Row */}
      <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-[var(--color-text-muted)]">รายได้เฉลี่ย: </span>
          <span className="text-[var(--color-gold-light)] font-semibold">
            {formatBaht(data.reduce((sum, d) => sum + d.revenue, 0) / data.length)} บาท
          </span>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">กำไรสุทธิเฉลี่ย: </span>
          <span className="text-[var(--color-blue-light)] font-semibold">
            {formatBaht(data.reduce((sum, d) => sum + d.netProfit, 0) / data.length)} บาท
          </span>
        </div>
      </div>
    </div>
  );
}
