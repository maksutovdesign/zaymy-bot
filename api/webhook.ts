/**
 * Vercel Node.js Serverless Function — receives Telegram updates via webhook.
 */
import { bot } from "../src/bot";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(200).send("Bot is running");
    return;
  }
  try {
    await bot.handleUpdate(req.body);
  } catch (e) {
    console.error("[webhook]", e);
  }
  // Always respond 200 — Telegram retries on any other status
  res.status(200).end();
}
