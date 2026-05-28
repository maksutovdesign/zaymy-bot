/**
 * Vercel Cron Job — runs daily at 09:00 UTC.
 * Sends reminders for loans due tomorrow and penalises overdue loans.
 */
import { Bot } from "grammy";
import { initDB, getDueTomorrowLoans, getOverdueActiveLoans, addKarma, markLoanPenalizedToday } from "../src/db";
import { formatAmount } from "../src/helpers";
import { getAdvisorTip } from "../src/advisor";

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

  const bot = new Bot(token);
  await initDB();

  let sent = 0;
  let penalised = 0;

  // ── Remind about loans due tomorrow ────────────────────────────────────────
  const dueTomorrow = await getDueTomorrowLoans();
  for (const loan of dueTomorrow) {
    try {
      const what = loan.type === "given"
        ? `<b>${loan.contact}</b> должен вернуть тебе <b>${formatAmount(loan.amount)}</b>`
        : `Ты должен вернуть <b>${formatAmount(loan.amount)}</b> → <b>${loan.contact}</b>`;

      await bot.api.sendMessage(
        loan.tg_id,
        `⏰ <b>Напоминание — завтра срок!</b>\n\n${what}\n\n${getAdvisorTip("overdue")}`,
        { parse_mode: "HTML" }
      );
      sent++;
    } catch (e) {
      console.warn("[cron] notify failed", loan.tg_id, e);
    }
  }

  // ── Penalise overdue loans (-5 karma/day, idempotent) ─────────────────────
  // getOverdueActiveLoans() already filters out loans penalised today,
  // so re-runs / retries within the same UTC day are safe.
  const overdue = await getOverdueActiveLoans();
  for (const loan of overdue) {
    try {
      await addKarma(loan.user_id, -5, `Просрочка: ${loan.contact} (${formatAmount(loan.amount)})`);
      await markLoanPenalizedToday(loan.id);
      penalised++;
    } catch (e) {
      console.warn("[cron] karma penalty failed", loan.id, e);
    }
  }

  console.log(`[cron] sent=${sent} penalised=${penalised}`);
  res.status(200).json({ ok: true, sent, penalised });
}
