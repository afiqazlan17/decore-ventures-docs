"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";

export default function SettingsPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleReset() {
    const sure = window.confirm(
      "Reset SEMUA data (jobs, customers, quotations, invoices, resit)? Tindakan ini tidak boleh undo. Ini untuk dev phase sahaja."
    );
    if (!sure) return;

    setBusy(true);
    setMessage("");
    try {
      await supabase.from("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("job_activity_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("doc_counters").delete().neq("doc_type", "");
      setMessage("Semua data telah direset.");
    } catch (err: any) {
      setMessage("Error: " + (err.message || "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold uppercase text-red-600 mb-2">Danger Zone (Dev Phase)</h2>
        <p className="text-sm opacity-70 mb-4">
          Reset akan padam semua customers, jobs, quotations, invoices, dan resit dari database. Nombor dokumen (QD/ID/RD/JOB/CUST) akan mula semula dari 0001.
        </p>
        <button
          onClick={handleReset}
          disabled={busy}
          className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Resetting..." : "Reset All Data"}
        </button>
        {message && <p className="text-sm mt-3">{message}</p>}
      </div>
    </div>
  );
}
