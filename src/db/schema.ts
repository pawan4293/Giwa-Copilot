import { pgTable, text, numeric, boolean, timestamp, serial, integer } from "drizzle-orm/pg-core";

export const splits = pgTable("splits", {
  id: serial("id").primaryKey(),
  creatorAddress: text("creator_address").notNull(),
  description: text("description").notNull(),
  totalAmountEth: numeric("total_amount_eth").notNull(),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const splitRecipients = pgTable("split_recipients", {
  id: serial("id").primaryKey(),
 splitId: integer("split_id").notNull(),
  identifier: text("identifier").notNull(), // .up.id name or 0x address, as typed
  resolvedAddress: text("resolved_address").notNull(), // always the real 0x address
  amountEth: numeric("amount_eth").notNull(),
  paid: boolean("paid").default(false).notNull(),
  paidTxHash: text("paid_tx_hash"),
});