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
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          {/* Search icon */}
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]"
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
            placeholder="พิมพ์ชื่อบริษัท เช่น บริษัท ปตท. จำกัด (มหาชน)"
            className="glow-input pl-12"
            disabled={isLoading}
            autoFocus
          />
        </div>

        <button
          id="search-button"
          type="submit"
          disabled={isLoading || !query.trim()}
          className="btn-gold flex items-center justify-center gap-2 min-w-[140px]"
        >
          {isLoading ? (
            <>
              <span className="spinner !w-5 !h-5 !border-2 !border-[#0a0e1a33] !border-t-[#0a0e1a]" />
              <span>กำลังค้นหา...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="mt-4 flex items-center gap-3 fade-in">
          <div className="pulse-dot" />
          <p className="text-[var(--color-text-secondary)] text-sm">
            กำลังดึงข้อมูลจาก DBD DataWarehouse... กรุณารอสักครู่
            <br />
            <span className="text-[var(--color-text-muted)] text-xs">
              ระบบกำลังทำงานเบื้องหลัง อาจใช้เวลาสักครู่
            </span>
          </p>
        </div>
      )}
    </form>
  );
}
