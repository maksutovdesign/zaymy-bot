import { Bot } from "grammy";
import { clearState } from "./db";
import { registerMessageHandler } from "./handlers/message";
import { registerCallbackHandler } from "./handlers/callback";
import { mainMenuKeyboard } from "./commands/menu";

if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not set");
}

export const bot = new Bot(process.env.BOT_TOKEN);

// ── Global error handler ─────────────────────────────────────────────────────
bot.catch((err) => {
  console.error("[bot] Unhandled error:", err.message, err.error);
});

// ── Commands ─────────────────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  // Delegates to message handler by simulating /start as text
  await ctx.reply(
    `👋 Привет, <b>${ctx.from?.first_name ?? "друг"}</b>!\n\nНажми /menu чтобы открыть главное меню.`,
    { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
  );
});

bot.command("menu", async (ctx) => {
  await ctx.reply("🏠 Главное меню:", { reply_markup: mainMenuKeyboard() });
});

bot.command("cancel", async (ctx) => {
  await clearState(ctx.from!.id);
  await ctx.reply("❌ Отменено.", { reply_markup: mainMenuKeyboard() });
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `ℹ️ <b>Команды</b>\n\n` +
    `/menu — главное меню\n` +
    `/cancel — отмена текущего действия\n` +
    `/help — эта справка\n\n` +
    `<b>Функции:</b>\n` +
    `• 💰 Дал в долг — записать выданный займ\n` +
    `• 🤝 Взял в долг — записать взятый займ\n` +
    `• 📋 Мои долги — список активных займов\n` +
    `• ⭐ Карма — твой уровень надёжности\n` +
    `• 📊 Статистика — сводка по всем займам\n` +
    `• 🤖 Советник — советы по займам`,
    { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
  );
});

// ── Handlers ──────────────────────────────────────────────────────────────────
registerMessageHandler(bot);
registerCallbackHandler(bot);
