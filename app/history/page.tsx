"use client";

import { useEffect, useState } from "react";
import { supabase, DocumentRecord } from "@/lib/supabase";
import { generatePdf } from "@/lib/pdf";
import PageHeader from "@/components/PageHeader";

const TYPE_STYLES: Record<string, string> = {
  quotation: "bg-gold/30 text-ink",
  invoice: "bg-blush/40 text-ink",
  receipt: "bg-terracotta/20 text-ink",
};

export default function HistoryPage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    setDocs((data as DocumentRecord[]) || []);
    setLoading(false);
  }

  const filtered = filter === "all" ? docs : docs.filter((d) => d.doc_type === filter);

  return (
    <div>
      <PageHeader
        title="Document History"
        subtitle={`${docs.length} documents`}
        action={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-white/40 bg-white/15 text-white rounded px-3 py-1.5 text-sm [&>option]:text-ink"
          >
            <option value="all">All types</option>
            <option value="quotation">Quotation</option>
            <option value="invoice">Invoice</option>
            <option value="receipt">Receipt</option>
          </select>
        }
      />

      {loading && <p className="text-sm opacity-60">Loading...</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-sm opacity-60">No documents yet. Create one from the dashboard.</p>
      )}

      <div className="space-y-3">
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="bg-white border border-terracotta/15 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${TYPE_STYLES[doc.doc_type]}`}>
                  {doc.doc_type}
                </span>
                <span className="font-mono text-sm font-semibold">{doc.doc_number}</span>
              </div>
              <div className="text-sm font-medium">{doc.customer_name}</div>
              <div className="text-xs opacity-60">
                {doc.customer_company} · {doc.doc_date}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="font-bold text-terracotta mb-2">RM {Number(doc.total).toFixed(2)}</div>
              <button
                onClick={() => generatePdf(doc)}
                className="text-xs bg-terracotta text-white px-3 py-1.5 rounded hover:opacity-90"
              >
                Download PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
