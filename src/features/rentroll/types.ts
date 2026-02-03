export type RentRollType = "multifamily" | "commercial_mall" | "commercial_retail";

export type DataRow = Record<string, string | number | null | undefined>;

export type ParseResult = {
  columns: string[];
  rows: DataRow[];
  meta?: {
    pages: number;
    extractedAt: string;
    warnings?: string[];
    debug?: {
      header_words?: string[];
      walls?: string[];
      column_defs?: string[];
    };
  };
};
