import type { Loan } from "./types";

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatAmount(amount: number): string {
  return amount.toLocaleString("ru-RU") + " ₽";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function daysLeft(dueDateIso: string): number {
  const due = new Date(dueDateIso).getTime();
  const now = Date.now();
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

export function deadlineLabel(dueDateIso: string): string {
  const days = daysLeft(dueDateIso);
  if (days < 0)  return `⚠️ просрочка ${Math.abs(days)} дн.`;
  if (days === 0) return `🔴 сегодня последний день!`;
  if (days === 1) return `🟠 завтра!`;
  if (days <= 3)  return `🟡 через ${days} дн.`;
  return `🟢 ${formatDate(dueDateIso)} (${days} дн.)`;
}

export function totalWithInterest(loan: Loan): number {
  if (loan.interest_rate === 0) return loan.amount;
  return loan.amount * (1 + (loan.interest_rate / 100) * (loan.term_days / 30));
}

// ─── Loan card text ───────────────────────────────────────────────────────────

export function loanLine(loan: Loan, index: number): string {
  const total = totalWithInterest(loan);
  const interestNote = loan.interest_rate > 0
    ? ` • ${loan.interest_rate}% → итого ${formatAmount(Math.round(total))}`
    : "";
  return (
    `${index}. <b>${loan.contact}</b>\n` +
    `   💵 ${formatAmount(loan.amount)}${interestNote}\n` +
    `   📅 ${deadlineLabel(loan.due_date)}`
  );
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

export function parseAmount(text: string): number | null {
  const clean = text.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) || n <= 0 ? null : n;
}

export function parseTerm(text: string): number | null {
  const n = parseInt(text.trim(), 10);
  return isNaN(n) || n <= 0 ? null : n;
}
