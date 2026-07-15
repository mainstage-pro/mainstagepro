"use client";

import { createContext, useContext } from "react";

export interface AccessValue {
  role: string;
  area: string | null;
  moduleKeys: string[] | null; // null = admin (acceso total)
}

const AccessContext = createContext<AccessValue>({ role: "USER", area: null, moduleKeys: [] });

export function AccessProvider({ value, children }: { value: AccessValue; children: React.ReactNode }) {
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const v = useContext(AccessContext);
  const isAdmin = v.role === "ADMIN";
  function canAccess(key?: string, adminOnly?: boolean): boolean {
    if (adminOnly) return isAdmin;
    if (!key) return true;
    if (isAdmin || v.moduleKeys === null) return true;
    return v.moduleKeys.includes(key);
  }
  return { role: v.role, area: v.area, moduleKeys: v.moduleKeys, isAdmin, canAccess };
}
