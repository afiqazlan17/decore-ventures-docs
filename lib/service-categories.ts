// Backdrop Decoration is the only category with a real photographed
// catalog (see lib/catalog-data.ts) — everything else is quoted ad hoc per
// job, so those categories just let staff add a description + price line
// instead of picking from fixed packages.
export interface ServiceCategory {
  key: string;
  label: string;
  hasCatalog?: boolean;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { key: "backdrop", label: "Backdrop Decoration", hasCatalog: true },
  { key: "door_gift", label: "Door Gift" },
  { key: "bunga_telur", label: "Bunga Telur & Hantaran" },
  { key: "balloon", label: "Balloon Décor" },
  { key: "centerpiece", label: "Centerpiece / Meja Utama" },
  { key: "signage", label: "Signage" },
  { key: "other", label: "Other / Custom" },
];

export interface CategoryLineItem {
  description: string;
  price: number;
}
