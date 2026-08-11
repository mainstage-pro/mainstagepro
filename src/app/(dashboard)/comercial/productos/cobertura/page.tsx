"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, CheckCircle2, AlertTriangle, ArrowRight, Check } from "lucide-react";

type ItemCobertura = { id: string; nombre: string; sub?: string; href: string };
type Cubeta = { clave: string; titulo: string; descripcion: string; items: ItemCobertura[] };
type Resp = { cubetas: Cubeta[]; totales: { equipos: number; productos: number; adicionales: number; nichos: number } };
type TipoEvento = { id: string; slug: string; nombre: string };

// Cubetas donde la solución (asignar tipo de evento) se puede resolver en línea,
// sin salir a otra página.
const INLINE_TIPO = new Set(["equipos-sin-tipo", "productos-sin-tipo"]);

export default function CoberturaPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [tipos, setTipos] = useState<TipoEvento[]>([]);
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [guardando, setGuardando] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const [r, rc] = await Promise.all([
          fetch("/api/inventario/cobertura"),
          fetch("/api/catalogo"),
        ]);
        if (r.ok) setData(await r.json());
        if (rc.ok) { const d = await rc.json(); setTipos(d.tipos || []); }
      } finally { setCargando(false); }
    })();
  }, []);

  function toggleTipo(itemId: string, token: string) {
    setSel(prev => {
      const cur = prev[itemId] || [];
      return { ...prev, [itemId]: cur.includes(token) ? cur.filter(t => t !== token) : [...cur, token] };
    });
  }

  async function asignar(clave: string, item: ItemCobertura) {
    const tokens = sel[item.id] || [];
    if (!tokens.length) return;
    setGuardando(g => ({ ...g, [item.id]: true }));
    try {
      const url = clave === "equipos-sin-tipo" ? "/api/inventario/clasificacion" : `/api/productos/${item.id}`;
      const method = clave === "equipos-sin-tipo" ? "POST" : "PATCH";
      const body = clave === "equipos-sin-tipo"
        ? { equipoIds: [item.id], tiposEvento: tokens }
        : { tiposEvento: tokens };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      // Quitar el ítem de la cubeta y limpiar selección local.
      setData(d => d ? { ...d, cubetas: d.cubetas.map(c => c.clave === clave ? { ...c, items: c.items.filter(it => it.id !== item.id) } : c) } : d);
      setSel(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    } catch {
      // best-effort; si falla, el ítem permanece para reintentar
    } finally {
      setGuardando(g => { const n = { ...g }; delete n[item.id]; return n; });
    }
  }

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
            const inline = INLINE_TIPO.has(c.clave);
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
                    {c.items.map(it => inline && tipos.length ? (
                      <div key={it.id} className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-200 truncate">{it.nombre}</p>
                            {it.sub && <p className="text-[11px] text-gray-600 truncate">{it.sub}</p>}
                          </div>
                          <button
                            onClick={() => asignar(c.clave, it)}
                            disabled={!(sel[it.id]?.length) || guardando[it.id]}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border border-[#B3985B] text-[#B3985B] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#B3985B]/10"
                          >
                            <Check size={12} /> {guardando[it.id] ? "…" : "Asignar"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tipos.map(t => { const v = t.slug.toUpperCase(); const on = (sel[it.id] || []).includes(v); return (
                            <button
                              key={v}
                              onClick={() => toggleTipo(it.id, v)}
                              className={`px-2 py-0.5 rounded-md text-[11px] border ${on ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-400 hover:text-white"}`}
                            >{t.nombre}</button>
                          ); })}
                        </div>
                      </div>
                    ) : (
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
