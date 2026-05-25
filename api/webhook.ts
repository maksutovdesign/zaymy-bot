/**
 * Vercel Node.js Serverless Function — receives Telegram updates via webhook.
 */
import { bot } from "../src/bot";
import { initDB } from "../src/db";

let ready = false;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(200).send("Bot is running ✅");
    return;
  }

  try {
    if (!ready) {
      await initDB();
      await bot.init(); // fetch bot info from Telegram once per instance
      ready = true;
    }
    await bot.handleUpdate(req.body);
  } catch (e: any) {
    console.error("[webhook] error:", e);
    // still return 200 so Telegram doesn't retry
    res.status(200).end();
    return;
  }

  res.status(200).end();
}
