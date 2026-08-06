"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Job, JobStatus, JOB_STATUS_LABEL, JOB_STATUS_COLOR, urgencyBadge } from "@/lib/supabase";

const FILTERS: ("all" | JobStatus)[] = ["all", "potential", "active", "ongoing", "completed"];

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | JobStatus>("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("jobs")
      .select("*, customer:customers(*)")
      .order("created_at", { ascending: false });
    setJobs((data as unknown as Job[]) || []);
    setLoading(false);
  }

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-terracotta">Job Monitoring</h1>
        <button
          onClick={() => router.push("/jobs/new")}
          className="bg-terracotta text-white px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90"
        >
          + Create New Job
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-xs font-semibold ${
              filter === f ? "bg-terracotta text-white" : "bg-terracotta/10 text-terracotta"
            }`}
          >
            {f === "all" ? "All" : JOB_STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm opacity-60">Loading...</p>}
      {!loading && filtered.length === 0 && <p className="text-sm opacity-60">No jobs found.</p>}

      <div className="space-y-2">
        {filtered.map((job) => {
          const urgency = urgencyBadge(job);
          return (
            <button
              key={job.id}
              onClick={() => router.push(`/jobs/${job.id}`)}
              className="w-full text-left bg-white border border-terracotta/15 rounded-lg p-4 shadow-sm hover:border-terracotta/40 transition flex flex-wrap items-center gap-2"
            >
              <span className="font-mono text-xs bg-terracotta/10 text-terracotta px-2 py-0.5 rounded font-semibold">
                {job.job_code}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${JOB_STATUS_COLOR[job.status]}`}>
                {JOB_STATUS_LABEL[job.status]}
              </span>
              {urgency && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${urgency.className}`}>{urgency.label}</span>
              )}
              <span className="font-semibold">{job.customer?.name}</span>
              {job.event_date && <span className="text-xs opacity-60">📅 {job.event_date}</span>}
              {job.estimated_price != null && (
                <span className="text-xs opacity-60 ml-auto">RM {Number(job.estimated_price).toFixed(2)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
