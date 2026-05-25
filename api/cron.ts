/**
 * Vercel Cron Job — runs daily at 09:00 UTC.
 * Sends reminders for loans due tomorrow and marks overdue loans.
 * Protected by CRON_SECRET env var.
 */
import { Bot } from "grammy";
import { initDB, getDueTomorrowLoans, getOverdueActiveLoans, addKarma } from "../src/db.js";
import { formatAmount } from "../src/helpers.js";
import { getAdvisorTip } from "../src/advisor.js";

export default async function handler(req: Request): Promise<Response> {
  // Verify cron secret to prevent unauthorised calls
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = process.env.BOT_TOKEN;
  if (!token) return new Response("BOT_TOKEN not set", { status: 500 });

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
      console.warn("[cron] Failed to notify", loan.tg_id, e);
    }
  }

  // ── Penalise overdue loans (-5 karma/day) ──────────────────────────────────
  const overdue = await getOverdueActiveLoans();
  for (const loan of overdue) {
    try {
      // Need user_id — get it from loan
      await addKarma(loan.user_id, -5, `Просрочка: ${loan.contact} (${formatAmount(loan.amount)})`);
      penalised++;
    } catch (e) {
      console.warn("[cron] Failed to penalise karma for loan", loan.id, e);
    }
  }

  console.log(`[cron] done: sent=${sent}, karma_penalised=${penalised}`);
  return new Response(JSON.stringify({ sent, penalised }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
