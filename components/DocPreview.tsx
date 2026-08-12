"use client";

import { DocItem, DocType } from "@/lib/supabase";

const LABEL: Record<DocType, string> = {
  quotation: "QUOTATION",
  invoice: "INVOICE",
  receipt: "RECEIPT",
};

const NUMBER_LABEL: Record<DocType, string> = {
  quotation: "QUO#",
  invoice: "INV#",
  receipt: "RCP#",
};

interface Props {
  docType: DocType;
  docNumber?: string;
  docDate: string;
  validUntil?: string;
  customerName: string;
  customerCompany: string;
  customerAddress: string;
  customerPhone: string;
  projectDescription: string;
  items: DocItem[];
  notes: string;
}

export default function DocPreview({
  docType,
  docNumber,
  docDate,
  validUntil,
  customerName,
  customerCompany,
  customerAddress,
  customerPhone,
  projectDescription,
  items,
  notes,
}: Props) {
  const total = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);

  return (
    <div
      className="bg-white shadow-lg border border-terracotta/10 text-[13px] text-ink leading-snug sticky top-6 mx-auto overflow-y-auto"
      style={{ width: "100%", maxWidth: 595, aspectRatio: "210 / 297", padding: "36px" }}
    >
      <div className="flex justify-between items-start border-b-2 border-terracotta pb-4 mb-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Decore" className="h-12 w-auto mb-2 -ml-1" />
          <div className="text-[11px] leading-tight">
            <div className="font-semibold">DECORE VENTURES</div>
            <div>CA0417745-P</div>
            <div>Flora Rosa, Zone 8A Precint 11,</div>
            <div>62300, Putrajaya, WP Putrajaya</div>
            <div>+6017 657 6955</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-terracotta text-2xl font-bold">{LABEL[docType]}</div>
          <div className="font-semibold text-sm mt-1">
            {NUMBER_LABEL[docType]} : {docNumber || "(auto-generated)"}
          </div>
          <div className="text-[11px] mt-1">Date: {formatDate(docDate)}</div>
          {docType === "quotation" && validUntil && (
            <div className="text-[11px]">Valid Until: {formatDate(validUntil)}</div>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="font-semibold text-[11px] uppercase mb-1">Customer</div>
        <div>{customerName || <span className="opacity-40">Customer name</span>}</div>
        {customerCompany && <div>{customerCompany}</div>}
        {customerAddress && <div>{customerAddress}</div>}
        {customerPhone && <div>{customerPhone}</div>}
      </div>

      {projectDescription && (
        <div className="mb-3">
          <div className="font-semibold text-[11px]">PROJECT DESCRIPTION:</div>
          <div className="whitespace-pre-line break-words">{projectDescription}</div>
        </div>
      )}

      <table className="w-full border-collapse mb-3 text-[12px] table-fixed">
        <thead>
          <tr className="bg-terracotta text-white">
            <th className="text-left p-1.5 font-semibold w-[46%]">Description</th>
            <th className="text-center p-1.5 font-semibold w-14">Qty</th>
            <th className="text-right p-1.5 font-semibold w-20">Price</th>
            <th className="text-right p-1.5 font-semibold w-24">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="p-2 text-center opacity-40 italic">
                No items yet
              </td>
            </tr>
          )}
          {items.map((item, i) => (
            <tr key={i} className="border-b border-terracotta/10">
              <td className="p-1.5 break-words whitespace-pre-line">
                <div className="font-semibold">{item.title || <span className="opacity-30 font-normal">—</span>}</div>
                {item.description && <div className="font-normal opacity-70 text-[11px] mt-0.5">{item.description}</div>}
              </td>
              <td className="p-1.5 text-center">{item.quantity}</td>
              <td className="p-1.5 text-right">RM {Number(item.price || 0).toFixed(2)}</td>
              <td className="p-1.5 text-right">RM {(Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-cream font-bold">
            <td colSpan={3} className="p-1.5 text-right">
              GRAND TOTAL
            </td>
            <td className="p-1.5 text-right">RM {total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {notes && (
        <div className="mb-4 whitespace-pre-line text-[11px]">
          <div className="font-semibold mb-1">NOTE:</div>
          {notes}
        </div>
      )}

      <div className="flex justify-between mt-8 text-[11px]">
        <div>
          <div className="font-semibold mb-1">DECORE VENTURES</div>
          <div>____________________</div>
          <div className="opacity-60 mt-0.5">Issued by</div>
        </div>
        <div className="text-right">
          <div>____________________</div>
          <div className="opacity-60 mt-0.5">Accepted by</div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB");
}
