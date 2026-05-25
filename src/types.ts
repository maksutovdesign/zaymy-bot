export interface User {
  id: number;
  tg_id: number;
  name: string;
  karma: number;
  state: string | null; // JSON-encoded ConversationState
  created_at: string;
}

export interface Loan {
  id: number;
  user_id: number;
  type: "given" | "taken";
  contact: string;
  amount: number;
  term_days: number;
  interest_rate: number;
  status: "active" | "returned" | "overdue" | "written_off";
  due_date: string;
  created_at: string;
}

export interface KarmaEntry {
  id: number;
  user_id: number;
  points: number;
  reason: string;
  created_at: string;
}

// ─── Conversation state machine ───────────────────────────────────────────────

export type ConversationState =
  | { step: "idle" }
  | { step: "register:name" }
  | { step: "give:contact" }
  | { step: "give:amount"; contact: string }
  | { step: "give:term"; contact: string; amount: number }
  | { step: "give:rate"; contact: string; amount: number; term: number }
  | { step: "take:contact" }
  | { step: "take:amount"; contact: string }
  | { step: "take:term"; contact: string; amount: number }
  | { step: "take:rate"; contact: string; amount: number; term: number };
