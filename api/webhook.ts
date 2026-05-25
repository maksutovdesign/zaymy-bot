/**
 * Vercel Node.js Serverless Function — receives Telegram updates via webhook.
 */

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(200).send("Bot is running");
    return;
  }

  let bot: any;
  try {
    const module = await import("../src/bot");
    bot = module.bot;
  } catch (e: any) {
    console.error("[webhook] bot import failed:", e);
    res.status(200).json({ error: "bot_import_failed", message: e.message, stack: e.stack });
    return;
  }

  try {
    await bot.handleUpdate(req.body);
  } catch (e: any) {
    console.error("[webhook] handleUpdate failed:", e);
  }
  res.status(200).end();
}
