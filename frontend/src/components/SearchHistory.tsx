import type { SearchHistoryEntry } from "../types";

interface SearchHistoryProps {
  history: SearchHistoryEntry[];
  onSelect: (companyName: string) => void;
  onDelete: (id: number) => void;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "เมื่อสักครู่";
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชม.ที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

export default function SearchHistory({ history, onSelect, onDelete }: SearchHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="sidebar-empty">
        <div className="sidebar-empty-icon">📭</div>
        <p>ยังไม่มีประวัติการค้นหา<br />เริ่มค้นหาบริษัทเลย!</p>
      </div>
    );
  }

  return (
    <div className="sidebar-list">
      {history.map((entry) => (
        <div
          key={entry.id}
          className="history-item"
          onClick={() => onSelect(entry.company_name)}
          title={entry.company_name}
        >
          <div className="history-item-icon">
            {entry.source === "cache" ? "💾" : "🌐"}
          </div>
          <div className="history-item-content">
            <div className="history-item-name">{entry.company_name}</div>
            <div className="history-item-meta">
              <span>{formatDate(entry.searched_at)}</span>
              <span>•</span>
              <span>฿{formatCompact(entry.revenue_latest || 0)}</span>
            </div>
          </div>
          <button
            className="history-item-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            title="ลบ"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
