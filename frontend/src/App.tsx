import { useState } from "react";
import SearchBar from "./components/SearchBar";
import FinancialChart from "./components/FinancialChart";
import FinancialTable from "./components/FinancialTable";
import type { SearchResult } from "./types";

export default function App() {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (companyName: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/search?name=${encodeURIComponent(companyName)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setResult(data as SearchResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-animated min-h-screen">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="pt-12 pb-8 px-4 text-center">
        <div className="fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
            <span className="text-[var(--color-gold)]">📈</span>{" "}
            ระบบติดตามข้อมูลการเงินบริษัทไทย
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm sm:text-base max-w-xl mx-auto">
            ค้นหาและดึงข้อมูลรายได้รวม & กำไรสุทธิย้อนหลัง 3 ปี จาก
            <span className="text-[var(--color-blue-light)]"> DBD DataWarehouse</span>
          </p>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 pb-16">
        {/* Search */}
        <section id="search-section" className="glass-card p-6 mb-8 fade-in" style={{ animationDelay: "0.15s" }}>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </section>

        {/* Error */}
        {error && (
          <div
            id="error-message"
            className="glass-card p-5 mb-8 fade-in border-l-4"
            style={{ borderLeftColor: "var(--color-red)" }}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-[var(--color-red)] mb-1">เกิดข้อผิดพลาด</p>
                <p className="text-[var(--color-text-secondary)] text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && result.data.length > 0 && (
          <div className="space-y-6">
            {/* Company name + source badge */}
            <div className="flex items-center gap-3 fade-in">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                {result.companyName}
              </h2>
              <span className={result.source === "cache" ? "badge-cache" : "badge-scraped"}>
                {result.source === "cache" ? "💾 จากแคช" : "🌐 ดึงข้อมูลใหม่"}
              </span>
            </div>

            {/* Chart */}
            <FinancialChart data={result.data} companyName={result.companyName} />

            {/* Table */}
            <FinancialTable data={result.data} />
          </div>
        )}

        {/* Empty state */}
        {!result && !isLoading && !error && (
          <div className="text-center py-20 fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="text-6xl mb-4">🏢</div>
            <p className="text-[var(--color-text-secondary)] text-lg mb-2">
              เริ่มต้นค้นหาบริษัท
            </p>
            <p className="text-[var(--color-text-muted)] text-sm max-w-md mx-auto">
              พิมพ์ชื่อบริษัทไทยในช่องค้นหาด้านบน ระบบจะดึงข้อมูลงบการเงินย้อนหลัง 3 ปี
              จาก DBD DataWarehouse โดยอัตโนมัติ
            </p>
          </div>
        )}
      </main>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="text-center pb-8 text-[var(--color-text-muted)] text-xs">
        <p>Thai Company Financial Tracker — ข้อมูลจาก DBD DataWarehouse</p>
        <p className="mt-1">ทำงานแบบ Local เท่านั้น • ไม่มีการส่งข้อมูลไปยัง Cloud</p>
      </footer>
    </div>
  );
}
