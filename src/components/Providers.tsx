"use client";

import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/Confirm";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { AccessProvider, type AccessValue } from "@/components/AccessProvider";
import { AreasProvider } from "@/components/AreasProvider";

export function Providers({ children, access }: { children: React.ReactNode; access?: AccessValue }) {
  return (
    <AccessProvider value={access ?? { role: "USER", area: null, moduleKeys: [] }}>
      <AreasProvider>
        <ToastProvider>
          <ConfirmProvider>
            {children}
            <KeyboardShortcuts />
          </ConfirmProvider>
        </ToastProvider>
      </AreasProvider>
    </AccessProvider>
  );
}
