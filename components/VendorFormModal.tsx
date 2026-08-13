"use client";

import { useState } from "react";
import { supabase, VendorCategory, VENDOR_CATEGORY_LABEL } from "@/lib/supabase";
import Modal from "./Modal";

export default function VendorFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState<VendorCategory>("other");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Sila isi nama vendor.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: codeData, error: codeErr } = await supabase.rpc("next_pretty_code", {
        p_doc_type: "vendor",
        p_prefix: "DV-V",
      });
      if (codeErr) throw codeErr;

      const { error: insertErr } = await supabase.from("vendors").insert({
        vendor_code: codeData as string,
        name,
        company,
        category,
        phone,
        email,
        bank_name: bankName,
        bank_account: bankAccount,
        address,
        notes,
      });
      if (insertErr) throw insertErr;

      onSaved();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Vendor" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium opacity-60 block mb-1">Vendor / Contact Name *</label>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium opacity-60 block mb-1">Company</label>
          <input className="input w-full" placeholder="Optional" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium opacity-60 block mb-1">Category *</label>
          <select className="input w-full" value={category} onChange={(e) => setCategory(e.target.value as VendorCategory)}>
            {Object.entries(VENDOR_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium opacity-60 block mb-1">Phone</label>
            <input className="input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium opacity-60 block mb-1">Email</label>
            <input className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium opacity-60 block mb-1">Bank Name</label>
            <input className="input w-full" placeholder="e.g. Maybank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium opacity-60 block mb-1">Bank Account No.</label>
            <input className="input w-full" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium opacity-60 block mb-1">Address</label>
          <input className="input w-full" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium opacity-60 block mb-1">Notes</label>
          <textarea
            className="input w-full"
            rows={2}
            placeholder="e.g. payment terms, turnaround time"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 border border-terracotta/30 text-terracotta py-2.5 rounded font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-terracotta text-white py-2.5 rounded font-semibold disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Vendor"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
