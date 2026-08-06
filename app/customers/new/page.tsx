"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewCustomerPage() {
  const router = useRouter();
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

      router.push("/customers");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-terracotta mb-6">Add Customer</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border border-terracotta/15 shadow-sm max-w-lg">
        <input className="input w-full" placeholder="Customer name *" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input w-full" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
        <input className="input w-full" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="input w-full" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input w-full" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-terracotta text-white py-3 rounded font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Customer"}
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
