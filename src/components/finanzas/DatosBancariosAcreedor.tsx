"use client";

import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { textoParaCompartir, type DatosBancarios } from "@/lib/datos-bancarios";

// Bloque de "a dónde le deposito". Va pegado a donde se decide el pago: la
// cartera del ciclo, la nómina del técnico, el renglón de la CxP y el modal que
// registra la salida de dinero.

const CAMPOS: { key: keyof DatosBancarios; label: string; mono: boolean }[] = [
  { key: "banco", label: "Banco", mono: false },
  { key: "titular", label: "Titular", mono: false },
  { key: "clabe", label: "CLABE", mono: true },
  { key: "cuenta", label: "Cuenta", mono: true },
  { key: "tarjeta", label: "Tarjeta", mono: true },
  { key: "rfc", label: "RFC", mono: true },
];

export default function DatosBancariosAcreedor({
  datos,
  nombre,
  fichaHref,
  className = "",
}: {
  datos: DatosBancarios | null;
  nombre?: string | null;
  fichaHref?: string | null;
  className?: string;
}) {
  if (!datos) {
    return (
      <div className={`flex items-center gap-2 text-[11px] text-gray-600 ${className}`}>
        <span>Sin datos bancarios</span>
        {fichaHref && (
          <Link href={fichaHref} className="text-[#B3985B] hover:underline">
            capturarlos
          </Link>
        )}
      </div>
    );
  }

  const presentes = CAMPOS.filter((c) => datos[c.key]);

  return (
    <div className={`bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg px-2.5 py-2 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-gray-600">Para depositar</span>
        <div className="flex items-center gap-2">
          <CopyButton value={textoParaCompartir(datos, nombre)} size="xs" />
          {fichaHref && (
            <Link href={fichaHref} className="text-[10px] text-gray-600 hover:text-[#B3985B]">
              editar
            </Link>
          )}
        </div>
      </div>
      <div className="space-y-0.5">
        {presentes.map((c) => (
          <div key={c.key} className="flex items-center gap-2">
            <span className="text-[11px] text-gray-600 w-14 shrink-0">{c.label}</span>
            <span className={`text-[11px] text-gray-300 truncate ${c.mono ? "font-mono" : ""}`}>
              {datos[c.key]}
            </span>
            <CopyButton value={datos[c.key]!} size="xs" className="shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
