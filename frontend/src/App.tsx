import { useState, useEffect, useCallback, useRef } from "react";
import SearchBar from "./components/SearchBar";
import FinancialChart from "./components/FinancialChart";
import FinancialTable from "./components/FinancialTable";
import SearchHistory from "./components/SearchHistory";
import StatCards from "./components/StatCards";
import type { SearchResult, SearchHistoryEntry } from "./types";

export default function App() {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [uploadedResults, setUploadedResults] = useState<SearchResult[] | null>(null);
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

  const fetchSearchData = async (companyName: string) => {
    if (result && result.companyName === companyName && !isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `http://localhost:8080/api/search?name=${encodeURIComponent(companyName)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const newResult = data as SearchResult;

      if (lastSearchRef.current !== companyName) {
        setResultKey((k) => k + 1);
        lastSearchRef.current = companyName;
      }

      setUploadedResults(null);
      setResult(newResult);
      await fetchHistory();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8080/api/upload-excel", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const results = data.results as SearchResult[];
      if (!results || results.length === 0) {
        throw new Error("ไม่พบข้อมูลในไฟล์ Excel");
      }

      setUploadedResults(results);
      const newResult = results[0];
      
      setResultKey((k) => k + 1);
      lastSearchRef.current = newResult.companyName;
      setResult(newResult);
      
      await fetchHistory();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลด";
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
    fetchSearchData(companyName);
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
            <SearchBar onUpload={handleUpload} isLoading={isLoading} />
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
              <div className="result-header" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <h2 style={{ margin: 0 }}>{result.companyName}</h2>
                <span className={`badge ${result.source === "cache" ? "badge-cache" : result.source === "excel" ? "badge-scraped" : "badge-scraped"}`}>
                  {result.source === "cache" ? "💾 จากแคช" : result.source === "excel" ? "📊 จากไฟล์ Excel" : "🌐 ดึงข้อมูลใหม่"}
                </span>

                {uploadedResults && uploadedResults.length > 1 && (
                  <div className="hide-on-print" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
                    <label style={{ fontSize: "0.9rem", color: "var(--color-text-dim)" }}>เลือกบริษัท:</label>
                    <select 
                      value={result.companyName} 
                      onChange={(e) => {
                        const selected = uploadedResults.find(r => r.companyName === e.target.value);
                        if (selected) {
                          setResultKey(k => k + 1);
                          lastSearchRef.current = selected.companyName;
                          setResult(selected);
                        }
                      }}
                      style={{ 
                        padding: "6px 12px", 
                        borderRadius: "8px", 
                        background: "rgba(255,255,255,0.1)", 
                        color: "white", 
                        border: "1px solid rgba(255,255,255,0.2)",
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      {uploadedResults.map(r => (
                        <option key={r.companyName} value={r.companyName} style={{ color: "black" }}>
                          {r.companyName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button 
                  onClick={() => window.print()} 
                  className="btn-print hide-on-print"
                  style={{ 
                    marginLeft: uploadedResults && uploadedResults.length > 1 ? "10px" : "auto", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "rgba(139, 92, 246, 0.2)",
                    color: "var(--color-accent-light)",
                    border: "1px solid rgba(139, 92, 246, 0.4)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                  title="บันทึกเป็น PDF"
                  onMouseOver={(e) => e.currentTarget.style.background = "rgba(139, 92, 246, 0.3)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)"}
                >
                  <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Export PDF
                </button>
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
              <h3>เริ่มต้นอัปโหลดข้อมูลงบการเงิน</h3>
              <p>
                ดาวน์โหลดเทมเพลตและอัปโหลดไฟล์ Excel เพื่อแสดงกราฟและตารางข้อมูล 
                หรือคลิกประวัติการค้นหาด้านซ้ายเพื่อดูข้อมูลเก่า
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

