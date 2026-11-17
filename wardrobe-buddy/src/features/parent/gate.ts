/**
 * Parental gate (PRIVACY_SAFETY §2.5): an adult-level task, never "tap here".
 * Two-digit × two-digit multiplication with a typed answer (e.g. 47 × 26), and a
 * 30-second pause after 3 wrong answers so guessing doesn't work.
 * Apple asks for "adult-level tasks" (developer.apple.com/app-store/parental-gates, per the privacy audit);
 * the exact difficulty is an owner decision (D-025). A parent-set PIN is the stronger alternative.
 */
export interface GateQuestion {
  a: number;
  b: number;
  answer: number;
}

export const GATE_MAX_TRIES = 3;
export const GATE_COOLDOWN_MS = 30_000;

export function makeGateQuestion(rand: () => number = Math.random): GateQuestion {
  const a = 13 + Math.floor(rand() * 85); // 13–97
  const b = 12 + Math.floor(rand() * 18); // 12–29
  return { a, b, answer: a * b };
}

export function checkGateAnswer(q: GateQuestion, input: string): boolean {
  const digits = input.trim();
  return /^\d{1,4}$/.test(digits) && Number(digits) === q.answer;
}
