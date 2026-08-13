"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase, Job, JOB_STATUS_LABEL } from "@/lib/supabase";
import { CATALOG } from "@/lib/catalog-data";
import PageHeader from "@/components/PageHeader";

const PKG_COLORS = ["#C15B42", "#D9A566", "#E8927C", "#6B9080", "#7C93C3", "#B37CC3", "#9CA3AF"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtRM(v: number) {
  return `RM ${v.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ReportsPage() {
  const today = new Date();
  const yearStart = `${today.getFullYear()}-01-01`;
  const todayStr = today.toISOString().slice(0, 10);

  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(todayStr);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [receipts, setReceipts] = useState<{ total: number; doc_date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: jobData } = await supabase
      .from("jobs")
      .select("*, customer:customers(*)")
      .order("created_at", { ascending: false });
    const { data: receiptData } = await supabase.from("documents").select("total, doc_date").eq("doc_type", "receipt");
    setJobs((jobData as unknown as Job[]) || []);
    setReceipts((receiptData as { total: number; doc_date: string }[]) || []);
    setLoading(false);
  }

  const filtered = useMemo(
    () => jobs.filter((j) => (!from || (j.created_at || "") >= from) && (!to || (j.created_at || "") <= to + "T23:59:59")),
    [jobs, from, to]
  );
  const filteredReceipts = useMemo(
    () => receipts.filter((r) => (!from || r.doc_date >= from) && (!to || r.doc_date <= to)),
    [receipts, from, to]
  );

  const totalJobs = filtered.length;
  const totalEst = filtered.reduce((s, j) => s + Number(j.estimated_price || 0), 0);
  const revenue = filteredReceipts.reduce((s, r) => s + Number(r.total || 0), 0);
  const completedCount = filtered.filter((j) => j.status === "completed").length;
  const completionRate = totalJobs === 0 ? 0 : Math.round((completedCount / totalJobs) * 100);

  const packageBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    let otherCount = 0;
    filtered.forEach((j) => {
      const matched = CATALOG.filter((c) => (j.services || []).includes(c.name));
      if (matched.length === 0) otherCount += 1;
      else matched.forEach((c) => (counts[c.name] = (counts[c.name] || 0) + 1));
    });
    const rows = CATALOG.map((c, i) => ({ label: c.name, count: counts[c.name] || 0, color: PKG_COLORS[i % PKG_COLORS.length] })).filter(
      (r) => r.count > 0
    );
    if (otherCount > 0) rows.push({ label: "Custom / Other", count: otherCount, color: PKG_COLORS[PKG_COLORS.length - 1] });
    return rows;
  }, [filtered]);
  const maxPkgCount = Math.max(1, ...packageBreakdown.map((r) => r.count));

  const funnel = useMemo(() => {
    const potential = filtered.filter((j) => j.status === "potential");
    const inProgress = filtered.filter((j) => j.status === "active" || j.status === "ongoing");
    const completed = filtered.filter((j) => j.status === "completed");
    return {
      potential: { count: potential.length, value: potential.reduce((s, j) => s + Number(j.estimated_price || 0), 0) },
      inProgress: { count: inProgress.length, value: inProgress.reduce((s, j) => s + Number(j.estimated_price || 0), 0) },
      completed: { count: completed.length, value: completed.reduce((s, j) => s + Number(j.estimated_price || 0), 0) },
    };
  }, [filtered]);

  const monthly = useMemo(() => {
    const rows = MONTH_LABELS.map((label) => ({ label, jobs: 0, est: 0, completed: 0 }));
    filtered.forEach((j) => {
      const m = j.created_at ? new Date(j.created_at).getMonth() : null;
      if (m === null) return;
      rows[m].jobs += 1;
      rows[m].est += Number(j.estimated_price || 0);
      if (j.status === "completed") rows[m].completed += 1;
    });
    return rows;
  }, [filtered]);

  const topCustomers = useMemo(() => {
    const byCustomer: Record<string, { name: string; count: number; est: number }> = {};
    filtered.forEach((j) => {
      const id = j.customer_id;
      if (!id) return;
      if (!byCustomer[id]) byCustomer[id] = { name: j.customer?.name || "—", count: 0, est: 0 };
      byCustomer[id].count += 1;
      byCustomer[id].est += Number(j.estimated_price || 0);
    });
    return Object.values(byCustomer)
      .sort((a, b) => b.est - a.est)
      .slice(0, 5);
  }, [filtered]);

  const staffPerformance = useMemo(() => {
    const byStaff: Record<string, { count: number; completed: number; est: number }> = {};
    filtered.forEach((j) => {
      const name = j.created_by || "Unknown";
      if (!byStaff[name]) byStaff[name] = { count: 0, completed: 0, est: 0 };
      byStaff[name].count += 1;
      byStaff[name].est += Number(j.estimated_price || 0);
      if (j.status === "completed") byStaff[name].completed += 1;
    });
    return Object.entries(byStaff).sort((a, b) => b[1].count - a[1].count);
  }, [filtered]);

  function handleExport() {
    const wb = XLSX.utils.book_new();
    const summary = XLSX.utils.aoa_to_sheet([
      ["Decore Ventures Report"],
      [],
      [`${from} — ${to}`],
      [],
      ["Metric", "Value"],
      ["Total Jobs", totalJobs],
      ["Estimated Value", totalEst],
      ["Revenue Collected", revenue],
      ["Completion Rate", `${completionRate}%`],
    ]);
    XLSX.utils.book_append_sheet(wb, summary, "Summary");

    const monthlySheet = XLSX.utils.aoa_to_sheet([
      ["Month", "Jobs", "Estimated", "Completed"],
      ...monthly.map((m) => [m.label, m.jobs, m.est, m.completed]),
    ]);
    XLSX.utils.book_append_sheet(wb, monthlySheet, "Monthly");

    const jobsSheet = XLSX.utils.aoa_to_sheet([
      ["Job Code", "Customer", "Status", "Event Date", "Estimated Price"],
      ...filtered.map((j) => [j.job_code, j.customer?.name || "", JOB_STATUS_LABEL[j.status], j.event_date || "", Number(j.estimated_price || 0)]),
    ]);
    XLSX.utils.book_append_sheet(wb, jobsSheet, "Jobs");

    XLSX.writeFile(wb, `Decore_Report_${from}_${to}.xlsx`);
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Analysis & Export"
        action={
          <button
            onClick={handleExport}
            className="bg-white/15 border border-white/40 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-white/25"
          >
            ⬇ Export Excel
          </button>
        }
      />

      <div className="bg-white border border-terracotta/15 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs opacity-60">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs opacity-60">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <span className="text-xs opacity-60 ml-auto">{loading ? "Loading..." : `${totalJobs} jobs`}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-terracotta/15 rounded-xl p-4 shadow-sm">
          <div className="text-xs uppercase opacity-60">Total Jobs</div>
          <div className="text-2xl font-bold text-terracotta mt-1">{totalJobs}</div>
          <div className="text-xs opacity-50 mt-0.5">{completedCount} completed</div>
        </div>
        <div className="bg-white border border-terracotta/15 rounded-xl p-4 shadow-sm">
          <div className="text-xs uppercase opacity-60">Estimated Value</div>
          <div className="text-2xl font-bold text-terracotta mt-1">{fmtRM(totalEst)}</div>
        </div>
        <div className="bg-white border border-terracotta/15 rounded-xl p-4 shadow-sm">
          <div className="text-xs uppercase opacity-60">Revenue Collected</div>
          <div className="text-2xl font-bold text-terracotta mt-1">{fmtRM(revenue)}</div>
        </div>
        <div className="bg-white border border-terracotta/15 rounded-xl p-4 shadow-sm">
          <div className="text-xs uppercase opacity-60">Completion Rate</div>
          <div className="text-2xl font-bold text-terracotta mt-1">{completionRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
          <div className="text-sm font-semibold text-terracotta mb-4">Package Breakdown</div>
          {packageBreakdown.length === 0 ? (
            <p className="text-sm opacity-60">Takde data untuk period ni.</p>
          ) : (
            <div className="space-y-2.5">
              {packageBreakdown.map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-right shrink-0 truncate">{r.label}</div>
                  <div className="flex-1 bg-cream rounded h-6 overflow-hidden">
                    <div
                      className="h-full rounded flex items-center justify-end px-2 text-white text-[10px] font-semibold"
                      style={{ width: `${Math.max((r.count / maxPkgCount) * 100, 8)}%`, background: r.color }}
                    >
                      {r.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
          <div className="text-sm font-semibold text-terracotta mb-1">Conversion Funnel</div>
          <div className="text-xs opacity-60 mb-4">Potential → In Progress → Completed</div>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {[
              { label: "Potential", ...funnel.potential },
              { label: "In Progress", ...funnel.inProgress },
              { label: "Completed", ...funnel.completed, note: `${completionRate}% conversion` },
            ].map((stage, i) => (
              <div key={stage.label} className="flex items-center flex-1 gap-2">
                <div className="flex-1 bg-cream border border-terracotta/15 rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase opacity-60">{stage.label}</div>
                  <div className="text-lg font-bold text-terracotta">{stage.count}</div>
                  <div className="text-[11px] opacity-70">{fmtRM(stage.value)}</div>
                  {"note" in stage && <div className="text-[10px] opacity-50 mt-0.5">{stage.note}</div>}
                </div>
                {i < 2 && <span className="text-terracotta/40 shrink-0">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm mb-6 overflow-x-auto">
        <div className="text-sm font-semibold text-terracotta mb-4">Monthly Breakdown</div>
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="text-xs uppercase opacity-60 text-left border-b border-terracotta/10">
              <th className="py-2">Month</th>
              <th className="py-2 text-center">Jobs</th>
              <th className="py-2 text-right">Estimated</th>
              <th className="py-2 text-center">Completed</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m) => (
              <tr key={m.label} className="border-b border-terracotta/5">
                <td className="py-2 font-semibold">{m.label}</td>
                <td className="py-2 text-center">{m.jobs || "—"}</td>
                <td className="py-2 text-right">{m.est ? fmtRM(m.est) : "—"}</td>
                <td className="py-2 text-center">{m.completed || "—"}</td>
              </tr>
            ))}
            <tr className="font-bold bg-cream/60">
              <td className="py-2">Total</td>
              <td className="py-2 text-center">{totalJobs}</td>
              <td className="py-2 text-right">{fmtRM(totalEst)}</td>
              <td className="py-2 text-center">{completedCount}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
          <div className="text-sm font-semibold text-terracotta mb-4">Top 5 Customers</div>
          {topCustomers.length === 0 ? (
            <p className="text-sm opacity-60">Takde data.</p>
          ) : (
            <div className="space-y-2">
              {topCustomers.map((c, i) => (
                <div key={c.name + i} className="flex items-center gap-3 py-1.5 border-b border-terracotta/5 last:border-0">
                  <div className="w-6 h-6 rounded-full bg-terracotta/10 text-terracotta text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs opacity-50">{c.count} jobs</div>
                  </div>
                  <div className="text-sm font-semibold shrink-0">{fmtRM(c.est)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
          <div className="text-sm font-semibold text-terracotta mb-4">Staff Performance</div>
          {staffPerformance.length === 0 ? (
            <p className="text-sm opacity-60">Takde data.</p>
          ) : (
            <div className="space-y-2">
              {staffPerformance.map(([name, d]) => (
                <div key={name} className="flex items-center gap-3 py-1.5 border-b border-terracotta/5 last:border-0">
                  <div className="w-6 h-6 rounded-full bg-blush/30 text-ink text-xs font-bold flex items-center justify-center shrink-0">
                    {name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{name}</div>
                    <div className="text-xs opacity-50">
                      {d.count} jobs · {d.completed} completed
                    </div>
                  </div>
                  <div className="text-sm font-semibold shrink-0">{fmtRM(d.est)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
