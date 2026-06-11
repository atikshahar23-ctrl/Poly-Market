import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, userState, appUser, publicTrade } from "@workspace/db";
import { logger } from "../lib/logger";
import { makeRateLimiter } from "../lib/rateLimiter";

const router: IRouter = Router();

const deleteLimit = makeRateLimiter(
  3,
  60_000,
  "Too many delete attempts, please slow down.",
  (req) => getAuth(req).userId ?? req.ip ?? "unknown",
);

/** DELETE /account — permanently delete the caller's account and all data. */
router.delete("/account", deleteLimit, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    // Best-effort local cleanup first.
    await db.delete(publicTrade).where(eq(publicTrade.userId, userId));
    await db.delete(userState).where(eq(userState.userId, userId));
    await db.delete(appUser).where(eq(appUser.userId, userId));

    // Authoritative deletion of the Clerk account.
    await clerkClient.users.deleteUser(userId);

    res.json({ deleted: true });
  } catch (err) {
    logger.error({ err, userId }, "Account deletion failed");
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
