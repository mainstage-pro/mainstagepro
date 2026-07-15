"use client";

import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/Confirm";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { AccessProvider, type AccessValue } from "@/components/AccessProvider";

export function Providers({ children, access }: { children: React.ReactNode; access?: AccessValue }) {
  return (
    <AccessProvider value={access ?? { role: "USER", area: null, moduleKeys: [] }}>
      <ToastProvider>
        <ConfirmProvider>
          {children}
          <KeyboardShortcuts />
        </ConfirmProvider>
      </ToastProvider>
    </AccessProvider>
  );
}
