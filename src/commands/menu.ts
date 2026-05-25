import { InlineKeyboard } from "grammy";

export const RATES = [0, 3, 5, 7] as const;
export type Rate = (typeof RATES)[number];

export function mainMenuKeyboard() {
  return new InlineKeyboard()
    .text("💰 Дал в долг", "action:give")
    .text("🤝 Взял в долг", "action:take")
    .row()
    .text("📋 Мои долги", "action:loans")
    .text("⭐ Карма", "action:karma")
    .row()
    .text("📊 Статистика", "action:stats")
    .text("🤖 Советник", "action:advisor");
}

export function rateKeyboard(prefix: "give" | "take") {
  const kb = new InlineKeyboard();
  RATES.forEach((r, i) => {
    kb.text(`${r}%`, `rate:${prefix}:${r}`);
    if (i < RATES.length - 1 && (i + 1) % 2 === 0) kb.row();
  });
  kb.row().text("« Отмена", "action:cancel");
  return kb;
}

export function loanActionKeyboard(loanId: number, type: "given" | "taken") {
  const kb = new InlineKeyboard();
  if (type === "given") {
    kb.text("✅ Вернули", `loan:return:${loanId}`)
      .text("❌ Списать", `loan:writeoff:${loanId}`);
  } else {
    kb.text("✅ Я вернул", `loan:return:${loanId}`)
      .text("❌ Удалить", `loan:writeoff:${loanId}`);
  }
  return kb;
}

export function backToMenuKeyboard() {
  return new InlineKeyboard().text("« Главное меню", "action:menu");
}
