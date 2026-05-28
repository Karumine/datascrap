import { useState, useEffect, useCallback, useRef } from "react";
import SearchBar from "./components/SearchBar";
import FinancialChart from "./components/FinancialChart";
import FinancialTable from "./components/FinancialTable";
import SearchHistory from "./components/SearchHistory";
import StatCards from "./components/StatCards";
import type { SearchResult, SearchHistoryEntry } from "./types";

export default function App() {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [resultKey, setResultKey] = useState(0);
  const lastSearchRef = useRef<string>("");

  // Fetch search history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearch = async (companyName: string) => {
    // If same company is already displayed, skip the search
    if (result && result.companyName === companyName && !isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    // Don't clear result — keep showing old data until new data arrives

    try {
      const res = await fetch(
        `/api/search?name=${encodeURIComponent(companyName)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const newResult = data as SearchResult;

      // Only trigger animation if it's a different company
      if (lastSearchRef.current !== companyName) {
        setResultKey((k) => k + 1);
        lastSearchRef.current = companyName;
      }

      setResult(newResult);

      // Refresh history after successful search
      await fetchHistory();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHistory = async (id: number) => {
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch {
      // silently fail
    }
  };

  const handleSelectHistory = (companyName: string) => {
    handleSearch(companyName);
  };

  return (
    <div className="bg-gradient-animated">
      {/* Floating Particles */}
      <div className="particles-container">
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
      </div>

      {/* Dashboard Layout */}
      <div className="dashboard-layout" style={{ position: "relative", zIndex: 1 }}>
        {/* ─── Sidebar ─────────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div className="sidebar-brand-icon">📊</div>
              <div>
                <div className="sidebar-brand-text">Financial Tracker</div>
                <div className="sidebar-brand-sub">DBD DataWarehouse</div>
              </div>
            </div>
          </div>

          <div className="sidebar-section-title">ประวัติการค้นหา</div>

          <SearchHistory
            history={history}
            onSelect={handleSelectHistory}
            onDelete={handleDeleteHistory}
          />
        </aside>

        {/* ─── Main Content ────────────────────────────────────── */}
        <main className="main-content">
          {/* Search */}
          <section id="search-section">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </section>

          {/* Error */}
          {error && (
            <div id="error-message" className="glass-card error-card" style={{ marginBottom: "20px" }}>
              <div className="error-card-icon">⚠️</div>
              <div>
                <p className="error-card-title">เกิดข้อผิดพลาด</p>
                <p className="error-card-message">{error}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {result && result.data.length > 0 && (
            <div key={resultKey} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Company header */}
              <div className="result-header">
                <h2>{result.companyName}</h2>
                <span className={`badge ${result.source === "cache" ? "badge-cache" : "badge-scraped"}`}>
                  {result.source === "cache" ? "💾 จากแคช" : "🌐 ดึงข้อมูลใหม่"}
                </span>
              </div>

              {/* Stat Cards */}
              <StatCards data={result.data} source={result.source} />

              {/* Chart */}
              <FinancialChart data={result.data} companyName={result.companyName} />

              {/* Table */}
              <FinancialTable data={result.data} />
            </div>
          )}

          {/* Empty state */}
          {!result && !isLoading && !error && (
            <div className="empty-state" style={{ animationDelay: "0.2s" }}>
              <div className="empty-state-icon">🏢</div>
              <h3>เริ่มต้นค้นหาบริษัท</h3>
              <p>
                พิมพ์ชื่อบริษัทไทยในช่องค้นหาด้านบน ระบบจะดึงข้อมูลงบการเงินย้อนหลัง
                3 ปีจาก DBD DataWarehouse โดยอัตโนมัติ
              </p>
            </div>
          )}

          {/* Footer */}
          <footer className="footer">
            <p>Thai Company Financial Tracker — ข้อมูลจาก DBD DataWarehouse</p>
            <p>ทำงานแบบ Local เท่านั้น • ไม่มีการส่งข้อมูลไปยัง Cloud</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

