import type { Loan, User } from "../types.js";
import { formatAmount, daysLeft } from "../helpers.js";
import { getLevel } from "../karma.js";
import { backToMenuKeyboard } from "./menu.js";
import type { InlineKeyboard } from "grammy";

export function buildStatsMessage(
  user: User,
  allLoans: Loan[]
): { text: string; keyboard: InlineKeyboard } {
  const given  = allLoans.filter((l) => l.type === "given");
  const taken  = allLoans.filter((l) => l.type === "taken");
  const active = allLoans.filter((l) => l.status === "active");
  const returned = allLoans.filter((l) => l.status === "returned");

  const givenTotal  = given.reduce((s, l) => s + l.amount, 0);
  const takenTotal  = taken.reduce((s, l) => s + l.amount, 0);
  const activeGiven = active.filter((l) => l.type === "given");
  const activeTaken = active.filter((l) => l.type === "taken");

  const overdueCount = active.filter((l) => daysLeft(l.due_date) < 0).length;

  const level = getLevel(user.karma);

  const lines = [
    `📊 <b>Статистика — ${user.name}</b>\n`,
    `⭐ Карма: <b>${user.karma}</b> (${level.emoji} ${level.title})\n`,
    `💰 <b>Дал в долг</b>`,
    `   Всего займов: ${given.length}`,
    `   Активных: ${activeGiven.length} на ${formatAmount(activeGiven.reduce((s, l) => s + l.amount, 0))}`,
    `   Закрыто: ${given.filter((l) => l.status === "returned").length}`,
    `   Выдано всего: ${formatAmount(givenTotal)}\n`,
    `🤝 <b>Взял в долг</b>`,
    `   Всего займов: ${taken.length}`,
    `   Активных: ${activeTaken.length} на ${formatAmount(activeTaken.reduce((s, l) => s + l.amount, 0))}`,
    `   Закрыто: ${taken.filter((l) => l.status === "returned").length}`,
    `   Занял всего: ${formatAmount(takenTotal)}\n`,
    `✅ Возвратов: ${returned.length}`,
    overdueCount > 0
      ? `⚠️ Просрочек: <b>${overdueCount}</b>`
      : `✨ Просрочек: нет`,
    `\n💡 Баланс: ${formatAmount(givenTotal - takenTotal)} в твою пользу`,
  ];

  return { text: lines.join("\n"), keyboard: backToMenuKeyboard() };
}
