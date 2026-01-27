export type RentRollType = "multifamily" | "commercial_mall" | "commercial_retail";

export type DataRow = Record<string, string | number | null | undefined>;

export type ParseResult = {
  columns: string[];
  rows: DataRow[];
  meta?: {
    pages: number;
    extractedAt: string;
    warnings?: string[];
  };
  raw?: {
    pagesText: string[];
  };
};
