"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  Customer,
  Job,
  JobStatus,
  JOB_STATUS_LABEL,
  logActivity,
  suggestExpectedCompletion,
} from "@/lib/supabase";
import { CATALOG } from "@/lib/catalog-data";
import { SERVICE_CATEGORIES, CategoryLineItem } from "@/lib/service-categories";
import CustomerPicker from "./CustomerPicker";
import MoneyInput from "./MoneyInput";
import Modal from "./Modal";
import { useAuth } from "./AuthGate";

const STATUSES: JobStatus[] = ["potential", "active", "ongoing", "completed"];

function blankCategoryItems(): Record<string, CategoryLineItem[]> {
  const map: Record<string, CategoryLineItem[]> = {};
  SERVICE_CATEGORIES.forEach((c) => {
    if (!c.hasCatalog) map[c.key] = [];
  });
  return map;
}

// Old jobs only have a flat services:string[] + one estimated_price total —
// there's no per-item price to recover, so anything that isn't a known
// Catalog package name is dropped into "Other" as a description-only line.
function servicesToCategoryItems(services: string[]): Record<string, CategoryLineItem[]> {
  const map = blankCategoryItems();
  const packageNames = new Set(CATALOG.map((c) => c.name));
  services.forEach((s) => {
    if (packageNames.has(s)) return;
    const match = SERVICE_CATEGORIES.find((c) => !c.hasCatalog && s.startsWith(`${c.label}: `));
    if (match) {
      map[match.key].push({ description: s.slice(match.label.length + 2), price: 0 });
    } else {
      map.other.push({ description: s, price: 0 });
    }
  });
  return map;
}

export default function JobFormModal({ job, onClose, onSaved }: { job?: Job; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const isEdit = !!job;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState(job?.customer_id || "");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [status, setStatus] = useState<JobStatus>(job?.status || "potential");

  const [selectedPackages, setSelectedPackages] = useState<string[]>(() =>
    CATALOG.filter((c) => (job?.services || []).includes(c.name)).map((c) => c.code)
  );
  const [brokenImg, setBrokenImg] = useState<Record<string, boolean>>({});
  const [categoryItems, setCategoryItems] = useState<Record<string, CategoryLineItem[]>>(() =>
    job ? servicesToCategoryItems(job.services || []) : blankCategoryItems()
  );

  const [eventDate, setEventDate] = useState(job?.event_date || "");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(job?.expected_completion_date || "");
  const [eventLocation, setEventLocation] = useState(job?.event_location || "");
  const [estimatedPrice, setEstimatedPrice] = useState(job?.estimated_price != null ? String(job.estimated_price) : "");
  const [notes, setNotes] = useState(job?.notes || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("customers")
      .select("*")
      .order("name")
      .then(({ data }) => setCustomers((data as Customer[]) || []));
  }, []);

  function recomputePrice(packages: string[], items: Record<string, CategoryLineItem[]>) {
    const pkgSum = CATALOG.filter((c) => packages.includes(c.code)).reduce((s, c) => s + c.price, 0);
    const itemSum = Object.values(items).reduce((s, arr) => s + arr.reduce((s2, i) => s2 + (Number(i.price) || 0), 0), 0);
    setEstimatedPrice(String(pkgSum + itemSum));
  }

  function togglePackage(code: string) {
    setSelectedPackages((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      recomputePrice(next, categoryItems);
      return next;
    });
  }

  function addItem(categoryKey: string) {
    setCategoryItems((prev) => ({ ...prev, [categoryKey]: [...prev[categoryKey], { description: "", price: 0 }] }));
  }

  function updateItem(categoryKey: string, index: number, field: "description" | "price", value: string) {
    setCategoryItems((prev) => {
      const next = { ...prev, [categoryKey]: prev[categoryKey].map((it, i) => (i === index ? { ...it, [field]: field === "price" ? Number(value) || 0 : value } : it)) };
      recomputePrice(selectedPackages, next);
      return next;
    });
  }

  function removeItem(categoryKey: string, index: number) {
    setCategoryItems((prev) => {
      const next = { ...prev, [categoryKey]: prev[categoryKey].filter((_, i) => i !== index) };
      recomputePrice(selectedPackages, next);
      return next;
    });
  }

  function handleEventDateChange(v: string) {
    setEventDate(v);
    if (!expectedCompletionDate || expectedCompletionDate === suggestExpectedCompletion(eventDate)) {
      setExpectedCompletionDate(suggestExpectedCompletion(v));
    }
  }

  function buildServices(): string[] {
    const packageNames = CATALOG.filter((c) => selectedPackages.includes(c.code)).map((c) => c.name);
    const itemStrings: string[] = [];
    SERVICE_CATEGORIES.filter((c) => !c.hasCatalog).forEach((c) => {
      categoryItems[c.key].forEach((item) => {
        if (item.description.trim()) itemStrings.push(`${c.label}: ${item.description.trim()}`);
      });
    });
    return [...packageNames, ...itemStrings];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isEdit && mode === "existing" && !customerId) {
      setError("Sila pilih customer.");
      return;
    }
    if (!isEdit && mode === "new" && !newName.trim()) {
      setError("Sila isi nama customer baru.");
      return;
    }

    setSubmitting(true);
    try {
      const allServices = buildServices();

      if (isEdit && job) {
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
          .eq("id", job.id);
        if (updErr) throw updErr;

        if (status !== job.status) {
          await logActivity(job.id!, `Status changed: ${job.status} → ${status}`, user?.name);
        } else {
          await logActivity(job.id!, "Job details updated", user?.name);
        }
      } else {
        let finalCustomerId = customerId;

        if (mode === "new") {
          const { data: codeData, error: codeErr } = await supabase.rpc("next_pretty_code", {
            p_doc_type: "customer",
            p_prefix: "DV",
          });
          if (codeErr) throw codeErr;

          const { data: newCust, error: custErr } = await supabase
            .from("customers")
            .insert({ customer_code: codeData as string, name: newName, phone: newPhone })
            .select()
            .single();
          if (custErr) throw custErr;
          finalCustomerId = newCust.id;
        }

        const { data: jobCodeData, error: jobCodeErr } = await supabase.rpc("next_pretty_code", {
          p_doc_type: "job",
          p_prefix: "DV-J",
        });
        if (jobCodeErr) throw jobCodeErr;

        const { data: newJob, error: jobErr } = await supabase
          .from("jobs")
          .insert({
            job_code: jobCodeData as string,
            customer_id: finalCustomerId,
            services: allServices,
            status: "potential",
            event_date: eventDate || null,
            expected_completion_date: expectedCompletionDate || null,
            event_location: eventLocation,
            estimated_price: estimatedPrice ? Number(estimatedPrice) : null,
            notes,
            created_by: user?.name,
          })
          .select()
          .single();
        if (jobErr) throw jobErr;

        await logActivity(newJob.id, "Job created", user?.name);
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Job" : "Create New Job"} subtitle={job?.job_code} onClose={onClose} width="max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {isEdit && (
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
        )}

        <section>
          <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Customer</h2>
          {isEdit ? (
            <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} />
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMode("existing")}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${mode === "existing" ? "bg-terracotta text-white" : "bg-terracotta/10 text-terracotta"}`}
                >
                  Existing Customer
                </button>
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${mode === "new" ? "bg-terracotta text-white" : "bg-terracotta/10 text-terracotta"}`}
                >
                  New Customer
                </button>
              </div>
              {mode === "existing" ? (
                <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="input" placeholder="Customer name *" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <input className="input" placeholder="Phone number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </div>
              )}
            </>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Backdrop Decoration</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATALOG.map((item) => {
              const selected = selectedPackages.includes(item.code);
              return (
                <button
                  type="button"
                  key={item.code}
                  onClick={() => togglePackage(item.code)}
                  className={`text-left bg-white border rounded-lg overflow-hidden shadow-sm transition ${
                    selected ? "border-terracotta ring-2 ring-terracotta" : "border-terracotta/15"
                  }`}
                >
                  <div className="aspect-square bg-cream flex items-center justify-center overflow-hidden relative">
                    {!brokenImg[item.code] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        onError={() => setBrokenImg((b) => ({ ...b, [item.code]: true }))}
                      />
                    ) : (
                      <span className="text-xs opacity-40 px-4 text-center">Image coming soon</span>
                    )}
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 bg-terracotta text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="p-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-terracotta">{item.name}</span>
                    <span className="font-bold">RM {item.price}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SERVICE_CATEGORIES.filter((c) => !c.hasCatalog).map((cat) => (
            <div key={cat.key} className="border border-terracotta/10 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase text-terracotta">{cat.label}</h3>
                <button type="button" onClick={() => addItem(cat.key)} className="text-xs text-terracotta font-medium">
                  + Add item
                </button>
              </div>
              {categoryItems[cat.key].length === 0 && <p className="text-xs opacity-40">Takde item lagi.</p>}
              <div className="space-y-2">
                {categoryItems[cat.key].map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="input flex-1 text-xs"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(cat.key, i, "description", e.target.value)}
                    />
                    <input
                      type="number"
                      className="input w-20 text-xs"
                      placeholder="RM"
                      value={item.price || ""}
                      onChange={(e) => updateItem(cat.key, i, "price", e.target.value)}
                    />
                    <button type="button" onClick={() => removeItem(cat.key, i)} className="text-red-500 text-sm">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
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

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 border border-terracotta/30 text-terracotta py-3 rounded font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-terracotta text-white py-3 rounded font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Job"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
