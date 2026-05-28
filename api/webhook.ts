/**
 * Vercel Node.js Serverless Function — receives Telegram updates via webhook.
 *
 * Security: Telegram sends X-Telegram-Bot-Api-Secret-Token on every request
 * when the webhook was registered with a secret_token parameter.
 * We reject any request that doesn't carry the correct header.
 * Set WEBHOOK_SECRET in Vercel env vars and re-run `npm run setup-webhook`.
 */
import { bot } from "../src/bot";
import { initDB } from "../src/db";

let ready = false;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(200).send("Bot is running ✅");
    return;
  }

  // ── Verify Telegram secret header ────────────────────────────────────────
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret) {
    const incoming = req.headers["x-telegram-bot-api-secret-token"];
    if (incoming !== webhookSecret) {
      // Return 401 — Telegram will retry, imposters get nothing
      res.status(401).end();
      return;
    }
  } else {
    // Secret not configured yet — log warning but don't block
    // (avoids breaking existing deployments before WEBHOOK_SECRET is added)
    console.warn("[webhook] WEBHOOK_SECRET not set — requests are not verified!");
  }

  // ── Process update ────────────────────────────────────────────────────────
  try {
    if (!ready) {
      await initDB();
      await bot.init();
      ready = true;
    }
    await bot.handleUpdate(req.body);
  } catch (e: any) {
    console.error("[webhook] error:", e);
  }

  res.status(200).end();
}
