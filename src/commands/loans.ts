import type { Loan } from "../types.js";
import { formatAmount, loanLine } from "../helpers.js";
import { loanActionKeyboard, backToMenuKeyboard } from "./menu.js";
import { InlineKeyboard } from "grammy";

export function buildLoansMessage(loans: Loan[]): {
  text: string;
  keyboard: InlineKeyboard;
} {
  const given = loans.filter((l) => l.type === "given");
  const taken = loans.filter((l) => l.type === "taken");

  if (loans.length === 0) {
    return {
      text: "📋 <b>Активных долгов нет</b>\n\nИспользуй «💰 Дал в долг» или «🤝 Взял в долг» чтобы добавить займ.",
      keyboard: backToMenuKeyboard(),
    };
  }

  const lines: string[] = ["📋 <b>Активные долги</b>\n"];

  if (given.length > 0) {
    const total = given.reduce((s, l) => s + l.amount, 0);
    lines.push(`💰 <b>Дал в долг</b> — ${given.length} займ(а), ${formatAmount(total)}\n`);
    given.forEach((l, i) => lines.push(loanLine(l, i + 1)));
    lines.push("");
  }

  if (taken.length > 0) {
    const total = taken.reduce((s, l) => s + l.amount, 0);
    lines.push(`🤝 <b>Взял в долг</b> — ${taken.length} займ(а), ${formatAmount(total)}\n`);
    taken.forEach((l, i) => lines.push(loanLine(l, i + 1)));
  }

  // Build keyboard: one row per loan with action buttons
  const kb = new InlineKeyboard();
  loans.forEach((loan) => {
    const icon = loan.type === "given" ? "💰" : "🤝";
    kb.text(
      `${icon} ${loan.contact} ${formatAmount(loan.amount)}`,
      `loan:select:${loan.id}`
    ).row();
  });
  kb.text("« Главное меню", "action:menu");

  return { text: lines.join("\n"), keyboard: kb };
}

export function buildLoanDetailMessage(loan: Loan): {
  text: string;
  keyboard: InlineKeyboard;
} {
  const { loanLine } = require("../helpers.js");
  const text =
    `📄 <b>Детали займа</b>\n\n` +
    loanLine(loan, 1) +
    `\n\nЧто сделать?`;
  return {
    text,
    keyboard: loanActionKeyboard(loan.id, loan.type),
  };
}
