import type { KarmaEntry, User } from "../types";
import { getLevel, getNextLevel, progressBar, KARMA_RULES } from "../karma";
import { backToMenuKeyboard } from "./menu";
import type { InlineKeyboard } from "grammy";

export function buildKarmaMessage(
  user: User,
  history: KarmaEntry[]
): { text: string; keyboard: InlineKeyboard } {
  const level = getLevel(user.karma);
  const next = getNextLevel(user.karma);

  const lines: string[] = [
    `⭐ <b>Карма</b>\n`,
    `🔢 <b>${user.karma.toLocaleString("ru-RU")} очков</b>`,
    `${level.emoji} Уровень: <b>${level.title}</b>\n`,
  ];

  if (next) {
    lines.push(
      `Прогресс до «${next.title}»:`,
      `<code>${progressBar(user.karma)}</code>`,
      `${level.min} ▸▸▸ ${next.min - 1}\n`
    );
  } else {
    lines.push("🏆 Максимальный уровень достигнут!\n");
  }

  if (history.length > 0) {
    lines.push("📈 <b>Последние события</b>");
    history.slice(0, 8).forEach((e) => {
      const sign = e.points > 0 ? `+${e.points}` : `${e.points}`;
      lines.push(`${e.points > 0 ? "▲" : "▼"} ${sign} — ${e.reason}`);
    });
    lines.push("");
  }

  lines.push("📖 <b>Как начисляется карма</b>");
  KARMA_RULES.forEach((r) => {
    const sign = r.points > 0 ? `+${r.points}` : `${r.points}`;
    lines.push(`• ${sign} — ${r.label}`);
  });

  return { text: lines.join("\n"), keyboard: backToMenuKeyboard() };
}
