/**
 * Run once after deploying to Vercel to register the webhook URL.
 * Usage: VERCEL_URL=https://your-bot.vercel.app pnpm setup-webhook
 */
import "dotenv/config";
import { Bot } from "grammy";

async function main() {
  const token = process.env.BOT_TOKEN;
  const vercelUrl = process.env.VERCEL_URL;

  if (!token) throw new Error("BOT_TOKEN is not set");
  if (!vercelUrl) throw new Error("VERCEL_URL is not set");

  const bot = new Bot(token);
  const webhookUrl = `${vercelUrl}/api/webhook`;

  await bot.api.setWebhook(webhookUrl, {
    allowed_updates: ["message", "callback_query"],
  });

  const info = await bot.api.getWebhookInfo();
  console.log("✅ Webhook set:", info.url);
  console.log("Pending updates:", info.pending_update_count);
}

main().catch(console.error);
