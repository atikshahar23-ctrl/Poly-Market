import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cryptoRouter from "./crypto";
import stocksRouter from "./stocks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cryptoRouter);
router.use(stocksRouter);

export default router;
