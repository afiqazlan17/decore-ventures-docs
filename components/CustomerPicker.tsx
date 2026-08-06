"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Customer } from "@/lib/supabase";

interface Props {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

export default function CustomerPicker({ customers, value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = customers.find((c) => c.id === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 30);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.customer_code.toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [customers, query]);

  return (
    <div ref={wrapRef} className="relative">
      <input
        className="input w-full"
        placeholder={placeholder || "Search customer by name, ID, or phone..."}
        value={open ? query : selected ? `${selected.name} (${selected.customer_code})` : ""}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-terracotta/20 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm opacity-50">No customers found.</div>
          )}
          {filtered.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => {
                onChange(c.id!);
                setOpen(false);
                setQuery("");
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-terracotta/10 flex items-center justify-between"
            >
              <span>{c.name}</span>
              <span className="text-xs font-mono opacity-60">
                {c.customer_code} {c.phone ? `· ${c.phone}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
