/**
 * Vercel Cron Job — runs daily at 18:00 UTC (21:00 Moscow).
 * Posts a daily tip/fact/quote/case/question to the @day_v_dolg channel.
 */
import { Bot } from "grammy";
import { getChannelPost, TOTAL_POSTS } from "../src/channel-posts";

const CHANNEL = "@day_v_dolg";

export default async function handler(req: any, res: any) {
  const secret = (req.headers["authorization"] ?? "").replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: "BOT_TOKEN not set" });
    return;
  }

  // Day-of-year index (0-based), cycles through all posts
  const now = new Date();
  const startOfYear = new Date(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );
  const postIndex = (dayOfYear - 1) % TOTAL_POSTS; // dayOfYear starts at 1

  const text = getChannelPost(postIndex);

  const bot = new Bot(token);
  try {
    await bot.api.sendMessage(CHANNEL, text, { parse_mode: "HTML" });
    console.log(`[channel-post] day=${dayOfYear} index=${postIndex} → sent to ${CHANNEL}`);
    res.status(200).json({ ok: true, day: dayOfYear, index: postIndex });
  } catch (e: any) {
    console.error("[channel-post] failed:", e?.message);
    res.status(500).json({ ok: false, error: e?.message });
  }
}
