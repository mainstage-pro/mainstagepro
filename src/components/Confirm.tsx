"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmResolve = (value: boolean) => void;

interface ConfirmState extends ConfirmOptions {
  resolve: ConfirmResolve;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<ConfirmResolve | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const options: ConfirmOptions = typeof opts === "string" ? { message: opts, danger: true } : opts;
    return new Promise<boolean>(resolve => {
      resolveRef.current = resolve;
      setState({ ...options, resolve });
    });
  }, []);

  function handleChoice(value: boolean) {
    setState(null);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) handleChoice(false); }}
        >
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            {state.title && (
              <h3 className="text-white font-semibold text-base">{state.title}</h3>
            )}
            <p className="text-gray-300 text-sm leading-relaxed">{state.message}</p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => handleChoice(false)}
                className="flex-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                {state.cancelText ?? "Cancelar"}
              </button>
              <button
                onClick={() => handleChoice(true)}
                className={`flex-1 text-sm font-semibold py-2.5 rounded-xl transition-colors ${
                  state.danger
                    ? "bg-red-700 hover:bg-red-600 text-white"
                    : "bg-[#B3985B] hover:bg-[#c9a96a] text-black"
                }`}
              >
                {state.confirmText ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx.confirm;
}
