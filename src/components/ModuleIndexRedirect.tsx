"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccess } from "@/components/AccessProvider";
import { useNavConfig } from "@/components/nav/NavConfigProvider";
import { applyOrder, type ModuleNavTab } from "@/components/ModuleTabsLayout";

export default function ModuleIndexRedirect({ tabs }: { tabs: ModuleNavTab[] }) {
  const router = useRouter();
  const { canAccess } = useAccess();
  const { tabsOrder } = useNavConfig();

  useEffect(() => {
    const visible = tabs.filter((t) => canAccess(t.accessKey, t.adminOnly));
    if (visible.length === 0) return;
    const scope = visible[0].href.split("/").filter(Boolean)[0] ?? "tabs";
    const first = applyOrder(visible, tabsOrder[scope])[0];
    if (first) router.replace(first.href);
  }, [router, canAccess, tabs, tabsOrder]);

  return null;
}
