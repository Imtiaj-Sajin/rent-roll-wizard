import type { ParseResult, RentRollType } from "./types";
import { extractPdfPagesText, pageItemsToPlainText } from "./pdf/extract";
import { parseMultifamily } from "./parsers/multifamily";
import { parseCommercialMall } from "./parsers/commercialMall";
import { parseCommercialRetail } from "./parsers/commercialRetail";

export async function parseRentRoll(file: File, type: RentRollType): Promise<ParseResult> {
  const pages = await extractPdfPagesText(file);
  const pagesText = pages.map(pageItemsToPlainText);

  switch (type) {
    case "multifamily":
      return parseMultifamily(pages, pagesText);
    case "commercial_mall":
      return parseCommercialMall(pages, pagesText);
    case "commercial_retail":
      return parseCommercialRetail(pages, pagesText);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
