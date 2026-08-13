"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  supabase,
  Job,
  ActivityLog,
  JOB_STATUS_LABEL,
  JOB_STATUS_COLOR,
  urgencyBadge,
} from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";
import JobFormModal from "@/components/JobFormModal";

const STEPS: { key: "quotation" | "invoice" | "receipt"; label: string }[] = [
  { key: "quotation", label: "Quotation" },
  { key: "invoice", label: "Invoice" },
  { key: "receipt", label: "Receipt" },
];

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [docTypes, setDocTypes] = useState<Set<string>>(new Set());
  const [log, setLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    load();
  }, [jobId]);

  async function load() {
    setLoading(true);
    const { data: jobData } = await supabase
      .from("jobs")
      .select("*, customer:customers(*), documents(doc_type)")
      .eq("id", jobId)
      .single();
    if (jobData) {
      setJob(jobData as any);
      setDocTypes(new Set(((jobData as any).documents || []).map((d: any) => d.doc_type)));
    }
    const { data: logData } = await supabase
      .from("job_activity_log")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    setLog((logData as ActivityLog[]) || []);
    setLoading(false);
  }

  if (loading) return <p className="text-sm opacity-60">Loading...</p>;
  if (!job) return <p className="text-sm opacity-60">Job not found.</p>;

  const urgency = urgencyBadge(job);

  return (
    <div>
      <PageHeader
        title={job.customer?.name || "Job"}
        subtitle={job.job_code}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/15 border border-white/30">
              {JOB_STATUS_LABEL[job.status]}
            </span>
            {urgency && <span className={`text-xs font-semibold px-2 py-0.5 rounded ${urgency.className}`}>{urgency.label}</span>}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* Info */}
          <div className="bg-white border border-terracotta/15 rounded-lg p-5 shadow-sm text-sm space-y-1">
            <div><span className="opacity-60">Phone:</span> {job.customer?.phone || "—"}</div>
            <div><span className="opacity-60">Company:</span> {job.customer?.company || "—"}</div>
            <div><span className="opacity-60">Services:</span> {job.services?.join(", ") || "—"}</div>
            <div><span className="opacity-60">Event date:</span> {job.event_date || "—"}</div>
            <div><span className="opacity-60">Expected completion:</span> {job.expected_completion_date || "—"}</div>
            <div><span className="opacity-60">Location:</span> {job.event_location || "—"}</div>
            <div><span className="opacity-60">Estimated price:</span> {job.estimated_price != null ? `RM ${Number(job.estimated_price).toFixed(2)}` : "—"}</div>
            {job.notes && <div><span className="opacity-60">Notes:</span> {job.notes}</div>}
          </div>

          {/* Timeline */}
          <div className="bg-white border border-terracotta/15 rounded-lg p-5 shadow-sm">
            <div className="flex items-center">
              {STEPS.map((step, i) => {
                const done = docTypes.has(step.key);
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          done ? "bg-terracotta text-white" : "bg-terracotta/10 text-terracotta/40"
                        }`}
                      >
                        {done ? "✓" : i + 1}
                      </div>
                      <span className={`text-[11px] mt-1 ${done ? "text-terracotta font-medium" : "opacity-40"}`}>{step.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${done ? "bg-terracotta" : "bg-terracotta/10"}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowEdit(true)} className="text-sm bg-ink/10 text-ink px-4 py-2 rounded hover:bg-ink/20">
              Edit Job
            </button>
            <button onClick={() => router.push(`/new/quotation?jobId=${job.id}`)} className="text-sm bg-gold/40 text-ink px-4 py-2 rounded hover:bg-gold/60">
              Create Quotation
            </button>
            <button onClick={() => router.push(`/new/invoice?jobId=${job.id}`)} className="text-sm bg-blush/50 text-ink px-4 py-2 rounded hover:bg-blush/70">
              Create Invoice
            </button>
            <button onClick={() => router.push(`/new/receipt?jobId=${job.id}`)} className="text-sm bg-terracotta/20 text-ink px-4 py-2 rounded hover:bg-terracotta/30">
              Create Receipt
            </button>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white border border-terracotta/15 rounded-lg p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Activity Log</h2>
          {log.length === 0 && <p className="text-sm opacity-50">Tiada aktiviti direkod lagi.</p>}
          <div className="space-y-2">
            {log.map((l) => (
              <div key={l.id} className="text-sm border-b border-terracotta/10 pb-2">
                <span className="font-medium">{l.action}</span>
                <div className="text-xs opacity-60">
                  {l.performed_by || "Unknown"} · {l.created_at ? new Date(l.created_at).toLocaleString("en-GB") : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEdit && (
        <JobFormModal
          job={job}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            load();
          }}
        />
      )}
    </div>
  );
}
