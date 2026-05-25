import { Bot } from "grammy";
import {
  getUser, getOrCreateUser, setState, clearState,
  addLoan, addKarma, getActiveLoans, getLoan,
  updateLoanStatus, getAllLoansForUser, getKarmaHistory,
} from "../db.js";
import { formatAmount } from "../helpers.js";
import { mainMenuKeyboard, backToMenuKeyboard } from "../commands/menu.js";
import { buildLoansMessage, buildLoanDetailMessage } from "../commands/loans.js";
import { buildKarmaMessage } from "../commands/karma.js";
import { buildStatsMessage } from "../commands/stats.js";
import { getAdvisorTip } from "../advisor.js";
import type { ConversationState } from "../types.js";

export function registerCallbackHandler(bot: Bot) {
  bot.on("callback_query:data", async (ctx) => {
    const tgId = ctx.from.id;
    const data = ctx.callbackQuery.data;

    const user = await getOrCreateUser(
      tgId,
      ctx.from.first_name + (ctx.from.last_name ? " " + ctx.from.last_name : "")
    );

    // ── Navigation ─────────────────────────────────────────────────────────────
    if (data === "action:menu") {
      await clearState(tgId);
      await ctx.editMessageText(
        `🏠 <b>Главное меню</b>\n\n${getAdvisorTip("welcome")}`,
        { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
      );
      await ctx.answerCallbackQuery();
      return;
    }

    if (data === "action:cancel") {
      await clearState(tgId);
      await ctx.editMessageText(
        "❌ Отменено.\n\nЧем могу помочь?",
        { reply_markup: mainMenuKeyboard() }
      );
      await ctx.answerCallbackQuery("Отменено");
      return;
    }

    // ── Start give loan flow ───────────────────────────────────────────────────
    if (data === "action:give") {
      await setState(tgId, { step: "give:contact" });
      await ctx.editMessageText(
        `💰 <b>Дал в долг</b>\n\n${getAdvisorTip("give")}\n\nКому ты даёшь в долг? (имя или контакт)`,
        { parse_mode: "HTML", reply_markup: backToMenuKeyboard() }
      );
      await ctx.answerCallbackQuery();
      return;
    }

    // ── Start take loan flow ───────────────────────────────────────────────────
    if (data === "action:take") {
      await setState(tgId, { step: "take:contact" });
      await ctx.editMessageText(
        `🤝 <b>Взял в долг</b>\n\n${getAdvisorTip("take")}\n\nУ кого ты берёшь в долг? (имя или контакт)`,
        { parse_mode: "HTML", reply_markup: backToMenuKeyboard() }
      );
      await ctx.answerCallbackQuery();
      return;
    }

    // ── Rate selection (give) ──────────────────────────────────────────────────
    if (data.startsWith("rate:give:")) {
      const rate = parseFloat(data.split(":")[2]);
      const state = await import("../db.js").then((m) => m.getState(tgId));

      if (state.step !== "give:rate") {
        await ctx.answerCallbackQuery("Сначала начни создание займа");
        return;
      }

      const loanId = await addLoan(
        user.id, "given", state.contact, state.amount, state.term, rate
      );
      const newKarma = await addKarma(user.id, 40, `Дал займ ${state.contact}`);
      await clearState(tgId);

      await ctx.editMessageText(
        `✅ <b>Займ записан!</b>\n\n` +
        `👤 ${state.contact}\n` +
        `💵 ${formatAmount(state.amount)}` + (rate > 0 ? ` • ${rate}%/мес` : "") + `\n` +
        `📅 ${state.term} дней\n\n` +
        `⭐ +40 к карме! Теперь у тебя <b>${newKarma}</b> очков.\n\n` +
        `${getAdvisorTip("give")}`,
        { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
      );
      await ctx.answerCallbackQuery("Займ записан ✅");
      return;
    }

    // ── Rate selection (take) ──────────────────────────────────────────────────
    if (data.startsWith("rate:take:")) {
      const rate = parseFloat(data.split(":")[2]);
      const state = await import("../db.js").then((m) => m.getState(tgId));

      if (state.step !== "take:rate") {
        await ctx.answerCallbackQuery("Сначала начни создание займа");
        return;
      }

      await addLoan(
        user.id, "taken", state.contact, state.amount, state.term, rate
      );
      await clearState(tgId);

      await ctx.editMessageText(
        `✅ <b>Займ записан!</b>\n\n` +
        `👤 Занял у: ${state.contact}\n` +
        `💵 ${formatAmount(state.amount)}` + (rate > 0 ? ` • ${rate}%/мес` : "") + `\n` +
        `📅 ${state.term} дней\n\n` +
        `${getAdvisorTip("take")}`,
        { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
      );
      await ctx.answerCallbackQuery("Займ записан ✅");
      return;
    }

    // ── Loans list ─────────────────────────────────────────────────────────────
    if (data === "action:loans") {
      const loans = await getActiveLoans(user.id);
      const { text, keyboard } = buildLoansMessage(loans);
      await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
      await ctx.answerCallbackQuery();
      return;
    }

    // ── Loan detail ────────────────────────────────────────────────────────────
    if (data.startsWith("loan:select:")) {
      const loanId = parseInt(data.split(":")[2]);
      const loan = await getLoan(loanId);
      if (!loan || loan.user_id !== user.id) {
        await ctx.answerCallbackQuery("Займ не найден");
        return;
      }
      const { loanLine } = await import("../helpers.js");
      await ctx.editMessageText(
        `📄 <b>Займ</b>\n\n${loanLine(loan, 1)}\n\nЧто сделать?`,
        {
          parse_mode: "HTML",
          reply_markup: (await import("../commands/menu.js")).loanActionKeyboard(loan.id, loan.type),
        }
      );
      await ctx.answerCallbackQuery();
      return;
    }

    // ── Mark loan as returned ──────────────────────────────────────────────────
    if (data.startsWith("loan:return:")) {
      const loanId = parseInt(data.split(":")[2]);
      const loan = await getLoan(loanId);
      if (!loan || loan.user_id !== user.id) {
        await ctx.answerCallbackQuery("Займ не найден");
        return;
      }

      await updateLoanStatus(loanId, "returned");

      // Early or on-time return karma
      const { daysLeft } = await import("../helpers.js");
      const days = daysLeft(loan.due_date);
      const isEarly = days > 0 && loan.type === "taken";
      const karmaPoints = isEarly ? 20 : 10;
      const karmaReason = isEarly
        ? `Вернул досрочно (${loan.contact})`
        : `Вернули вовремя (${loan.contact})`;
      const newKarma = await addKarma(user.id, karmaPoints, karmaReason);

      await ctx.editMessageText(
        `✅ <b>Займ закрыт!</b>\n\n` +
        `👤 ${loan.contact} • ${formatAmount(loan.amount)}\n\n` +
        `⭐ +${karmaPoints} к карме! Теперь <b>${newKarma}</b> очков.\n\n` +
        `${getAdvisorTip("return")}`,
        { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
      );
      await ctx.answerCallbackQuery("Займ закрыт ✅");
      return;
    }

    // ── Write off loan ─────────────────────────────────────────────────────────
    if (data.startsWith("loan:writeoff:")) {
      const loanId = parseInt(data.split(":")[2]);
      const loan = await getLoan(loanId);
      if (!loan || loan.user_id !== user.id) {
        await ctx.answerCallbackQuery("Займ не найден");
        return;
      }

      await updateLoanStatus(loanId, "written_off");
      await ctx.editMessageText(
        `🗑 Займ <b>${loan.contact}</b> на ${formatAmount(loan.amount)} списан.`,
        { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
      );
      await ctx.answerCallbackQuery("Списано");
      return;
    }

    // ── Karma ──────────────────────────────────────────────────────────────────
    if (data === "action:karma") {
      const history = await getKarmaHistory(user.id);
      const { text, keyboard } = buildKarmaMessage(user, history);
      await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
      await ctx.answerCallbackQuery();
      return;
    }

    // ── Stats ──────────────────────────────────────────────────────────────────
    if (data === "action:stats") {
      const allLoans = await getAllLoansForUser(user.id);
      const { text, keyboard } = buildStatsMessage(user, allLoans);
      await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
      await ctx.answerCallbackQuery();
      return;
    }

    // ── Advisor ────────────────────────────────────────────────────────────────
    if (data === "action:advisor") {
      const tips = [
        getAdvisorTip("give"),
        getAdvisorTip("karma"),
        getAdvisorTip("stats"),
      ];
      await ctx.editMessageText(
        `🤖 <b>Советник</b>\n\n` + tips.join("\n\n"),
        { parse_mode: "HTML", reply_markup: backToMenuKeyboard() }
      );
      await ctx.answerCallbackQuery();
      return;
    }

    await ctx.answerCallbackQuery();
  });
}
