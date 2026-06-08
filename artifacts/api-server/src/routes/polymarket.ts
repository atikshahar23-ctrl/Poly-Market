import { Router, type IRouter } from "express";
import { expensiveRateLimit } from "../lib/rateLimiter";
import { GetPolymarketPriceHistoryQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/polymarket/price-history", expensiveRateLimit, async (req, res): Promise<void> => {
  const rawMarketId = req.query["marketId"];
  if (typeof rawMarketId !== "string" || !rawMarketId.trim()) {
    res.status(400).json({ error: "Missing or invalid marketId" });
    return;
  }
  const parsed = GetPolymarketPriceHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { marketId, interval, startTs: rawStartTs, endTs: rawEndTs } = parsed.data;

  try {
    const url = new URL("https://clob.polymarket.com/prices-history");
    url.searchParams.set("market", marketId);
    url.searchParams.set("interval", interval);
    url.searchParams.set("fidelity", "60");
    if (Number.isFinite(rawStartTs)) url.searchParams.set("startTs", String(rawStartTs));
    if (Number.isFinite(rawEndTs)) url.searchParams.set("endTs", String(rawEndTs));

    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "application/json" },
    });

    if (!resp.ok) {
      req.log.warn({ status: resp.status, marketId }, "Polymarket CLOB prices-history non-200");
      res.status(502).json({ error: "Failed to fetch price history from Polymarket" });
      return;
    }

    const data = (await resp.json()) as
      | { history?: { t: number; p: string }[] }
      | { t: number; p: string }[];

    const points = Array.isArray(data)
      ? data
      : ((data as { history?: { t: number; p: string }[] }).history ?? []);

    res.json(points);
  } catch (err) {
    req.log.error({ err, marketId }, "Failed to proxy Polymarket price history");
    res.status(502).json({ error: "Failed to fetch price history" });
  }
});

export default router;
