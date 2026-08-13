import { supabase } from "./supabase";

// Decore has a single bank account (unlike Kretivco's multi-bank, per-department
// setup) — see STANDARD_NOTES in lib/constants.ts for the same account details.
export const BANK_ACCOUNT = { key: "bank_maybank", label: "Maybank", accountNo: "5686 0312 3867" };

export const EXPENSE_CATEGORIES = [
  { value: "subcontractor", label: "Subcontractor / Vendor" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "salary", label: "Salary" },
  { value: "other", label: "Other" },
];

export const cogsAccount = (category: string) => `cogs_${category}`;
export const opexAccount = (category: string) => `opex_${category}`;

export function ledgerAccountLabel(key: string): string {
  if (key === "ar") return "Accounts Receivable (Outstanding)";
  if (key === "revenue") return "Revenue";
  if (key === "equity_opening") return "Opening Balance";
  if (key === BANK_ACCOUNT.key) return `Bank — ${BANK_ACCOUNT.label}`;
  if (key.startsWith("cogs_")) {
    const cat = key.slice(5);
    return `Cost of Service — ${EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || cat}`;
  }
  if (key.startsWith("opex_")) {
    const cat = key.slice(5);
    return `Expense — ${EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || cat}`;
  }
  return key;
}

export function ledgerAccountMeta(key: string): { code: string; label: string; type: string } {
  const label = ledgerAccountLabel(key);
  if (key === "ar") return { code: "CA-AR", label, type: "Current Asset" };
  if (key === "equity_opening") return { code: "EQ-OPEN", label, type: "Equity" };
  if (key === BANK_ACCOUNT.key) return { code: "CA-BANK", label, type: "Current Asset" };
  if (key === "revenue") return { code: "IN-REV", label, type: "Income" };
  if (key.startsWith("cogs_")) return { code: `CE-${key.slice(5).toUpperCase()}`, label, type: "Direct Expense" };
  if (key.startsWith("opex_")) return { code: `OE-${key.slice(5).toUpperCase()}`, label, type: "Operating Expense" };
  return { code: key, label, type: "—" };
}

// Assets/expenses are debit-normal; revenue/liabilities/equity are credit-normal.
// Flipping the sign for credit-normal accounts means every balance on screen
// reads as a plain positive number for a healthy account.
const DEBIT_NORMAL = (key: string) => key === "ar" || key === BANK_ACCOUNT.key || key.startsWith("cogs_") || key.startsWith("opex_");

export type LedgerEntryType = "invoice" | "receipt" | "job_expense" | "operating_expense" | "opening_balance" | "reversal";

export interface LedgerEntry {
  id?: string;
  entry_date: string;
  entry_type: LedgerEntryType;
  debit_account: string;
  credit_account: string;
  amount: number;
  description?: string;
  doc_number?: string;
  job_id?: string | null;
  reversed?: boolean;
  created_by?: string;
  created_at?: string;
}

export function balanceFor(entries: LedgerEntry[], accountKey: string): number {
  const raw = entries.reduce((bal, e) => {
    if (e.reversed) return bal;
    if (e.debit_account === accountKey) bal += Number(e.amount);
    if (e.credit_account === accountKey) bal -= Number(e.amount);
    return bal;
  }, 0);
  return DEBIT_NORMAL(accountKey) ? raw : -raw;
}

export async function postLedgerEntry(entry: LedgerEntry) {
  const { error } = await supabase.from("ledger_entries").insert(entry);
  if (error) throw error;
}

export async function fetchLedgerEntries(): Promise<LedgerEntry[]> {
  const { data } = await supabase.from("ledger_entries").select("*").order("entry_date", { ascending: true });
  return (data as LedgerEntry[]) || [];
}
