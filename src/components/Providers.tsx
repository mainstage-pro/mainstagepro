"use client";

import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/Confirm";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
        <KeyboardShortcuts />
      </ConfirmProvider>
    </ToastProvider>
  );
}
