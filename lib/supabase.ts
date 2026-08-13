import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local (or set them in Vercel project settings) and fill in the values."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type DocType = "quotation" | "invoice" | "receipt";

export interface DocItem {
  title: string;
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

export type VendorCategory = "decor_rental" | "printing" | "delivery" | "event_equipment" | "freelance" | "other";

export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> = {
  decor_rental: "Decor & Rental",
  printing: "Printing",
  delivery: "Delivery / Logistics",
  event_equipment: "Event & Equipment",
  freelance: "Design / Freelance",
  other: "Other",
};

export interface Vendor {
  id?: string;
  vendor_code: string;
  name: string;
  company?: string;
  category: VendorCategory;
  phone?: string;
  email?: string;
  bank_name?: string;
  bank_account?: string;
  address?: string;
  notes?: string;
  created_at?: string;
}

export interface ActivityLog {
  id?: string;
  job_id: string;
  action: string;
  performed_by?: string;
  created_at?: string;
}

export interface ItemLibraryEntry {
  id?: string;
  title: string;
  description?: string | null;
  usage_count?: number;
}

// Reuses an existing item_library row (bumping its usage_count) if one
// already matches the title case-insensitively, otherwise inserts a new
// one — so the item picker's "most used" ordering reflects real usage.
export async function saveLibraryItem(title: string, description: string) {
  const name = title.trim();
  if (!name) return;
  const { data: existing } = await supabase
    .from("item_library")
    .select("id, usage_count")
    .ilike("title", name)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("item_library")
      .update({ usage_count: (existing.usage_count || 1) + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("item_library").insert({ title: name, description: description.trim() || null });
  }
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
