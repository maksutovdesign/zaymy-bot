import { Bot } from "grammy";
import {
  getUser, getOrCreateUser, setState, clearState, getState,
  addLoan, addKarma, setUserName,
} from "../db";
import { parseAmount, parseTerm } from "../helpers";
import { mainMenuKeyboard, rateKeyboard } from "../commands/menu";
import { getAdvisorTip } from "../advisor";
import type { ConversationState } from "../types";

export function registerMessageHandler(bot: Bot) {
  bot.on("message:text", async (ctx) => {
    const tgId = ctx.from.id;
    const text = ctx.message.text.trim();

    // ── Commands ──────────────────────────────────────────────────────────────
    if (text === "/start" || text === "/menu") {
      const user = await getOrCreateUser(
        tgId,
        ctx.from.first_name + (ctx.from.last_name ? " " + ctx.from.last_name : "")
      );

      if (!user.name || user.name.trim() === "") {
        await setState(tgId, { step: "register:name" });
        await ctx.reply(
          `👋 Привет! Я бот <b>«Дай в долг»</b> — помогаю вести учёт займов между друзьями.\n\nКак тебя зовут?`,
          { parse_mode: "HTML" }
        );
        return;
      }

      await clearState(tgId);
      await ctx.reply(
        `👋 Привет, <b>${user.name}</b>!\n\n${getAdvisorTip("welcome")}`,
        { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
      );
      return;
    }

    if (text === "/cancel") {
      await clearState(tgId);
      await ctx.reply("Отменено.", { reply_markup: mainMenuKeyboard() });
      return;
    }

    if (text === "/karma") {
      // delegated to callback handler logic — just show menu
      await ctx.reply("Используй меню ниже 👇", { reply_markup: mainMenuKeyboard() });
      return;
    }

    // ── Get or create user ────────────────────────────────────────────────────
    const user = await getOrCreateUser(
      tgId,
      ctx.from.first_name + (ctx.from.last_name ? " " + ctx.from.last_name : "")
    );
    const state = await getState(tgId);

    // ── State machine ─────────────────────────────────────────────────────────
    switch (state.step) {
      // ── Registration ────────────────────────────────────────────────────────
      case "register:name": {
        if (text.length < 2 || text.length > 40) {
          await ctx.reply("Имя должно быть от 2 до 40 символов. Попробуй ещё раз:");
          return;
        }
        await setUserName(tgId, text);
        await clearState(tgId);
        await ctx.reply(
          `✅ Отлично, <b>${text}</b>! Добро пожаловать!\n\n${getAdvisorTip("welcome")}`,
          { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
        );
        return;
      }

      // ── Give loan flow ───────────────────────────────────────────────────────
      case "give:contact": {
        if (text.length < 1 || text.length > 60) {
          await ctx.reply("Введи имя или контакт (до 60 символов):");
          return;
        }
        await setState(tgId, { step: "give:amount", contact: text });
        await ctx.reply(`💵 Сколько рублей даёшь <b>${text}</b> в долг?`, {
          parse_mode: "HTML",
        });
        return;
      }

      case "give:amount": {
        const amount = parseAmount(text);
        if (!amount) {
          await ctx.reply("Введи корректную сумму (например: 5000):");
          return;
        }
        await setState(tgId, { step: "give:term", contact: state.contact, amount });
        await ctx.reply("📅 На сколько дней?");
        return;
      }

      case "give:term": {
        const term = parseTerm(text);
        if (!term) {
          await ctx.reply("Введи количество дней (например: 30):");
          return;
        }
        await setState(tgId, {
          step: "give:rate",
          contact: state.contact,
          amount: state.amount,
          term,
        });
        await ctx.reply(
          `📈 Выбери процент (% в месяц):`,
          { reply_markup: rateKeyboard("give") }
        );
        return;
      }

      // ── Take loan flow ───────────────────────────────────────────────────────
      case "take:contact": {
        if (text.length < 1 || text.length > 60) {
          await ctx.reply("Введи имя или контакт (до 60 символов):");
          return;
        }
        await setState(tgId, { step: "take:amount", contact: text });
        await ctx.reply(`💵 Сколько рублей берёшь у <b>${text}</b>?`, {
          parse_mode: "HTML",
        });
        return;
      }

      case "take:amount": {
        const amount = parseAmount(text);
        if (!amount) {
          await ctx.reply("Введи корректную сумму (например: 3000):");
          return;
        }
        await setState(tgId, { step: "take:term", contact: state.contact, amount });
        await ctx.reply("📅 На сколько дней?");
        return;
      }

      case "take:term": {
        const term = parseTerm(text);
        if (!term) {
          await ctx.reply("Введи количество дней (например: 14):");
          return;
        }
        await setState(tgId, {
          step: "take:rate",
          contact: state.contact,
          amount: state.amount,
          term,
        });
        await ctx.reply("📈 Выбери процент (% в месяц):", {
          reply_markup: rateKeyboard("take"),
        });
        return;
      }

      // ── Idle fallback ────────────────────────────────────────────────────────
      default: {
        await ctx.reply(
          "Используй меню ниже или команду /menu 👇",
          { reply_markup: mainMenuKeyboard() }
        );
      }
    }
  });
}
