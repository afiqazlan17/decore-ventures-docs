"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  supabase,
  Customer,
  SERVICE_OPTIONS,
  JobStatus,
  JOB_STATUS_LABEL,
  logActivity,
  suggestExpectedCompletion,
} from "@/lib/supabase";
import CustomerPicker from "@/components/CustomerPicker";
import MoneyInput from "@/components/MoneyInput";
import { useAuth } from "@/components/AuthGate";

const STATUSES: JobStatus[] = ["potential", "active", "ongoing", "completed"];

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = params?.id as string;
  const [originalStatus, setOriginalStatus] = useState<JobStatus>("potential");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<JobStatus>("potential");
  const [services, setServices] = useState<string[]>([]);
  const [otherServices, setOtherServices] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [jobCode, setJobCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [jobId]);

  async function load() {
    const { data: custData } = await supabase.from("customers").select("*").order("name");
    setCustomers((custData as Customer[]) || []);

    const { data: job, error: jobErr } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (!jobErr && job) {
      setJobCode(job.job_code);
      setCustomerId(job.customer_id || "");
      setStatus(job.status || "potential");
      setOriginalStatus(job.status || "potential");
      const knownServices = (job.services || []).filter((s: string) => SERVICE_OPTIONS.includes(s));
      const extra = (job.services || []).filter((s: string) => !SERVICE_OPTIONS.includes(s));
      setServices(knownServices);
      setOtherServices(extra.join(", "));
      setEventDate(job.event_date || "");
      setExpectedCompletionDate(job.expected_completion_date || "");
      setEventLocation(job.event_location || "");
      setEstimatedPrice(job.estimated_price != null ? String(job.estimated_price) : "");
      setNotes(job.notes || "");
    }

    setLoading(false);
  }

  function toggleService(s: string) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function handleEventDateChange(v: string) {
    setEventDate(v);
    if (!expectedCompletionDate || expectedCompletionDate === suggestExpectedCompletion(eventDate)) {
      setExpectedCompletionDate(suggestExpectedCompletion(v));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!customerId) {
      setError("Sila pilih customer.");
      return;
    }
    setSubmitting(true);
    try {
      const allServices = [...services, ...(otherServices.trim() ? [otherServices.trim()] : [])];

      const { error: updErr } = await supabase
        .from("jobs")
        .update({
          customer_id: customerId,
          status,
          services: allServices,
          event_date: eventDate || null,
          expected_completion_date: expectedCompletionDate || null,
          event_location: eventLocation,
          estimated_price: estimatedPrice ? Number(estimatedPrice) : null,
          notes,
        })
        .eq("id", jobId);
      if (updErr) throw updErr;

      if (status !== originalStatus) {
        await logActivity(jobId, `Status changed: ${originalStatus} → ${status}`, user?.name);
      } else {
        await logActivity(jobId, "Job details updated", user?.name);
      }

      router.push("/jobs");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm opacity-60">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-terracotta mb-1">Edit Job</h1>
      <p className="text-xs font-mono opacity-60 mb-6">{jobCode}</p>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-terracotta/15 shadow-sm">
        <section>
          <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${status === s ? "bg-terracotta text-white" : "bg-terracotta/10 text-terracotta"}`}
              >
                {JOB_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Customer</h2>
          <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} />
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Services</h2>
          <div className="space-y-2 mb-3">
            {SERVICE_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={services.includes(s)} onChange={() => toggleService(s)} />
                {s}
              </label>
            ))}
          </div>
          <input
            className="input w-full"
            placeholder="Other / specific package"
            value={otherServices}
            onChange={(e) => setOtherServices(e.target.value)}
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Event Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs opacity-70">Event date</label>
              <input type="date" className="input w-full mt-1" value={eventDate} onChange={(e) => handleEventDateChange(e.target.value)} />
            </div>
            <div>
              <label className="text-xs opacity-70">Expected completion date</label>
              <input
                type="date"
                className="input w-full mt-1"
                value={expectedCompletionDate}
                onChange={(e) => setExpectedCompletionDate(e.target.value)}
              />
            </div>
            <input className="input" placeholder="Event location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
            <MoneyInput value={estimatedPrice} onChange={setEstimatedPrice} placeholder="Estimated price" />
          </div>
          <textarea
            className="input w-full mt-3"
            rows={3}
            placeholder="Notes / remarks"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-terracotta text-white py-3 rounded font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </form>

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
