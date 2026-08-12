"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase, Customer, DocItem, DocumentRecord, DocType, logActivity } from "@/lib/supabase";
import { generatePdf, getPdfBlob, openPdfForPrint } from "@/lib/pdf";
import DocPreview from "@/components/DocPreview";
import CustomerPicker from "@/components/CustomerPicker";
import { STANDARD_NOTES } from "@/lib/constants";
import { useAuth } from "@/components/AuthGate";

const PREFIX: Record<DocType, string> = {
  quotation: "QD",
  invoice: "ID",
  receipt: "RD",
};

const LABEL: Record<DocType, string> = {
  quotation: "Quotation",
  invoice: "Invoice",
  receipt: "Receipt",
};

export default function NewDocPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const docType = (params?.type as string) as DocType;

  const [customerName, setCustomerName] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [docDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [items, setItems] = useState<DocItem[]>([{ title: "", description: "", quantity: 1, price: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [linkedCustomerId, setLinkedCustomerId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCustomers((data as Customer[]) || []));
  }, []);

  function applyCustomer(id: string) {
    const c = customers.find((c) => c.id === id);
    if (!c) return;
    setLinkedCustomerId(id);
    setCustomerName(c.name);
    setCustomerCompany(c.company || "");
    setCustomerAddress(c.address || "");
    setCustomerPhone(c.phone || "");
  }

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("*, customer:customers(*)")
        .eq("id", jobId)
        .single();
      if (job) {
        setCustomerName(job.customer?.name || "");
        setCustomerCompany(job.customer?.company || "");
        setCustomerPhone(job.customer?.phone || "");
        setCustomerAddress(job.customer?.address || job.event_location || "");
        setLinkedCustomerId(job.customer_id || null);
        const parts = [
          job.services?.length ? `Services: ${job.services.join(", ")}.` : "",
          job.event_date ? `Event date: ${job.event_date}.` : "",
          job.event_location ? `Location: ${job.event_location}.` : "",
        ].filter(Boolean);
        setProjectDescription(parts.join(" "));
        if (job.estimated_price) {
          setItems([{ title: job.services?.join(", ") || "Decoration services", description: "", quantity: 1, price: Number(job.estimated_price) }]);
        }
      }
    })();
  }, [jobId]);

  if (!["quotation", "invoice", "receipt"].includes(docType)) {
    return <p className="text-sm text-red-600">Unknown document type.</p>;
  }

  function updateItem(index: number, field: keyof DocItem, value: string | number) {
    const next = [...items];
    // @ts-ignore
    next[index][field] = field === "title" || field === "description" ? value : Number(value);
    setItems(next);
  }

  function addItem() {
    setItems([...items, { title: "", description: "", quantity: 1, price: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  // Combine payment terms + standard notes for what actually gets printed (mirrors lib/pdf.ts ordering)
  const fullNotes = [
    docType === "quotation" ? "Quotation Validity: 7 days from the date the document is issued." : "",
    STANDARD_NOTES,
  ]
    .filter(Boolean)
    .join("\n");

  function waLink(phone: string) {
    const digits = phone.replace(/[^0-9]/g, "");
    if (!digits) return null;
    const withCountry = digits.startsWith("0") ? `60${digits.slice(1)}` : digits;
    return `https://wa.me/${withCountry}`;
  }

  async function handleAction(action: "download" | "print" | "whatsapp") {
    setError("");
    if (!customerName.trim()) {
      setError("Sila isi nama customer.");
      return;
    }
    if (items.length === 0 || items.some((i) => !i.title.trim())) {
      setError("Sila isi tajuk untuk semua item.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: numberData, error: numErr } = await supabase.rpc("next_doc_number", {
        p_doc_type: docType,
        p_prefix: PREFIX[docType],
      });
      if (numErr) throw numErr;

      const record: DocumentRecord = {
        doc_type: docType,
        doc_number: numberData as string,
        doc_date: docDate,
        valid_until: docType === "quotation" && validUntil ? validUntil : null,
        customer_name: customerName,
        customer_company: customerCompany,
        customer_address: customerAddress,
        customer_phone: customerPhone,
        project_description: projectDescription,
        items,
        subtotal: total,
        total,
        payment_terms: "50% deposit for confirmation, 50% balance upon full completion of installation.",
        notes: STANDARD_NOTES,
        created_by: createdBy,
        job_id: jobId || null,
        customer_id: linkedCustomerId,
      };

      const { error: insertErr } = await supabase.from("documents").insert(record);
      if (insertErr) throw insertErr;

      if (jobId) {
        const nextStatus = docType === "quotation" ? "active" : docType === "invoice" ? "ongoing" : "completed";
        await supabase.from("jobs").update({ status: nextStatus }).eq("id", jobId);
        await logActivity(jobId, `${LABEL[docType]} ${record.doc_number} created`, user?.name);
      }

      if (action === "print") {
        openPdfForPrint(record);
      } else if (action === "whatsapp") {
        const { blob, filename } = getPdfBlob(record);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        const target = window.prompt("Send to which WhatsApp number?", customerPhone || "");
        if (target) {
          const link = waLink(target) || "https://wa.me/";
          window.open(
            `${link}?text=${encodeURIComponent(`${LABEL[docType]} ${record.doc_number} — PDF telah dimuat turun, sila attach fail tersebut.`)}`,
            "_blank"
          );
        }
      } else {
        generatePdf(record);
      }

      router.push(jobId ? "/jobs" : "/history");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div>
        <h1 className="text-2xl font-bold text-terracotta mb-6">New {LABEL[docType]}</h1>
        <form onSubmit={(e) => { e.preventDefault(); handleAction("download"); }} className="space-y-6 bg-white p-6 rounded-lg border border-terracotta/15 shadow-sm">
          <section>
            <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Customer</h2>
            <div className="mb-3">
              <CustomerPicker
                customers={customers}
                value={linkedCustomerId || ""}
                onChange={applyCustomer}
                placeholder="Pick an existing customer to auto-fill (optional)..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="input" placeholder="Customer name *" value={customerName} onChange={(e) => { setCustomerName(e.target.value); setLinkedCustomerId(null); }} />
              <input className="input" placeholder="Company" value={customerCompany} onChange={(e) => setCustomerCompany(e.target.value)} />
              <input className="input sm:col-span-2" placeholder="Address" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
              <input className="input" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              <input className="input" placeholder="Staff name (issued by)" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Project</h2>
            <textarea
              className="input w-full"
              rows={2}
              placeholder="Project description"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            />
            {docType === "quotation" && (
              <div className="mt-3">
                <label className="text-xs opacity-70">Valid until</label>
                <input type="date" className="input block mt-1" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase text-terracotta mb-3">Items</h2>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start border border-terracotta/10 rounded-md p-2">
                  <input
                    className="input col-span-12 font-semibold"
                    placeholder="Title *"
                    value={item.title}
                    onChange={(e) => updateItem(i, "title", e.target.value)}
                  />
                  <textarea
                    className="input col-span-12"
                    rows={2}
                    placeholder="Description (optional)"
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                  />
                  <input
                    type="number"
                    className="input col-span-5 sm:col-span-3"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                  />
                  <input
                    type="number"
                    className="input col-span-5 sm:col-span-3"
                    placeholder="Price (RM)"
                    value={item.price}
                    onChange={(e) => updateItem(i, "price", e.target.value)}
                  />
                  <button type="button" onClick={() => removeItem(i)} className="col-span-2 sm:col-span-1 text-red-500 text-sm text-center">
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-3 text-sm text-terracotta font-medium">
              + Add item
            </button>
            <div className="text-right mt-4 font-bold text-terracotta">Total: RM {total.toFixed(2)}</div>
          </section>

          <section>
            <p className="text-xs opacity-50">
              Payment terms, rental period, bank account, work schedule & ownership terms are added automatically — see preview.
            </p>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction("print")}
              className="flex-1 border border-terracotta text-terracotta py-3 rounded font-semibold hover:bg-terracotta/5 disabled:opacity-50"
            >
              🖨 Print
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction("whatsapp")}
              className="flex-1 border border-terracotta text-terracotta py-3 rounded font-semibold hover:bg-terracotta/5 disabled:opacity-50"
            >
              💬 WhatsApp
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-terracotta text-white py-3 rounded font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Generating..." : "Download PDF"}
            </button>
          </div>
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

      <div>
        <h2 className="text-sm font-semibold uppercase text-terracotta mb-3 lg:mt-[52px]">Live Preview</h2>
        <DocPreview
          docType={docType}
          docDate={docDate}
          validUntil={validUntil}
          customerName={customerName}
          customerCompany={customerCompany}
          customerAddress={customerAddress}
          customerPhone={customerPhone}
          projectDescription={projectDescription}
          items={items}
          notes={fullNotes}
        />
      </div>
    </div>
  );
}
