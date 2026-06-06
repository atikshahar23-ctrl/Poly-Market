/**
 * Realistic per-trade fee rates for the paper-trading simulator.
 * All values are expressed as decimals (e.g. 0.00055 = 0.055%).
 */
export const FEE_RATES = {
  /** Perpetual futures (Binance) — per-side fee. */
  perp: { open: 0.00055, close: 0.00055 },
  /** Spot crypto (Binance) — per-side fee. */
  spot: { open: 0.0005, close: 0.0005 },
  /** US equities — commission per side. */
  stock: { open: 0.0001, close: 0.0001 },
  /** Prediction market — fee per side. */
  poly: { open: 0.0002, close: 0.0002 },
} as const;

/** Round-trip fee for a Binance perpetual position (open + close). */
export function calcFeeForBinance(notional: number): number {
  return notional * (FEE_RATES.perp.open + FEE_RATES.perp.close);
}

/** Close-side fee only for a Binance perpetual position. */
export function calcCloseFeeForBinance(notional: number): number {
  return notional * FEE_RATES.perp.close;
}

/** Round-trip fee for a stock position (open + close). */
export function calcFeeForStock(
  shares: number,
  entryPrice: number,
  exitPrice: number,
): number {
  return (
    shares * entryPrice * FEE_RATES.stock.open +
    shares * exitPrice * FEE_RATES.stock.close
  );
}

/** Close-side fee only for a stock position. */
export function calcCloseFeeForStock(
  shares: number,
  exitPrice: number,
): number {
  return shares * exitPrice * FEE_RATES.stock.close;
}

/** Round-trip fee for a Polymarket position (open + close). */
export function calcFeeForPoly(cost: number, grossProceeds: number): number {
  return cost * FEE_RATES.poly.open + grossProceeds * FEE_RATES.poly.close;
}

/** Close-side fee only for a Polymarket position. */
export function calcCloseFeeForPoly(grossProceeds: number): number {
  return grossProceeds * FEE_RATES.poly.close;
}

/** Format a fee for display (e.g. "$0.55"). */
export function fmtFee(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
