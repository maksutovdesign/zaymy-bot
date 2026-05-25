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
      ready = true;
    }
    await bot.handleUpdate(req.body);
  } catch (e: any) {
    // Surface the error so we can see it during debugging
    console.error("[webhook] error:", e);
    res.status(200).json({ ok: false, error: e?.message ?? String(e) });
    return;
  }

  res.status(200).end();
}
