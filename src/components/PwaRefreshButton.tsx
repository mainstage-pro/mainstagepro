"use client";

import { useEffect, useState } from "react";

export default function PwaRefreshButton() {
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    const check = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setIsPwa(check());
  }, []);

  if (!isPwa) return null;

  return (
    <button
      onClick={() => window.location.reload()}
      aria-label="Actualizar"
      className="fixed bottom-5 right-4 z-50 w-11 h-11 rounded-full bg-[#111] border border-[#2a2a2a] flex items-center justify-center text-[#B3985B] shadow-lg hover:bg-[#1a1a1a] hover:border-[#B3985B]/40 active:scale-90 transition-all duration-150"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M8 16H3v5"/>
      </svg>
    </button>
  );
}
