import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { globalRateLimit } from "./lib/rateLimiter";

const app: Express = express();

// Trust exactly one reverse-proxy hop (the Replit edge proxy). This lets
// Express correctly derive req.ip from X-Forwarded-For while refusing to trust
// any additional hops that an attacker could inject.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global admission control: 120 requests/minute per IP across all /api routes.
app.use("/api", globalRateLimit);

app.use("/api", router);

export default app;
