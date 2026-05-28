export interface FinancialData {
  year: number;
  revenue: number;
  netProfit: number;
}

export interface SearchResult {
  companyName: string;
  source: "cache" | "scraped";
  data: FinancialData[];
}

export interface CachedCompany {
  company_name: string;
  years: number;
  last_scraped: string;
}

export interface SearchHistoryEntry {
  id: number;
  company_name: string;
  searched_at: string;
  source: "cache" | "scraped";
  result_count: number;
  revenue_latest: number;
  net_profit_latest: number;
}
