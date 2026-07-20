"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type RowAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  icon?: React.ReactNode;
  variant?: "default" | "danger" | "gold";
  disabled?: boolean;
  title?: string;
};

/**
 * Fila de acciones estandarizada: una acción primaria opcional + un menú "⋯"
 * que agrupa el resto. Resuelve la sobrecarga de botones inline.
 */
export default function RowActions({
  primary,
  actions,
  align = "end",
}: {
  primary?: RowAction;
  actions: (RowAction | false | null | undefined)[];
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const items = actions.filter(Boolean) as RowAction[];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`flex items-center gap-2 ${align === "end" ? "justify-end" : ""}`}>
      {primary && (
        <button
          onClick={primary.onClick}
          disabled={primary.disabled}
          title={primary.title}
          className="flex items-center gap-1.5 text-xs font-medium text-black bg-[#B3985B] hover:bg-[#c9a96a] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {primary.icon}
          {primary.label}
        </button>
      )}

      {items.length > 0 && (
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(v => !v)}
            aria-label="Más acciones"
            className={`ms-btn-icon ${open ? "text-white border-[#444]" : ""}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>

          {open && (
            <div className={`ms-dropdown top-full mt-1 min-w-[180px] ${align === "end" ? "right-0" : "left-0"}`}>
              {items.map((a, i) => {
                const cls = `ms-dropdown-item ${
                  a.variant === "danger"
                    ? "!text-red-400 hover:!bg-red-900/20"
                    : a.variant === "gold"
                    ? "!text-[#B3985B]"
                    : ""
                } ${a.disabled ? "opacity-40 pointer-events-none" : ""}`;
                const content = (
                  <>
                    {a.icon && <span className="shrink-0 w-3.5 h-3.5 flex items-center justify-center">{a.icon}</span>}
                    <span className="truncate">{a.label}</span>
                  </>
                );
                const close = () => setOpen(false);
                const execute = (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (a.onClick) {
                    a.onClick();
                  } else if (a.href) {
                    if (a.external) {
                      window.open(a.href, "_blank");
                    } else {
                      router.push(a.href);
                    }
                  }
                  close();
                };

                if (a.href) {
                  return a.external ? (
                    <a key={i} href={a.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={execute} onMouseDown={execute} title={a.title}>
                      {content}
                    </a>
                  ) : (
                    <Link key={i} href={a.href} className={cls} onClick={execute} onMouseDown={execute} title={a.title}>
                      {content}
                    </Link>
                  );
                }
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={execute}
                    onMouseDown={execute}
                    disabled={a.disabled}
                    title={a.title}
                    className={cls}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
