"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Customer } from "@/lib/supabase";

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-terracotta">Customers</h1>
        <button
          onClick={() => router.push("/customers/new")}
          className="bg-terracotta text-white px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90"
        >
          + Add Customer
        </button>
      </div>

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
