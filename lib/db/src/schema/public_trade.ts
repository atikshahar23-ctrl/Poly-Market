import { pgTable, serial, text, doublePrecision, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * Public trade feed — every closed trade (with a symbol) is saved here so users
 * can see each other’s paper trades.  Users can toggle `is_public` off to hide
 * their own trades from the feed.
 */
export const publicTrade = pgTable("public_trade", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  /** Name shown next to the trade (the user’s displayName at the time). */
  displayName: text("display_name").notNull(),
  /** Market symbol — BTC, ETH, AAPL, PEPE, etc. */
  symbol: text("symbol").notNull(),
  /** BINANCE | STOCK | POLYMARKET | FUNDING | OPTION */
  type: text("type").notNull(),
  /** LONG | SHORT | YES | NO */
  direction: text("direction"),
  entryPrice: doublePrecision("entry_price"),
  exitPrice: doublePrecision("exit_price"),
  /** Net P&L in paper dollars. */
  pnl: doublePrecision("pnl").notNull(),
  /** P&L percentage (cost basis). */
  pct: doublePrecision("pct"),
  leverage: doublePrecision("leverage"),
  /** Source label — bot name or “Manual”. */
  source: text("source"),
  closedAt: timestamp("closed_at", { withTimezone: true }).notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  /** User can hide their own trades from the public feed. */
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPublicTradeSchema = createInsertSchema(publicTrade);
export const selectPublicTradeSchema = createSelectSchema(publicTrade);

export type PublicTradeRow = typeof publicTrade.$inferSelect;
export type PublicTradeInsert = typeof publicTrade.$inferInsert;
