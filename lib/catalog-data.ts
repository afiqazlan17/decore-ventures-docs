export interface CatalogItem {
  code: string;
  name: string;
  price: number;
  image: string;
}

export const CATALOG: CatalogItem[] = [
  { code: "A", name: "Pakej A", price: 199, image: "/catalog/pakej-a.jpg" },
  { code: "B", name: "Pakej B", price: 269, image: "/catalog/pakej-b.jpg" },
  { code: "C", name: "Pakej C", price: 459, image: "/catalog/pakej-c.jpg" },
  { code: "D", name: "Pakej D", price: 469, image: "/catalog/pakej-d.jpg" },
  { code: "E", name: "Pakej E", price: 499, image: "/catalog/pakej-e.jpg" },
  { code: "Aqiqah", name: "Pakej Aqiqah", price: 339, image: "/catalog/pakej-aqiqah.jpg" },
];
