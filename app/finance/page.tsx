"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, Job } from "@/lib/supabase";
import {
  LedgerEntry,
  BANK_ACCOUNT,
  EXPENSE_CATEGORIES,
  cogsAccount,
  opexAccount,
  ledgerAccountLabel,
  ledgerAccountMeta,
  balanceFor,
  postLedgerEntry,
  fetchLedgerEntries,
} from "@/lib/ledger";
import { useAuth } from "@/components/AuthGate";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "gl", label: "General Ledger" },
  { key: "trial", label: "Trial Balance" },
  { key: "balance", label: "Balance Sheet" },
  { key: "cashbook", label: "Cash Book" },
  { key: "aging", label: "Aging / Outstanding" },
];

function fmtRM(v: number) {
  const sign = v < 0 ? "-" : "";
  return `${sign}RM ${Math.abs(v).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface DocRow {
  doc_type: "invoice" | "receipt";
  total: number;
  doc_date: string;
  job_id: string | null;
}

export default function FinancePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showExpense, setShowExpense] = useState(false);
  const [showOpening, setShowOpening] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [entriesData, jobsData, docsData] = await Promise.all([
      fetchLedgerEntries(),
      supabase.from("jobs").select("*, customer:customers(*)").order("created_at", { ascending: false }),
      supabase.from("documents").select("doc_type, total, doc_date, job_id").in("doc_type", ["invoice", "receipt"]),
    ]);
    setEntries(entriesData);
    setJobs((jobsData.data as Job[]) || []);
    setDocs((docsData.data as DocRow[]) || []);
    setLoading(false);
  }

  const hasOpeningBalance = entries.some((e) => e.entry_type === "opening_balance");
  const bankBalance = balanceFor(entries, BANK_ACCOUNT.key);
  const arBalance = balanceFor(entries, "ar");
  const revenueTotal = balanceFor(entries, "revenue");
  const cogsTotal = EXPENSE_CATEGORIES.reduce((s, c) => s + balanceFor(entries, cogsAccount(c.value)), 0);
  const opexTotal = EXPENSE_CATEGORIES.reduce((s, c) => s + balanceFor(entries, opexAccount(c.value)), 0);
  const netProfit = revenueTotal - cogsTotal - opexTotal;
  const equityOpening = balanceFor(entries, "equity_opening");

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-terracotta">Finance</h1>
        <div className="flex gap-2">
          {!hasOpeningBalance && (
            <button
              onClick={() => setShowOpening(true)}
              className="border border-terracotta text-terracotta px-4 py-2 rounded-md text-sm font-semibold hover:bg-terracotta/5"
            >
              Set Opening Balance
            </button>
          )}
          <button
            onClick={() => setShowExpense(true)}
            className="bg-terracotta text-white px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90"
          >
            + Add Expense
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded text-xs font-semibold ${
              tab === t.key ? "bg-terracotta text-white" : "bg-terracotta/10 text-terracotta"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm opacity-60 mb-4">Loading...</p>}

      {tab === "overview" && (
        <OverviewTab
          bankBalance={bankBalance}
          arBalance={arBalance}
          revenueTotal={revenueTotal}
          cogsTotal={cogsTotal}
          opexTotal={opexTotal}
          netProfit={netProfit}
        />
      )}
      {tab === "gl" && <GeneralLedgerTab entries={entries} />}
      {tab === "trial" && <TrialBalanceTab entries={entries} />}
      {tab === "balance" && (
        <BalanceSheetTab bankBalance={bankBalance} arBalance={arBalance} equityOpening={equityOpening} netProfit={netProfit} />
      )}
      {tab === "cashbook" && <CashBookTab entries={entries} />}
      {tab === "aging" && <AgingTab docs={docs} jobs={jobs} />}

      {showExpense && (
        <ExpenseModal
          jobs={jobs}
          userName={user?.name}
          onClose={() => setShowExpense(false)}
          onSaved={() => {
            setShowExpense(false);
            load();
          }}
        />
      )}
      {showOpening && (
        <OpeningBalanceModal
          userName={user?.name}
          onClose={() => setShowOpening(false)}
          onSaved={() => {
            setShowOpening(false);
            load();
          }}
        />
      )}

      <style jsx global>{`
        .input {
          border: 1px solid rgba(193, 91, 66, 0.25);
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 14px;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: #c15b42;
        }
      `}</style>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-terracotta/15 rounded-xl p-4 shadow-sm">
      <div className="text-xs uppercase opacity-60">{label}</div>
      <div className="text-2xl font-bold text-terracotta mt-1">{value}</div>
      {sub && <div className="text-xs opacity-50 mt-0.5">{sub}</div>}
    </div>
  );
}

function OverviewTab({
  bankBalance,
  arBalance,
  revenueTotal,
  cogsTotal,
  opexTotal,
  netProfit,
}: {
  bankBalance: number;
  arBalance: number;
  revenueTotal: number;
  cogsTotal: number;
  opexTotal: number;
  netProfit: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <Card label="Bank Balance" value={fmtRM(bankBalance)} sub={BANK_ACCOUNT.label} />
      <Card label="Outstanding (AR)" value={fmtRM(arBalance)} sub="Invoiced, not yet received" />
      <Card label="Revenue (all-time)" value={fmtRM(revenueTotal)} />
      <Card label="Cost of Service" value={fmtRM(cogsTotal)} />
      <Card label="Operating Expense" value={fmtRM(opexTotal)} />
      <Card label="Net Profit" value={fmtRM(netProfit)} sub="Revenue − COGS − Opex" />
    </div>
  );
}

function GeneralLedgerTab({ entries }: { entries: LedgerEntry[] }) {
  const [subTab, setSubTab] = useState<"summary" | "detail">("summary");
  const [account, setAccount] = useState("all");

  const active = entries.filter((e) => !e.reversed);
  const accountKeys = useMemo(() => {
    const set = new Set<string>();
    active.forEach((e) => {
      set.add(e.debit_account);
      set.add(e.credit_account);
    });
    return Array.from(set).sort();
  }, [active]);

  const summaryRows = useMemo(() => {
    const byAccount: Record<string, { debit: number; credit: number }> = {};
    active.forEach((e) => {
      byAccount[e.debit_account] = byAccount[e.debit_account] || { debit: 0, credit: 0 };
      byAccount[e.debit_account].debit += Number(e.amount);
      byAccount[e.credit_account] = byAccount[e.credit_account] || { debit: 0, credit: 0 };
      byAccount[e.credit_account].credit += Number(e.amount);
    });
    return Object.entries(byAccount).map(([key, v]) => ({ key, ...ledgerAccountMeta(key), ...v }));
  }, [active]);

  const explodedRows = useMemo(() => {
    const rows: { id: string; date: string; account: string; particular: string; ref?: string; debit: number; credit: number }[] = [];
    active.forEach((e) => {
      rows.push({ id: e.id + "-d", date: e.entry_date, account: e.debit_account, particular: e.description || "", ref: e.doc_number, debit: Number(e.amount), credit: 0 });
      rows.push({ id: e.id + "-c", date: e.entry_date, account: e.credit_account, particular: e.description || "", ref: e.doc_number, debit: 0, credit: Number(e.amount) });
    });
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [active]);

  const detailFiltered = account === "all" ? explodedRows : explodedRows.filter((r) => r.account === account);
  let running = 0;
  const detailView = detailFiltered.map((r) => {
    if (account !== "all") running += r.debit - r.credit;
    return { ...r, balance: account !== "all" ? running : null };
  });

  return (
    <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm overflow-x-auto">
      <div className="flex flex-wrap gap-2 mb-4">
        {(["summary", "detail"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSubTab(s)}
            className={`px-3 py-1 rounded text-xs font-semibold capitalize ${subTab === s ? "bg-terracotta text-white" : "bg-terracotta/10 text-terracotta"}`}
          >
            {s}
          </button>
        ))}
        {subTab === "detail" && (
          <select className="input ml-auto" value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="all">All Accounts</option>
            {accountKeys.map((k) => (
              <option key={k} value={k}>
                {ledgerAccountLabel(k)}
              </option>
            ))}
          </select>
        )}
      </div>

      {subTab === "summary" ? (
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="text-xs uppercase opacity-60 text-left border-b border-terracotta/10">
              <th className="py-2">Account</th>
              <th className="py-2">Type</th>
              <th className="py-2 text-right">Debit</th>
              <th className="py-2 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center opacity-50">
                  Takde ledger entries lagi.
                </td>
              </tr>
            )}
            {summaryRows.map((r) => (
              <tr key={r.key} className="border-b border-terracotta/5">
                <td className="py-2">{r.label}</td>
                <td className="py-2 opacity-60">{r.type}</td>
                <td className="py-2 text-right">{r.debit ? fmtRM(r.debit) : "—"}</td>
                <td className="py-2 text-right">{r.credit ? fmtRM(r.credit) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-xs uppercase opacity-60 text-left border-b border-terracotta/10">
              <th className="py-2">Date</th>
              <th className="py-2">Account</th>
              <th className="py-2">Particular</th>
              <th className="py-2">Ref</th>
              <th className="py-2 text-right">Debit</th>
              <th className="py-2 text-right">Credit</th>
              <th className="py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {detailView.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center opacity-50">
                  Takde entries untuk account ni.
                </td>
              </tr>
            )}
            {detailView.map((r) => (
              <tr key={r.id} className="border-b border-terracotta/5">
                <td className="py-2 whitespace-nowrap">{r.date}</td>
                <td className="py-2 whitespace-nowrap">{ledgerAccountLabel(r.account)}</td>
                <td className="py-2">{r.particular}</td>
                <td className="py-2 opacity-60">{r.ref || "—"}</td>
                <td className="py-2 text-right">{r.debit ? fmtRM(r.debit) : "—"}</td>
                <td className="py-2 text-right">{r.credit ? fmtRM(r.credit) : "—"}</td>
                <td className="py-2 text-right font-semibold">{r.balance == null ? "—" : fmtRM(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TrialBalanceTab({ entries }: { entries: LedgerEntry[] }) {
  const active = entries.filter((e) => !e.reversed);
  const accountKeys = useMemo(() => {
    const set = new Set<string>();
    active.forEach((e) => {
      set.add(e.debit_account);
      set.add(e.credit_account);
    });
    return Array.from(set).sort();
  }, [active]);

  const rows = accountKeys.map((key) => {
    const bal = balanceFor(active, key);
    const meta = ledgerAccountMeta(key);
    return { key, ...meta, debit: bal >= 0 ? bal : 0, credit: bal < 0 ? -bal : 0 };
  });
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm overflow-x-auto">
      <div className="text-sm font-semibold text-terracotta mb-4">Trial Balance (as of today)</div>
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="text-xs uppercase opacity-60 text-left border-b border-terracotta/10">
            <th className="py-2">Code</th>
            <th className="py-2">Account</th>
            <th className="py-2 text-right">Debit</th>
            <th className="py-2 text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center opacity-50">
                Takde ledger entries lagi.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-terracotta/5">
              <td className="py-2 font-mono text-xs opacity-60">{r.code}</td>
              <td className="py-2">{r.label}</td>
              <td className="py-2 text-right">{r.debit ? fmtRM(r.debit) : "—"}</td>
              <td className="py-2 text-right">{r.credit ? fmtRM(r.credit) : "—"}</td>
            </tr>
          ))}
          <tr className="font-bold bg-cream/60">
            <td className="py-2" colSpan={2}>
              Total
            </td>
            <td className="py-2 text-right">{fmtRM(totalDebit)}</td>
            <td className="py-2 text-right">{fmtRM(totalCredit)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BalanceSheetTab({
  bankBalance,
  arBalance,
  equityOpening,
  netProfit,
}: {
  bankBalance: number;
  arBalance: number;
  equityOpening: number;
  netProfit: number;
}) {
  const totalAssets = bankBalance + arBalance;
  const totalEquity = equityOpening + netProfit;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
        <div className="text-sm font-semibold text-terracotta mb-4">Assets</div>
        <div className="flex justify-between py-1.5 border-b border-terracotta/5 text-sm">
          <span>Bank — {BANK_ACCOUNT.label}</span>
          <span className="font-semibold">{fmtRM(bankBalance)}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-terracotta/5 text-sm">
          <span>Accounts Receivable</span>
          <span className="font-semibold">{fmtRM(arBalance)}</span>
        </div>
        <div className="flex justify-between py-2 font-bold text-terracotta">
          <span>Total Assets</span>
          <span>{fmtRM(totalAssets)}</span>
        </div>
      </div>
      <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
        <div className="text-sm font-semibold text-terracotta mb-4">Liabilities & Equity</div>
        <div className="flex justify-between py-1.5 border-b border-terracotta/5 text-sm">
          <span>Liabilities</span>
          <span className="font-semibold">{fmtRM(0)}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-terracotta/5 text-sm">
          <span>Opening Balance</span>
          <span className="font-semibold">{fmtRM(equityOpening)}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-terracotta/5 text-sm">
          <span>Retained Earnings (Net Profit)</span>
          <span className="font-semibold">{fmtRM(netProfit)}</span>
        </div>
        <div className="flex justify-between py-2 font-bold text-terracotta">
          <span>Total Liabilities & Equity</span>
          <span>{fmtRM(totalEquity)}</span>
        </div>
      </div>
    </div>
  );
}

function CashBookTab({ entries }: { entries: LedgerEntry[] }) {
  const active = entries.filter((e) => !e.reversed);
  const rows: { id: string; date: string; particular: string; ref?: string; inAmt: number; outAmt: number }[] = [];
  active.forEach((e) => {
    if (e.debit_account === BANK_ACCOUNT.key) rows.push({ id: e.id + "-in", date: e.entry_date, particular: e.description || "", ref: e.doc_number, inAmt: Number(e.amount), outAmt: 0 });
    if (e.credit_account === BANK_ACCOUNT.key) rows.push({ id: e.id + "-out", date: e.entry_date, particular: e.description || "", ref: e.doc_number, inAmt: 0, outAmt: Number(e.amount) });
  });
  rows.sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const withBalance = rows.map((r) => {
    running += r.inAmt - r.outAmt;
    return { ...r, balance: running };
  });

  return (
    <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm overflow-x-auto">
      <div className="text-sm font-semibold text-terracotta mb-1">Cash Book — {BANK_ACCOUNT.label}</div>
      <div className="text-xs opacity-60 mb-4">Account No. {BANK_ACCOUNT.accountNo}</div>
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="text-xs uppercase opacity-60 text-left border-b border-terracotta/10">
            <th className="py-2">Date</th>
            <th className="py-2">Particular</th>
            <th className="py-2">Ref</th>
            <th className="py-2 text-right">In</th>
            <th className="py-2 text-right">Out</th>
            <th className="py-2 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {withBalance.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center opacity-50">
                Takde transaksi bank lagi.
              </td>
            </tr>
          )}
          {withBalance.map((r) => (
            <tr key={r.id} className="border-b border-terracotta/5">
              <td className="py-2 whitespace-nowrap">{r.date}</td>
              <td className="py-2">{r.particular}</td>
              <td className="py-2 opacity-60">{r.ref || "—"}</td>
              <td className="py-2 text-right text-green-700">{r.inAmt ? fmtRM(r.inAmt) : "—"}</td>
              <td className="py-2 text-right text-red-600">{r.outAmt ? fmtRM(r.outAmt) : "—"}</td>
              <td className="py-2 text-right font-semibold">{fmtRM(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgingTab({ docs, jobs }: { docs: DocRow[]; jobs: Job[] }) {
  const today = new Date();
  const byJob = useMemo(() => {
    const m: Record<string, { invoiced: number; received: number; lastInvoiceDate: string | null }> = {};
    docs.forEach((d) => {
      if (!d.job_id) return;
      if (!m[d.job_id]) m[d.job_id] = { invoiced: 0, received: 0, lastInvoiceDate: null };
      if (d.doc_type === "invoice") {
        m[d.job_id].invoiced += Number(d.total);
        if (!m[d.job_id].lastInvoiceDate || d.doc_date > m[d.job_id].lastInvoiceDate!) m[d.job_id].lastInvoiceDate = d.doc_date;
      } else {
        m[d.job_id].received += Number(d.total);
      }
    });
    return m;
  }, [docs]);

  const rows = Object.entries(byJob)
    .map(([jobId, v]) => {
      const outstanding = v.invoiced - v.received;
      const job = jobs.find((j) => j.id === jobId);
      const ageDays = v.lastInvoiceDate ? Math.floor((today.getTime() - new Date(v.lastInvoiceDate).getTime()) / 86400000) : 0;
      return { jobId, job, outstanding, ageDays, invoiced: v.invoiced, received: v.received };
    })
    .filter((r) => r.outstanding > 0.01)
    .sort((a, b) => b.ageDays - a.ageDays);

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-terracotta">Aging / Outstanding Balances</div>
        <div className="text-sm font-bold">{fmtRM(totalOutstanding)} outstanding</div>
      </div>
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="text-xs uppercase opacity-60 text-left border-b border-terracotta/10">
            <th className="py-2">Job</th>
            <th className="py-2">Customer</th>
            <th className="py-2 text-right">Invoiced</th>
            <th className="py-2 text-right">Received</th>
            <th className="py-2 text-right">Outstanding</th>
            <th className="py-2 text-right">Age</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center opacity-50">
                Takde outstanding balance — semua invoice dah settle.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.jobId} className="border-b border-terracotta/5">
              <td className="py-2 font-mono text-xs">{r.job?.job_code || "—"}</td>
              <td className="py-2">{r.job?.customer?.name || "—"}</td>
              <td className="py-2 text-right">{fmtRM(r.invoiced)}</td>
              <td className="py-2 text-right">{fmtRM(r.received)}</td>
              <td className="py-2 text-right font-semibold text-terracotta">{fmtRM(r.outstanding)}</td>
              <td className="py-2 text-right">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${r.ageDays > 30 ? "bg-red-100 text-red-700" : r.ageDays > 14 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                  {r.ageDays} hari
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ExpenseModal({
  jobs,
  userName,
  onClose,
  onSaved,
}: {
  jobs: Job[];
  userName?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isJobExpense, setIsJobExpense] = useState(false);
  const [jobId, setJobId] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].value);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Sila isi amount yang sah.");
      return;
    }
    if (isJobExpense && !jobId) {
      setError("Sila pilih job.");
      return;
    }
    setSubmitting(true);
    try {
      await postLedgerEntry({
        entry_date: date,
        entry_type: isJobExpense ? "job_expense" : "operating_expense",
        debit_account: isJobExpense ? cogsAccount(category) : opexAccount(category),
        credit_account: BANK_ACCOUNT.key,
        amount: amt,
        description: description || (isJobExpense ? "Job expense" : "Operating expense"),
        job_id: isJobExpense ? jobId : null,
        created_by: userName,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-terracotta mb-4">Add Expense</h2>
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsJobExpense(false)}
            className={`flex-1 px-3 py-2 rounded text-sm font-semibold ${!isJobExpense ? "bg-terracotta text-white" : "bg-terracotta/10 text-terracotta"}`}
          >
            Operating Expense
          </button>
          <button
            type="button"
            onClick={() => setIsJobExpense(true)}
            className={`flex-1 px-3 py-2 rounded text-sm font-semibold ${isJobExpense ? "bg-terracotta text-white" : "bg-terracotta/10 text-terracotta"}`}
          >
            Job Expense
          </button>
        </div>
        {isJobExpense && (
          <select className="input w-full" value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">Pilih job...</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_code} — {j.customer?.name}
              </option>
            ))}
          </select>
        )}
        <select className="input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="number" className="input w-full" placeholder="Amount (RM)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="input w-full" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-terracotta/30 text-terracotta py-2.5 rounded font-semibold">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 bg-terracotta text-white py-2.5 rounded font-semibold disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function OpeningBalanceModal({ userName, onClose, onSaved }: { userName?: string; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Sila isi amount yang sah.");
      return;
    }
    setSubmitting(true);
    try {
      await postLedgerEntry({
        entry_date: date,
        entry_type: "opening_balance",
        debit_account: BANK_ACCOUNT.key,
        credit_account: "equity_opening",
        amount: amt,
        description: "Opening balance",
        created_by: userName,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-terracotta mb-1">Set Opening Balance</h2>
      <p className="text-xs opacity-60 mb-4">Baki bank sedia ada sebelum mula guna sistem ni. Sekali je perlu buat.</p>
      <div className="space-y-3">
        <input type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="number" className="input w-full" placeholder="Opening balance (RM)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-terracotta/30 text-terracotta py-2.5 rounded font-semibold">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 bg-terracotta text-white py-2.5 rounded font-semibold disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
