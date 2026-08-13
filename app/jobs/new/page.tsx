"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Customer, SERVICE_OPTIONS, logActivity, suggestExpectedCompletion } from "@/lib/supabase";
import { CATALOG } from "@/lib/catalog-data";
import CustomerPicker from "@/components/CustomerPicker";
import MoneyInput from "@/components/MoneyInput";
import { useAuth } from "@/components/AuthGate";

export default function NewJobPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");

  const [customerId, setCustomerId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [brokenImg, setBrokenImg] = useState<Record<string, boolean>>({});
  const [services, setServices] = useState<string[]>([]);
  const [otherServices, setOtherServices] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from("customers").select("*").order("name");
    setCustomers((data as Customer[]) || []);
  }

  function toggleService(s: string) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function togglePackage(code: string) {
    setSelectedPackages((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      if (next.length > 0) {
        const sum = CATALOG.filter((c) => next.includes(c.code)).reduce((total, c) => total + c.price, 0);
        setEstimatedPrice(String(sum));
      }
      return next;
    });
  }

  function handleEventDateChange(v: string) {
    setEventDate(v);
    // Auto-suggest: Decore team should be ready 3 days before the event
    if (!expectedCompletionDate || expectedCompletionDate === suggestExpectedCompletion(eventDate)) {
      setExpectedCompletionDate(suggestExpectedCompletion(v));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "existing" && !customerId) {
      setError("Sila pilih customer.");
      return;
    }
    if (mode === "new" && !newName.trim()) {
      setError("Sila isi nama customer baru.");
      return;
    }

    setSubmitting(true);
    try {
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

      const packageNames = CATALOG.filter((c) => selectedPackages.includes(c.code)).map((c) => c.name);
      const allServices = [...packageNames, ...services, ...(otherServices.trim() ? [otherServices.trim()] : [])];

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
        })
        .select()
        .single();
      if (jobErr) throw jobErr;

      await logActivity(newJob.id, "Job created", user?.name);

      router.push("/jobs");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-terracotta mb-6">Create New Job</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-terracotta/15 shadow-sm">
        <section>
          <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Customer</h2>
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
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Packages (Catalog)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
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
                  <div className="p-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-terracotta">{item.name}</span>
                    <span className="font-bold">RM {item.price}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedPackages.length > 0 && (
            <p className="text-xs opacity-60 mb-1">
              Estimated price auto-filled from selected packages — you can still edit it below.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Additional Services</h2>
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
            placeholder="Other / specific package (e.g. Pakej C - Twin Arch)"
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
          {submitting ? "Saving..." : "Create Job"}
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
