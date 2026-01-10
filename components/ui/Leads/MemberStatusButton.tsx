"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MemberStatusButton({
  memberId,
  isActive,
}: {
  memberId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    try {
      setLoading(true);

      const res = await fetch(`/api/lead/members/${memberId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Failed to update member status");
        return;
      }

      router.refresh(); // refresh server component data
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={toggle} disabled={loading}>
      {loading ? "..." : isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
