import { useState, type FormEvent } from "react";

interface SearchBarProps {
  onSearch: (name: string) => void;
  isLoading: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed);
    }
  };

  return (
    <div className="hero-search">
      <h1 className="hero-search-title">ค้นหาข้อมูลการเงินบริษัท</h1>
      <p className="hero-search-subtitle">
        ดึงข้อมูลรายได้รวม & กำไรสุทธิย้อนหลัง 3 ปี จาก DBD DataWarehouse โดยอัตโนมัติ
      </p>

      <form onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <div className="relative flex-1" style={{ position: "relative" }}>
            {/* Search icon */}
            <svg
              style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "18px",
                height: "18px",
                color: "var(--color-text-muted)",
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            <input
              id="company-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="พิมพ์ชื่อบริษัท หรือ เลขทะเบียนนิติบุคคล 13 หลัก"
              className="glow-input"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <button
            id="search-button"
            type="submit"
            disabled={isLoading || !query.trim()}
            className="btn-primary"
          >
            {isLoading ? (
              <>
                <span
                  className="spinner"
                  style={{
                    width: "18px",
                    height: "18px",
                    borderWidth: "2px",
                    borderColor: "rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                  }}
                />
                <span>กำลังค้นหา...</span>
              </>
            ) : (
              <>
                <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span>ค้นหา</span>
              </>
            )}
          </button>
        </div>

        {/* Loading status bar */}
        {isLoading && (
          <div className="loading-overlay" style={{ padding: "24px 0" }}>
            <div className="pulse-dot" />
            <div style={{ textAlign: "center" }}>
              <p className="loading-text">
                กำลังดึงข้อมูลจาก DBD DataWarehouse...
              </p>
              <p className="loading-subtext">
                ระบบกำลังใช้ Puppeteer สกัดข้อมูล อาจใช้เวลา 15-30 วินาที
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
