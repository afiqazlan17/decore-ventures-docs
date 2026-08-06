import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mxgohqlfwzfyytprgnya.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14Z29ocWxmd3pmeXl0cHJnbnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1ODk3MDYsImV4cCI6MjEwMTE2NTcwNn0.83sDGXLz04EaNveq3u-NM5UgKsGc4XgPl2Tmw4U2PEE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type DocType = "quotation" | "invoice" | "receipt";

export interface DocItem {
  description: string;
  quantity: number;
  price: number;
}

export interface DocumentRecord {
  id?: string;
  doc_type: DocType;
  doc_number: string;
  doc_date: string;
  valid_until?: string | null;
  customer_name: string;
  customer_company?: string;
  customer_address?: string;
  customer_phone?: string;
  project_description?: string;
  items: DocItem[];
  subtotal: number;
  total: number;
  payment_terms?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
  job_id?: string | null;
  customer_id?: string | null;
}

export interface Customer {
  id?: string;
  customer_code: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
}

export type JobStatus = "potential" | "active" | "ongoing" | "completed";

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  potential: "Potential",
  active: "Active",
  ongoing: "Ongoing",
  completed: "Completed",
};

export const JOB_STATUS_COLOR: Record<JobStatus, string> = {
  potential: "bg-gray-200 text-gray-700",
  active: "bg-gold/40 text-ink",
  ongoing: "bg-blush/50 text-ink",
  completed: "bg-green-100 text-green-700",
};

export interface Job {
  id?: string;
  job_code: string;
  customer_id: string;
  services: string[];
  status: JobStatus;
  event_date?: string | null;
  expected_completion_date?: string | null;
  event_location?: string;
  estimated_price?: number | null;
  notes?: string;
  created_by?: string;
  created_at?: string;
  // joined field (not a DB column) when fetched with customer info
  customer?: Customer;
}

export const SERVICE_OPTIONS = [
  "Backdrop & Majlis Deco",
  "Door Gift",
  "Corporate Event Deco",
];

export interface ActivityLog {
  id?: string;
  job_id: string;
  action: string;
  performed_by?: string;
  created_at?: string;
}

export async function logActivity(jobId: string, action: string, performedBy?: string) {
  await supabase.from("job_activity_log").insert({
    job_id: jobId,
    action,
    performed_by: performedBy || "Unknown",
  });
}

// Suggest expected completion date = event date minus N days (default 3)
export function suggestExpectedCompletion(eventDate: string, daysBefore = 3): string {
  if (!eventDate) return "";
  const d = new Date(eventDate);
  d.setDate(d.getDate() - daysBefore);
  return d.toISOString().slice(0, 10);
}

export function urgencyBadge(job: Job): { label: string; className: string } | null {
  if (job.status === "completed" || !job.expected_completion_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(job.expected_completion_date);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { label: `⚠️ Overdue ${Math.abs(diffDays)} hari`, className: "bg-red-600 text-white" };
  if (diffDays === 0) return { label: "⚠️ Due Today", className: "bg-red-500 text-white" };
  if (diffDays <= 3) return { label: `⚠️ ${diffDays} hari lagi`, className: "bg-orange-400 text-white" };
  return null;
}
