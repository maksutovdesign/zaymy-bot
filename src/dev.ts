/**
 * Local development — polling mode (no webhook needed).
 * Run: pnpm dev
 */
import "dotenv/config";
import { bot } from "./bot";
import { initDB } from "./db";

async function main() {
  await initDB();
  console.log("[dev] DB initialized");
  console.log("[dev] Starting bot in polling mode...");
  await bot.start({
    onStart: (info) => {
      console.log(`[dev] Bot @${info.username} is running`);
    },
  });
}

main().catch(console.error);
