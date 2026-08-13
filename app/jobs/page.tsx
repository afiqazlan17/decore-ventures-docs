"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import JobFormModal from "@/components/JobFormModal";
import { supabase, Job, JobStatus, JOB_STATUS_LABEL, JOB_STATUS_COLOR, urgencyBadge } from "@/lib/supabase";

const FILTERS: ("all" | JobStatus)[] = ["all", "potential", "active", "ongoing", "completed"];

const VIEW_TITLE: Record<string, string> = {
  queue: "Job Monitoring",
  aging: "Aging Jobs",
  mine: "My Jobs",
};

function JobsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const view = searchParams.get("view") || "queue";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | JobStatus>("all");
  const [showNew, setShowNew] = useState(searchParams.get("new") === "1");

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handler = () => setShowNew(true);
    window.addEventListener("open-create-job", handler);
    return () => window.removeEventListener("open-create-job", handler);
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

  const viewFiltered = jobs.filter((j) => {
    if (view === "aging") return urgencyBadge(j) !== null;
    if (view === "mine") return j.created_by === user?.name;
    return true;
  });
  const filtered = filter === "all" ? viewFiltered : viewFiltered.filter((j) => j.status === filter);

  return (
    <div>
      <PageHeader
        title={VIEW_TITLE[view] || "Job Monitoring"}
        subtitle={`${filtered.length} jobs`}
        action={
          <button
            onClick={() => setShowNew(true)}
            className="bg-white/15 border border-white/40 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-white/25"
          >
            + Create New Job
          </button>
        }
      />

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

      {showNew && (
        <JobFormModal
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<p className="text-sm opacity-60">Loading...</p>}>
      <JobsPageInner />
    </Suspense>
  );
}
