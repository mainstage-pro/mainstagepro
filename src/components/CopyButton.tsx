"use client";

import { useState } from "react";

interface Props {
  value: string;
  className?: string;
  size?: "sm" | "xs";
}

export function CopyButton({ value, className = "", size = "sm" }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const dim = size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <button
      onClick={copy}
      title={copied ? "Copiado" : `Copiar ${value}`}
      className={`inline-flex items-center justify-center transition-colors ${className}`}
      aria-label="Copiar"
    >
      {copied ? (
        <svg className={`${dim} text-green-400`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className={`${dim} text-gray-500 hover:text-gray-300`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" /><path strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}
