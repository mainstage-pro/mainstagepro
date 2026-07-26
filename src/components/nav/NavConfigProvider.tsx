"use client";

import { createContext, useContext, useState } from "react";
import { useAccess } from "@/components/AccessProvider";

type LabelMap = Record<string, string>;
type OrderMap = Record<string, string[]>;

interface NavConfigValue {
  labels: LabelMap;
  order: OrderMap;
  tabsOrder: OrderMap;
  isAdmin: boolean;
  saveLabel: (key: string, label: string) => void;
  saveOrder: (sectionKey: string, ids: string[]) => void;
  saveTabsOrder: (scope: string, hrefs: string[]) => void;
}

const Ctx = createContext<NavConfigValue | null>(null);

async function patchConfig(key: string, value: unknown) {
  try {
    await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: JSON.stringify(value) }),
    });
  } catch {
    // Silencioso: la UI ya actualizó optimistamente.
  }
}

export function NavConfigProvider({
  initialLabels,
  initialOrder,
  initialTabsOrder,
  children,
}: {
  initialLabels?: LabelMap;
  initialOrder?: OrderMap;
  initialTabsOrder?: OrderMap;
  children: React.ReactNode;
}) {
  const { isAdmin } = useAccess();
  const [labels, setLabels] = useState<LabelMap>(initialLabels ?? {});
  const [order, setOrder] = useState<OrderMap>(initialOrder ?? {});
  const [tabsOrder, setTabsOrder] = useState<OrderMap>(initialTabsOrder ?? {});

  function saveLabel(key: string, label: string) {
    const t = label.trim();
    const next = { ...labels };
    if (t) next[key] = t;
    else delete next[key];
    setLabels(next);
    void patchConfig("nav.labels", next);
  }

  function saveOrder(sectionKey: string, ids: string[]) {
    const next = { ...order, [sectionKey]: ids };
    setOrder(next);
    void patchConfig("nav.order", next);
  }

  function saveTabsOrder(scope: string, hrefs: string[]) {
    const next = { ...tabsOrder, [scope]: hrefs };
    setTabsOrder(next);
    void patchConfig("nav.tabsOrder", next);
  }

  return (
    <Ctx.Provider value={{ labels, order, tabsOrder, isAdmin, saveLabel, saveOrder, saveTabsOrder }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNavConfig(): NavConfigValue {
  const v = useContext(Ctx);
  if (!v) {
    // Fallback inerte para árboles fuera del provider (no debería ocurrir en el dashboard).
    return {
      labels: {},
      order: {},
      tabsOrder: {},
      isAdmin: false,
      saveLabel: () => {},
      saveOrder: () => {},
      saveTabsOrder: () => {},
    };
  }
  return v;
}
