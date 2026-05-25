/**
 * Vercel serverless function — receives Telegram updates via webhook.
 */
import { webhookCallback } from "grammy";

// Lazy-load bot to avoid issues with module caching between invocations
export default async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const { bot } = await import("../src/bot.js");
  const cb = webhookCallback(bot, "std/http");
  return cb(req);
}

export const config = { runtime: "edge" };
