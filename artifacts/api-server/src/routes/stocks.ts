import { Router, type IRouter } from "express";
import { fetchStockQuotes, buildStockRecommendations } from "../lib/stocks";
import {
  GetStocksResponse,
  GetStockRecommendationsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stocks", async (req, res): Promise<void> => {
  try {
    const data = await fetchStockQuotes();
    res.json(GetStocksResponse.parse(data));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch stock quotes");
    res.status(502).json({ error: "Failed to fetch stock market data" });
  }
});

router.get("/stocks/recommendations", async (req, res): Promise<void> => {
  try {
    const data = await buildStockRecommendations();
    res.json(GetStockRecommendationsResponse.parse(data));
  } catch (err) {
    req.log.error({ err }, "Failed to build stock recommendations");
    res.status(502).json({ error: "Failed to build stock recommendations" });
  }
});

export default router;
