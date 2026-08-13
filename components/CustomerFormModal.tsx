"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Modal from "./Modal";

export default function CustomerFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Sila isi nama customer.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: codeData, error: codeErr } = await supabase.rpc("next_pretty_code", {
        p_doc_type: "customer",
        p_prefix: "DV",
      });
      if (codeErr) throw codeErr;

      const { error: insertErr } = await supabase.from("customers").insert({
        customer_code: codeData as string,
        name,
        company,
        phone,
        email,
        address,
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
    <Modal title="New Customer" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium opacity-60 block mb-1">Customer Name *</label>
          <input className="input w-full" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium opacity-60 block mb-1">Company</label>
          <input className="input w-full" placeholder="Optional" value={company} onChange={(e) => setCompany(e.target.value)} />
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
        <div>
          <label className="text-xs font-medium opacity-60 block mb-1">Address</label>
          <input className="input w-full" value={address} onChange={(e) => setAddress(e.target.value)} />
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
            {submitting ? "Saving..." : "Save Customer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
