"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Ban, CheckCircle } from "lucide-react";

export function SuspendButton({
  merchantId,
  isSuspended,
}: {
  merchantId: string;
  isSuspended: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setLoading(true);
    try {
      const action = isSuspended ? "unsuspend" : "suspend";
      const res = await fetch(`/api/admin/merchants/${merchantId}/${action}`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={isSuspended ? "default" : "destructive"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {isSuspended ? (
        <>
          <CheckCircle className="h-4 w-4 mr-1" />
          {loading ? "Unsuspending..." : "Unsuspend"}
        </>
      ) : (
        <>
          <Ban className="h-4 w-4 mr-1" />
          {loading ? "Suspending..." : "Suspend"}
        </>
      )}
    </Button>
  );
}
