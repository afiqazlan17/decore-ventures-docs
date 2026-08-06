"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthGate";
import { supabase, JobStatus, JOB_STATUS_LABEL } from "@/lib/supabase";

const STATUS_ORDER: JobStatus[] = ["potential", "active", "ongoing", "completed"];
const STATUS_BAR_COLOR: Record<JobStatus, string> = {
  potential: "bg-gray-300",
  active: "bg-gold",
  ongoing: "bg-blush",
  completed: "bg-terracotta",
};

export default function DashboardPage() {
  const { user } = useAuth();

  const [counts, setCounts] = useState<Record<JobStatus, number>>({
    potential: 0,
    active: 0,
    ongoing: 0,
    completed: 0,
  });
  const [pipelineValue, setPipelineValue] = useState(0);
  const [revenueCollected, setRevenueCollected] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: jobs } = await supabase.from("jobs").select("status, estimated_price");
    const { data: receipts } = await supabase.from("documents").select("total").eq("doc_type", "receipt");

    const next = { potential: 0, active: 0, ongoing: 0, completed: 0 } as Record<JobStatus, number>;
    let pipeline = 0;
    (jobs || []).forEach((j: any) => {
      if (j.status in next) next[j.status as JobStatus] += 1;
      if (j.status !== "completed") pipeline += Number(j.estimated_price || 0);
    });
    const revenue = (receipts || []).reduce((sum: number, r: any) => sum + Number(r.total || 0), 0);

    setCounts(next);
    setPipelineValue(pipeline);
    setRevenueCollected(revenue);
    setLoading(false);
  }

  const totalJobs = STATUS_ORDER.reduce((sum, s) => sum + counts[s], 0);
  const maxCount = Math.max(1, ...STATUS_ORDER.map((s) => counts[s]));

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-terracotta mb-1">Good Day, {user?.name || "Staff"}</h1>
      <p className="text-ink/60 mb-8">What you want to do today?</p>

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
          <div className="text-xs uppercase opacity-60 mb-1">Pipeline Value (belum completed)</div>
          <div className="text-2xl font-bold text-terracotta">RM {pipelineValue.toFixed(2)}</div>
        </div>
        <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
          <div className="text-xs uppercase opacity-60 mb-1">Revenue Collected (dari resit)</div>
          <div className="text-2xl font-bold text-terracotta">RM {revenueCollected.toFixed(2)}</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-terracotta/15 rounded-xl p-5 shadow-sm">
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
    </div>
  );
}
