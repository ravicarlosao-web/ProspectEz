export type QuotaRow = {
  plan_type: string;
  weekly_limit: number;
  monthly_limit: number;
  used_this_week: number;
  used_this_month: number;
  tokens_added_manually: number;
  weekly_carry_over: number;
  last_weekly_reset: string | null;
  last_monthly_reset: string | null;
};

/** Remaining weeks in the current month, including the current week (min 1). */
export const remainingWeeksInMonth = (from: Date = new Date()): number => {
  const endOfMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0);
  const daysLeft = Math.ceil((endOfMonth.getTime() - from.getTime()) / 86400000) + 1;
  return Math.max(1, Math.ceil(daysLeft / 7));
};

/** Start of the current ISO week (Monday 00:00:00 local). */
export const currentWeekStart = (from: Date = new Date()): Date => {
  const d = new Date(from);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Start of the current month (1st, 00:00:00 local). */
export const currentMonthStart = (from: Date = new Date()): Date =>
  new Date(from.getFullYear(), from.getMonth(), 1);

/**
 * Given the current quota row, compute carry-over tokens available THIS week.
 * Formula: floor(carry_over_pool / remaining_weeks_in_month)
 */
export const carryOverThisWeek = (quota: Pick<QuotaRow, "weekly_carry_over">, from: Date = new Date()): number => {
  const pool = quota.weekly_carry_over ?? 0;
  if (pool <= 0) return 0;
  return Math.floor(pool / remainingWeeksInMonth(from));
};

/**
 * Effective weekly limit = base weekly_limit + carry-over share this week.
 * Capped so it can't exceed what's still available in the monthly budget.
 */
export const effectiveWeeklyLimit = (quota: QuotaRow, from: Date = new Date()): number => {
  const base = quota.weekly_limit ?? 0;
  const extra = carryOverThisWeek(quota, from);
  const bonus = quota.tokens_added_manually ?? 0;
  const monthlyRemaining = quota.monthly_limit > 0
    ? quota.monthly_limit - quota.used_this_month
    : Infinity;
  return Math.min(base + extra + bonus, monthlyRemaining + bonus);
};

/** Tokens remaining this week (using effective limit with carry-over). */
export const weeklyRemaining = (quota: QuotaRow, from: Date = new Date()): number =>
  Math.max(0, effectiveWeeklyLimit(quota, from) - quota.used_this_week);

/** Tokens remaining this month (base monthly + bonus). */
export const monthlyRemaining = (quota: QuotaRow): number => {
  const total = (quota.monthly_limit ?? 0) + (quota.tokens_added_manually ?? 0);
  return Math.max(0, total - quota.used_this_month);
};

/**
 * When a weekly reset is needed, compute the new carry-over pool.
 * new_pool = max(0, old_pool + weekly_limit - used_this_week)
 * This naturally adds unused base tokens and deducts spent carry-over.
 */
export const computeNewCarryOver = (quota: QuotaRow): number =>
  Math.max(0, (quota.weekly_carry_over ?? 0) + quota.weekly_limit - quota.used_this_week);
