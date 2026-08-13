"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, VendorCategory, VENDOR_CATEGORY_LABEL } from "@/lib/supabase";

export default function NewVendorPage() {
  const router = useRouter();
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

      router.push("/vendors");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-terracotta mb-6">Add Vendor</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border border-terracotta/15 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input className="input" placeholder="Vendor / contact name *" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as VendorCategory)}>
            {Object.entries(VENDOR_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input className="input" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Bank name (e.g. Maybank)" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          <input className="input" placeholder="Bank account no." value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
        </div>
        <input className="input w-full" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <textarea
          className="input w-full"
          rows={3}
          placeholder="Notes (e.g. payment terms, turnaround time)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-terracotta text-white py-3 rounded font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Vendor"}
        </button>
      </form>

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
