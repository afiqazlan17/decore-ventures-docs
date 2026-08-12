"use client";

import { useMemo, useState } from "react";
import { ItemLibraryEntry } from "@/lib/supabase";

interface Props {
  library: ItemLibraryEntry[];
  value: string;
  onChangeText: (value: string) => void;
  onSelect: (entry: ItemLibraryEntry) => void;
}

export default function ItemPicker({ library, value, onChangeText, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const sorted = [...library].sort((a, b) => (b.usage_count || 1) - (a.usage_count || 1));
    if (!q) return sorted.slice(0, 8);
    return sorted.filter((it) => it.title.toLowerCase().includes(q)).slice(0, 8);
  }, [library, value]);

  return (
    <div className="relative">
      <input
        className="input col-span-12 font-semibold"
        placeholder="Title * (search saved items or type new)"
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-terracotta/20 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((it) => (
            <button
              type="button"
              key={it.id}
              onMouseDown={() => onSelect(it)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-terracotta/10 border-b border-terracotta/5 last:border-b-0"
            >
              <div className="font-semibold">{it.title}</div>
              {it.description && <div className="text-xs opacity-60 mt-0.5">{it.description}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
