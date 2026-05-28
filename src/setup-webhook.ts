/**
 * Run once after deploying to Vercel to register the webhook URL + secret.
 *
 * Prerequisites:
 *   1. Add WEBHOOK_SECRET to Vercel env vars (any random string, ≥ 32 chars)
 *   2. git push so the updated webhook.ts with header check is live
 *
 * Usage:
 *   VERCEL_URL=https://zaymy-bot.vercel.app \
 *   WEBHOOK_SECRET=<same value as in Vercel> \
 *   npx tsx src/setup-webhook.ts
 */
import "dotenv/config";
import { Bot } from "grammy";

async function main() {
  const token = process.env.BOT_TOKEN;
  const vercelUrl = process.env.VERCEL_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!token) throw new Error("BOT_TOKEN is not set");
  if (!vercelUrl) throw new Error("VERCEL_URL is not set");
  if (!webhookSecret) {
    console.warn("⚠️  WEBHOOK_SECRET not set — registering without secret token (insecure).");
  }

  const bot = new Bot(token);
  const webhookUrl = `${vercelUrl}/api/webhook`;

  await bot.api.setWebhook(webhookUrl, {
    allowed_updates: ["message", "callback_query"],
    ...(webhookSecret ? { secret_token: webhookSecret } : {}),
  } as any);

  const info = await bot.api.getWebhookInfo();
  console.log("✅ Webhook set:", info.url);
  console.log("   Secret token:", webhookSecret ? "configured ✅" : "NOT SET ⚠️");
  console.log("   Pending updates:", info.pending_update_count);
}

main().catch(console.error);
