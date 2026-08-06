import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DocumentRecord } from "./supabase";
import { LOGO_BASE64, LOGO_ASPECT } from "./logo";

const BRAND_RED: [number, number, number] = [193, 91, 66]; // #C15B42
const INK: [number, number, number] = [43, 36, 32]; // #2B2420

const LABELS: Record<string, string> = {
  quotation: "QUOTATION",
  invoice: "INVOICE",
  receipt: "RECEIPT",
};

export function generatePdf(doc: DocumentRecord) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 40;

  // Company name (logo wordmark placeholder text)
  const logoWidth = 90;
  const logoHeight = logoWidth / LOGO_ASPECT;
  pdf.addImage(LOGO_BASE64, "PNG", margin, 20, logoWidth, logoHeight);

  pdf.setFontSize(10);
  pdf.setTextColor(...INK);
  pdf.setFont("helvetica", "normal");
  const companyLines = [
    "DECORE VENTURES",
    "CA0417745-P",
    "Flora Rosa, Zone 8A Precint 11,",
    "62300, Putrajaya, WP Putrajaya",
    "+6017 657 6955",
  ];
  const companyStartY = 20 + logoHeight + 14;
  companyLines.forEach((line, i) => pdf.text(line, margin, companyStartY + i * 13));

  // Document title top right
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  pdf.setTextColor(...BRAND_RED);
  const title = LABELS[doc.doc_type] || doc.doc_type.toUpperCase();
  pdf.text(title, pageWidth - margin, 55, { align: "right" });

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${doc.doc_type === "quotation" ? "QUO#" : doc.doc_type === "invoice" ? "INV#" : "RCP#"} : ${doc.doc_number}`, pageWidth - margin, 75, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Date: ${formatDate(doc.doc_date)}`, pageWidth - margin, 92, { align: "right" });
  if (doc.valid_until) {
    pdf.text(`Valid Until: ${formatDate(doc.valid_until)}`, pageWidth - margin, 106, { align: "right" });
  }

  // Divider
  pdf.setDrawColor(...BRAND_RED);
  pdf.setLineWidth(1.5);
  pdf.line(margin, 150, pageWidth - margin, 150);

  // Customer
  let y = 175;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...INK);
  pdf.text("CUSTOMER", margin, y);
  y += 16;
  pdf.setFont("helvetica", "normal");
  const custLines = [
    doc.customer_name,
    doc.customer_company || "",
    doc.customer_address || "",
    doc.customer_phone || "",
  ].filter(Boolean);
  custLines.forEach((line) => {
    pdf.text(line, margin, y);
    y += 14;
  });

  // Project description
  if (doc.project_description) {
    y += 10;
    pdf.setFont("helvetica", "bold");
    pdf.text("PROJECT DESCRIPTION:", margin, y);
    y += 16;
    pdf.setFont("helvetica", "normal");
    const split = pdf.splitTextToSize(doc.project_description, pageWidth - margin * 2);
    pdf.text(split, margin, y);
    y += split.length * 14;
  }

  y += 15;

  // Items table
  const rows = doc.items.map((item) => [
    item.description,
    String(item.quantity),
    `RM ${item.price.toFixed(2)}`,
    `RM ${(item.quantity * item.price).toFixed(2)}`,
  ]);

  autoTable(pdf, {
    startY: y,
    head: [["Description", "Quantity", "Price", "Total"]],
    body: rows,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: BRAND_RED, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 6 },
    foot: [["", "", "GRAND TOTAL", `RM ${doc.total.toFixed(2)}`]],
    footStyles: { fillColor: [251, 243, 236], textColor: INK, fontStyle: "bold" },
  });

  // @ts-ignore - lastAutoTable added by plugin
  let finalY = (pdf as any).lastAutoTable.finalY + 30;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("NOTE:", margin, finalY);
  finalY += 16;

  pdf.setFont("helvetica", "normal");
  const notes: string[] = [];
  if (doc.doc_type === "quotation") {
    notes.push("Quotation Validity: 7 days from the date the document is issued.");
  }
  if (doc.payment_terms) notes.push(`Payment Terms: ${doc.payment_terms}`);
  if (doc.notes) notes.push(doc.notes);

  notes.forEach((note) => {
    const split = pdf.splitTextToSize(note, pageWidth - margin * 2);
    pdf.text(split, margin, finalY);
    finalY += split.length * 14;
  });

  finalY += 40;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("DECORE VENTURES", margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text("____________________", margin, finalY + 16);
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text("Issued by", margin, finalY + 28);

  pdf.setFontSize(10);
  pdf.setTextColor(...INK);
  pdf.text("____________________", pageWidth - margin, finalY + 16, { align: "right" });
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text("Accepted by", pageWidth - margin, finalY + 28, { align: "right" });

  pdf.save(`${doc.doc_number}-${doc.doc_type}.pdf`);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB");
}
