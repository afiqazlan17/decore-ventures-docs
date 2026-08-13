"use client";

import { useEffect, useState } from "react";
import { supabase, Customer } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";
import CustomerFormModal from "@/components/CustomerFormModal";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    setCustomers((data as Customer[]) || []);
    setLoading(false);
  }

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.customer_code.toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Customer Directory"
        subtitle={`${customers.length} customers`}
        action={
          <button
            onClick={() => setShowNew(true)}
            className="bg-white/15 border border-white/40 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-white/25"
          >
            + New Customer
          </button>
        }
      />

      <input
        className="input w-full mb-4"
        placeholder="Search by name, ID, or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className="text-sm opacity-60">Loading...</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-sm opacity-60">No customers yet. Add one to get started.</p>
      )}

      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white border border-terracotta/15 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{c.name}</div>
              <span className="font-mono text-xs bg-terracotta/10 text-terracotta px-2 py-0.5 rounded">
                {c.customer_code}
              </span>
            </div>
            <div className="text-xs opacity-60 mt-1">
              {c.phone && <span>{c.phone}</span>}
              {c.email && <span> · {c.email}</span>}
              {c.address && <span> · {c.address}</span>}
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <CustomerFormModal
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
