"use client";

import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/Confirm";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </ToastProvider>
  );
}
