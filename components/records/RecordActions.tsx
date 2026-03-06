"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RecordActions({
  recordId,
  module,
  status,
}: {
  recordId: string;
  module: "ekv" | "letter";
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const table = module === "ekv" ? "ekv_records" : "letter_records";

  async function handleAction(action: "approve" | "reject" | "retry" | "close" | "delete") {
    setLoading(action);
    const supabase = createClient();

    if (action === "delete") {
      if (!confirm("Delete this record?")) {
        setLoading(null);
        return;
      }
      await supabase.from(table).delete().eq("id", recordId);
    } else if (action === "approve") {
      await supabase.from(table).update({ status: "Approved", error_message: null }).eq("id", recordId);
    } else if (action === "reject") {
      await supabase.from(table).update({ status: "Rejected" }).eq("id", recordId);
    } else if (action === "retry") {
      await supabase.from(table).update({ status: "Pending", error_message: null }).eq("id", recordId);
    } else if (action === "close") {
      await supabase.from(table).update({ status: "Closed Lost" }).eq("id", recordId);
    }

    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-1">
      {status === "Pending" && (
        <>
          <button
            onClick={() => handleAction("approve")}
            disabled={!!loading}
            className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
          >
            {loading === "approve" ? "..." : "Approve"}
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={!!loading}
            className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
          >
            {loading === "reject" ? "..." : "Reject"}
          </button>
        </>
      )}
      {(status === "Error" || status === "Rejected") && (
        <button
          onClick={() => handleAction("retry")}
          disabled={!!loading}
          className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50"
        >
          {loading === "retry" ? "..." : "Retry"}
        </button>
      )}
      {status !== "Closed Lost" && status !== "Approved" && (
        <button
          onClick={() => handleAction("close")}
          disabled={!!loading}
          className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
        >
          {loading === "close" ? "..." : "Close"}
        </button>
      )}
      <button
        onClick={() => handleAction("delete")}
        disabled={!!loading}
        className="px-2 py-1 text-xs rounded bg-red-50 text-red-400 hover:bg-red-100 disabled:opacity-50"
      >
        {loading === "delete" ? "..." : "Delete"}
      </button>
    </div>
  );
}
