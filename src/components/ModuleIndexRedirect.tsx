"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccess } from "@/components/AccessProvider";
import type { ModuleNavTab } from "@/components/ModuleTabsLayout";

export default function ModuleIndexRedirect({ tabs }: { tabs: ModuleNavTab[] }) {
  const router = useRouter();
  const { canAccess } = useAccess();

  useEffect(() => {
    const first = tabs.find((t) => canAccess(t.accessKey, t.adminOnly));
    if (first) router.replace(first.href);
  }, [router, canAccess, tabs]);

  return null;
}
