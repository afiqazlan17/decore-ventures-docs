"use client";

import { useEffect, useState } from "react";
import { supabase, Vendor, VENDOR_CATEGORY_LABEL } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";
import VendorFormModal from "@/components/VendorFormModal";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
    setVendors((data as Vendor[]) || []);
    setLoading(false);
  }

  const filtered = vendors.filter((v) => {
    if (category !== "all" && v.category !== category) return false;
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.company || "").toLowerCase().includes(q) ||
      v.vendor_code.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Vendor Directory"
        subtitle={`${vendors.length} vendors`}
        action={
          <button
            onClick={() => setShowNew(true)}
            className="bg-white/15 border border-white/40 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-white/25"
          >
            + New Vendor
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          className="input flex-1"
          placeholder="Search by name, company, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {Object.entries(VENDOR_CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm opacity-60">Loading...</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-sm opacity-60">No vendors yet. Add one to get started.</p>
      )}

      <div className="space-y-3">
        {filtered.map((v) => (
          <div key={v.id} className="bg-white border border-terracotta/15 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">
                {v.name}
                {v.company && <span className="font-normal opacity-60"> · {v.company}</span>}
              </div>
              <span className="font-mono text-xs bg-terracotta/10 text-terracotta px-2 py-0.5 rounded shrink-0">
                {v.vendor_code}
              </span>
            </div>
            <div className="text-xs opacity-60 mt-1 flex flex-wrap gap-x-2">
              <span className="bg-blush/30 text-ink px-2 py-0.5 rounded-full">{VENDOR_CATEGORY_LABEL[v.category]}</span>
              {v.phone && <span>{v.phone}</span>}
              {v.email && <span>· {v.email}</span>}
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <VendorFormModal
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
