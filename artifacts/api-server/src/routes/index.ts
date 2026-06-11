import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cryptoRouter from "./crypto";
import stocksRouter from "./stocks";
import fundingRouter from "./funding";
import polymarketRouter from "./polymarket";
import userStateRouter from "./userState";
import socialRouter from "./social";
import adminRouter from "./admin";
import binanceCredRouter from "./binanceCredentials";
import binanceFuturesRouter from "./binanceFutures";
import telegramRouter from "./telegram";
import accountRouter from "./account";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cryptoRouter);
router.use(stocksRouter);
router.use(fundingRouter);
router.use(polymarketRouter);
router.use(userStateRouter);
router.use(socialRouter);
router.use(adminRouter);
router.use(binanceCredRouter);
router.use(binanceFuturesRouter);
router.use(telegramRouter);
router.use(accountRouter);

export default router;
