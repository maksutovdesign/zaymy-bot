interface KarmaLevel {
  min: number;
  max: number | null;
  title: string;
  emoji: string;
}

export const KARMA_LEVELS: KarmaLevel[] = [
  { min: 0,     max: 100,   title: "Новичок",            emoji: "⚪" },
  { min: 101,   max: 500,   title: "Надёжный",           emoji: "🔵" },
  { min: 501,   max: 1500,  title: "Доверенный",         emoji: "🟢" },
  { min: 1501,  max: 5000,  title: "Уважаемый",          emoji: "🟡" },
  { min: 5001,  max: 15000, title: "Авторитетный",       emoji: "🟣" },
  { min: 15001, max: null,  title: "Великий уровнитель", emoji: "⭐" },
];

export function getLevel(karma: number): KarmaLevel {
  return (
    KARMA_LEVELS.find((l) => karma >= l.min && (l.max === null || karma <= l.max)) ??
    KARMA_LEVELS[0]
  );
}

export function getNextLevel(karma: number): KarmaLevel | null {
  const idx = KARMA_LEVELS.findIndex(
    (l) => karma >= l.min && (l.max === null || karma <= l.max)
  );
  return idx < KARMA_LEVELS.length - 1 ? KARMA_LEVELS[idx + 1] : null;
}

export function progressBar(karma: number): string {
  const level = getLevel(karma);
  const next = getNextLevel(karma);
  if (!next || level.max === null) return "▓".repeat(10) + " макс.";

  const pct = Math.min((karma - level.min) / (level.max - level.min), 1);
  const filled = Math.round(pct * 10);
  return "▓".repeat(filled) + "░".repeat(10 - filled) + ` ${Math.round(pct * 100)}%`;
}

export const KARMA_RULES = [
  { label: "Дал займ",            points: +40 },
  { label: "Вернули вовремя",     points: +10 },
  { label: "Вернули досрочно",    points: +20 },
  { label: "Просрочка (каждый день)", points: -5 },
];
