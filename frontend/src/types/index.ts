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
