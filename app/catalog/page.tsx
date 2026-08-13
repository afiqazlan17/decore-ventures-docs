"use client";

import { useState } from "react";
import { CATALOG } from "@/lib/catalog-data";
import PageHeader from "@/components/PageHeader";

export default function CatalogPage() {
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  return (
    <div>
      <PageHeader title="Catalog" subtitle={`${CATALOG.length} packages`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CATALOG.map((item) => (
          <div key={item.code} className="bg-white border border-terracotta/15 rounded-xl overflow-hidden shadow-sm">
            <div className="aspect-square bg-cream flex items-center justify-center overflow-hidden">
              {!broken[item.code] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-contain"
                  onError={() => setBroken((b) => ({ ...b, [item.code]: true }))}
                />
              ) : (
                <span className="text-xs opacity-40 px-4 text-center">Image coming soon</span>
              )}
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-semibold text-terracotta">{item.name}</span>
              <span className="font-bold">RM {item.price}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
