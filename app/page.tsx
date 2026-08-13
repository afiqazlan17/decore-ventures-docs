"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthGate";
import { supabase, Job, JobStatus, JOB_STATUS_LABEL, JOB_STATUS_COLOR } from "@/lib/supabase";
import { CATALOG } from "@/lib/catalog-data";

const STATUS_ORDER: JobStatus[] = ["potential", "active", "ongoing", "completed"];
const STATUS_BAR_COLOR: Record<JobStatus, string> = {
  potential: "bg-gray-300",
  active: "bg-gold",
  ongoing: "bg-blush",
  completed: "bg-terracotta",
};

const DONUT_COLORS = ["#C15B42", "#D9A566", "#E8927C", "#6B9080", "#7C93C3", "#B37CC3", "#9CA3AF"];

function greetingFor(name?: string) {
  const hour = new Date().getHours();
  if (hour < 6) return { big: "Selamat Malam", small: "Lewat malam ni, jangan lupa rehat." };
  if (hour < 12) return { big: "Selamat Pagi", small: "Jom mulakan hari dengan job pertama." };
  if (hour < 15) return { big: "Selamat Tengah Hari", small: "Dah makan tengahari ke belum?" };
  if (hour < 19) return { big: "Selamat Petang", small: "Last lap untuk hari ni." };
  return { big: "Selamat Malam", small: "Kerja lagi lepas waktu pejabat ni, jangan lupa rehat." };
}

function DonutChart({ segments, total }: { segments: { label: string; count: number; color: string }[]; total: number }) {
  const size = 160;
  const strokeWidth = 22;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {total === 0 ? (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
      ) : (
        segments.map((seg) => {
          if (seg.count === 0) return null;
          const dash = (seg.count / total) * circumference;
          const circle = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += dash;
          return circle;
        })
      )}
      <text x="50%" y="47%" textAnchor="middle" className="fill-ink" style={{ fontSize: 22, fontWeight: 700 }}>
        {total}
      </text>
      <text x="50%" y="60%" textAnchor="middle" className="fill-ink opacity-60" style={{ fontSize: 10 }}>
        Jobs
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [counts, setCounts] = useState<Record<JobStatus, number>>({
    potential: 0,
    active: 0,
    ongoing: 0,
    completed: 0,
  });
  const [pipelineValue, setPipelineValue] = useState(0);
  const [revenueCollected, setRevenueCollected] = useState(0);
  const [packageBreakdown, setPackageBreakdown] = useState<{ label: string; count: number; color: string }[]>([]);
  const [potentialValue, setPotentialValue] = useState(0);
  const [inProgressValue, setInProgressValue] = useState(0);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: jobs } = await supabase.from("jobs").select("status, estimated_price, services");
    const { data: receipts } = await supabase.from("documents").select("total").eq("doc_type", "receipt");
    const { data: recent } = await supabase
      .from("jobs")
      .select("*, customer:customers(*)")
      .order("created_at", { ascending: false })
      .limit(5);

    const next = { potential: 0, active: 0, ongoing: 0, completed: 0 } as Record<JobStatus, number>;
    let pipeline = 0;
    let potential = 0;
    let inProgress = 0;
    const pkgCounts: Record<string, number> = {};
    let otherCount = 0;

    (jobs || []).forEach((j: any) => {
      if (j.status in next) next[j.status as JobStatus] += 1;
      if (j.status !== "completed") pipeline += Number(j.estimated_price || 0);
      if (j.status === "potential") potential += Number(j.estimated_price || 0);
      if (j.status === "active" || j.status === "ongoing") inProgress += Number(j.estimated_price || 0);

      const services: string[] = j.services || [];
      const matched = CATALOG.filter((c) => services.includes(c.name));
      if (matched.length === 0) {
        otherCount += 1;
      } else {
        matched.forEach((c) => {
          pkgCounts[c.name] = (pkgCounts[c.name] || 0) + 1;
        });
      }
    });
    const revenue = (receipts || []).reduce((sum: number, r: any) => sum + Number(r.total || 0), 0);

    const breakdown = CATALOG.map((c, i) => ({
      label: c.name,
      count: pkgCounts[c.name] || 0,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    })).filter((b) => b.count > 0);
    if (otherCount > 0) breakdown.push({ label: "Custom / Other", count: otherCount, color: DONUT_COLORS[DONUT_COLORS.length - 1] });

    setCounts(next);
    setPipelineValue(pipeline);
    setRevenueCollected(revenue);
    setPotentialValue(potential);
    setInProgressValue(inProgress);
    setPackageBreakdown(breakdown);
    setRecentJobs((recent as Job[]) || []);
    setLoading(false);
  }

  const totalJobs = STATUS_ORDER.reduce((sum, s) => sum + counts[s], 0);
  const maxCount = Math.max(1, ...STATUS_ORDER.map((s) => counts[s]));
  const inProgressCount = counts.active + counts.ongoing;
  const conversionPct = totalJobs === 0 ? 0 : Math.round((counts.completed / totalJobs) * 100);
  const greeting = greetingFor(user?.name);

  return (
    <div>
      {/* Header banner */}
      <div className="bg-gradient-to-br from-terracotta to-[#8f3f2c] text-white rounded-xl px-6 py-6 sm:px-8 sm:py-7 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {greeting.big}, {user?.name || "Staff"}
            </h1>
            <p className="text-white/80 mt-1 text-sm">{greeting.small}</p>
          </div>
          <span className="inline-block text-xs font-medium bg-white/15 rounded-full px-3 py-1.5 self-start">
            Job Dashboard
          </span>
        </div>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="bg-white border border-terracotta/15 rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-terracotta">{loading ? "–" : counts[s]}</div>
            <div className="text-xs opacity-60 mt-1">{JOB_STATUS_LABEL[s]}</div>
          </div>
        ))}
      </div>

      {/* Money figures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
          <div className="text-xs uppercase opacity-60 mb-1">Pipeline Value (belum completed)</div>
          <div className="text-2xl font-bold text-terracotta">RM {pipelineValue.toFixed(2)}</div>
        </div>
        <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
          <div className="text-xs uppercase opacity-60 mb-1">Revenue Collected (dari resit)</div>
          <div className="text-2xl font-bold text-terracotta">RM {revenueCollected.toFixed(2)}</div>
        </div>
      </div>

      {/* Donut + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
          <div className="text-sm font-semibold text-terracotta mb-4">Jobs by Package</div>
          {packageBreakdown.length === 0 ? (
            <p className="text-sm opacity-60">Takde job dengan pakej catalog lagi.</p>
          ) : (
            <div className="flex items-center gap-6 flex-wrap">
              <DonutChart segments={packageBreakdown} total={totalJobs} />
              <div className="space-y-1.5">
                {packageBreakdown.map((seg) => (
                  <div key={seg.label} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                    <span className="opacity-70">{seg.label}</span>
                    <span className="font-semibold">{seg.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
          <div className="text-sm font-semibold text-terracotta mb-1">Conversion Funnel</div>
          <div className="text-xs opacity-60 mb-4">Potential → In Progress → Completed</div>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {[
              { label: "Potential", count: counts.potential, value: potentialValue },
              { label: "In Progress", count: inProgressCount, value: inProgressValue },
              { label: "Completed", count: counts.completed, value: revenueCollected, note: `${conversionPct}% conversion` },
            ].map((stage, i) => (
              <div key={stage.label} className="flex items-center flex-1 gap-2">
                <div className="flex-1 bg-cream border border-terracotta/15 rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase opacity-60">{stage.label}</div>
                  <div className="text-lg font-bold text-terracotta">{stage.count}</div>
                  <div className="text-[11px] opacity-70">RM {stage.value.toFixed(2)}</div>
                  {stage.note && <div className="text-[10px] opacity-50 mt-0.5">{stage.note}</div>}
                </div>
                {i < 2 && <span className="text-terracotta/40 shrink-0">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm mb-6">
        <div className="text-sm font-semibold text-terracotta mb-4">Jobs by Status</div>
        <div className="flex items-end gap-4 h-40">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="text-xs font-semibold mb-1">{counts[s]}</div>
              <div
                className={`w-full rounded-t ${STATUS_BAR_COLOR[s]}`}
                style={{ height: `${totalJobs === 0 ? 4 : (counts[s] / maxCount) * 100}%`, minHeight: 4 }}
              />
              <div className="text-[10px] opacity-60 mt-2 text-center">{JOB_STATUS_LABEL[s]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
        <div className="text-sm font-semibold text-terracotta mb-4">Recent Jobs</div>
        {recentJobs.length === 0 ? (
          <p className="text-sm opacity-60">Takde job lagi.</p>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((j) => (
              <button
                key={j.id}
                onClick={() => router.push(`/jobs/${j.id}`)}
                className="w-full flex items-center justify-between gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-terracotta/5 transition"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{j.customer?.name || "—"}</div>
                  <div className="text-xs opacity-60 font-mono">{j.job_code}</div>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${JOB_STATUS_COLOR[j.status]}`}>
                  {JOB_STATUS_LABEL[j.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
