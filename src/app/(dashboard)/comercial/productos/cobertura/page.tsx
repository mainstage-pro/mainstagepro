"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

type ItemCobertura = { id: string; nombre: string; sub?: string; href: string };
type Cubeta = { clave: string; titulo: string; descripcion: string; items: ItemCobertura[] };
type Resp = { cubetas: Cubeta[]; totales: { equipos: number; productos: number; adicionales: number; nichos: number } };

export default function CoberturaPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/inventario/cobertura");
        if (r.ok) setData(await r.json());
      } finally { setCargando(false); }
    })();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="ms-h1">Cobertura del catálogo</h1>
        <p className="ms-subtitle mt-0.5">Dónde faltan clasificar equipos, productos, adicionales y nichos para que las sugerencias funcionen. Los equipos no cotizables (cables/consumibles) no cuentan.</p>
      </div>

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : !data ? (
        <p className="text-sm text-red-400">No se pudo cargar la cobertura.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.cubetas.map(c => {
            const vacio = c.items.length === 0;
            const open = abierta === c.clave;
            return (
              <div key={c.clave} className={`rounded-xl border ${vacio ? "border-[#1c2b1c] bg-[#0c110c]" : "border-[#2b241c] bg-[#110e0c]"} overflow-hidden`}>
                <button
                  onClick={() => setAbierta(open ? null : c.clave)}
                  disabled={vacio}
                  className="w-full flex items-start gap-3 p-4 text-left disabled:cursor-default"
                >
                  <div className="mt-0.5 shrink-0">
                    {vacio ? <CheckCircle2 size={18} className="text-green-500" /> : <AlertTriangle size={18} className="text-[#B3985B]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{c.titulo}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{c.descripcion}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className={`text-lg font-semibold ${vacio ? "text-green-500" : "text-[#B3985B]"}`}>{c.items.length}</span>
                    {!vacio && <ChevronRight size={16} className={`text-gray-600 transition-transform ${open ? "rotate-90" : ""}`} />}
                  </div>
                </button>
                {open && !vacio && (
                  <div className="border-t border-[#221c14] max-h-72 overflow-auto divide-y divide-[#161310]">
                    {c.items.map(it => (
                      <Link key={it.id} href={it.href} className="flex items-center gap-2 px-4 py-2 hover:bg-[#1a150e] group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 truncate">{it.nombre}</p>
                          {it.sub && <p className="text-[11px] text-gray-600 truncate">{it.sub}</p>}
                        </div>
                        <ArrowRight size={14} className="text-gray-700 group-hover:text-[#B3985B] shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
