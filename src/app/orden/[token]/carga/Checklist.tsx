"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { agruparPorCategoria, avanceCarga, ESTADO_ITEM_LABEL, PASE_DESCRIPCION, PASE_LABEL, type TipoPase } from "@/lib/control-carga";
import { SEVERIDADES_FALLA, SEVERIDAD_FALLA_LABEL } from "@/lib/falla-equipo";
import { Barra, Cargando, Chip, Miniatura } from "../ui";
import type { Verificador } from "./Identificacion";

type Item = {
  id: string;
  descripcion: string;
  categoria: string | null;
  esAccesorio: boolean;
  equipoId: string | null;
  imagenUrl: string | null;
  cantidadEsperada: number;
  cantidadVerificada: number;
  estado: string;
  nota: string | null;
  marcadoPor: string | null;
  marcadoEn: string | null;
  orden: number;
};

type Carga = {
  id: string;
  tipo: string;
  etiqueta: string | null;
  estado: string;
  cerradaEn: string | null;
  notaCierre: string | null;
  abiertoPor: string | null;
  cerradaPor: string | null;
  items: Item[];
};

type Marca = { estado: string; cantidadVerificada?: number; nota?: string | null; severidad?: string };

const COLA = (cargaId: string) => `orden-cola:${cargaId}`;

export default function Checklist({
  token,
  cargaId,
  verificador,
  onCerrada,
}: {
  token: string;
  cargaId: string;
  verificador: Verificador;
  onCerrada: () => void;
}) {
  const [carga, setCarga] = useState<Carga | null>(null);
  const [cargando, setCargando] = useState(true);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [detalle, setDetalle] = useState<Item | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [notaCierre, setNotaCierre] = useState("");
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<Record<string, Marca>>({});
  const reintentando = useRef(false);

  // La cola sobrevive a recargas: en bodega el señal se cae y nadie quiere
  // volver a marcar 60 renglones porque el teléfono perdió red.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLA(cargaId));
      if (raw) setPendientes(JSON.parse(raw));
    } catch { /* sin almacenamiento: se opera en línea */ }
  }, [cargaId]);

  useEffect(() => {
    try {
      if (Object.keys(pendientes).length) localStorage.setItem(COLA(cargaId), JSON.stringify(pendientes));
      else localStorage.removeItem(COLA(cargaId));
    } catch { /* ídem */ }
  }, [pendientes, cargaId]);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/orden/${token}/carga/${cargaId}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setCarga(data.carga);
    } catch { /* se conserva lo que ya está en pantalla */ }
    finally { setCargando(false); }
  }, [token, cargaId]);

  useEffect(() => { void cargar(); }, [cargar]);

  const enviar = useCallback(
    async (itemId: string, marca: Marca): Promise<boolean> => {
      try {
        const res = await fetch(`/api/orden/${token}/carga/${cargaId}/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...marca, verificadorId: verificador.id }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [token, cargaId, verificador.id]
  );

  const vaciarCola = useCallback(async () => {
    if (reintentando.current) return;
    reintentando.current = true;
    try {
      const entradas = Object.entries(pendientes);
      for (const [itemId, marca] of entradas) {
        const ok = await enviar(itemId, marca);
        if (!ok) break;
        setPendientes((p) => {
          const { [itemId]: _quitado, ...resto } = p;
          void _quitado;
          return resto;
        });
      }
    } finally {
      reintentando.current = false;
    }
  }, [pendientes, enviar]);

  useEffect(() => {
    if (Object.keys(pendientes).length === 0) return;
    void vaciarCola();
    const alVolver = () => void vaciarCola();
    window.addEventListener("online", alVolver);
    const t = setInterval(alVolver, 15_000);
    return () => { window.removeEventListener("online", alVolver); clearInterval(t); };
  }, [pendientes, vaciarCola]);

  /** Se pinta primero y se manda después: en la camioneta el tacto debe responder. */
  async function marcar(item: Item, marca: Marca) {
    const cantidad =
      marca.cantidadVerificada ??
      (marca.estado === "FALTANTE" || marca.estado === "PENDIENTE" ? 0 : item.cantidadEsperada);

    setCarga((c) =>
      c
        ? {
            ...c,
            items: c.items.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    estado: marca.estado,
                    cantidadVerificada: cantidad,
                    nota: marca.nota ?? i.nota,
                    marcadoPor: marca.estado === "PENDIENTE" ? null : verificador.nombre,
                    marcadoEn: marca.estado === "PENDIENTE" ? null : new Date().toISOString(),
                  }
                : i
            ),
          }
        : c
    );

    const ok = await enviar(item.id, marca);
    if (!ok) setPendientes((p) => ({ ...p, [item.id]: marca }));
  }

  async function marcarGrupo(items: Item[]) {
    for (const it of items) {
      if (it.estado === "PENDIENTE") await marcar(it, { estado: "OK" });
    }
  }

  async function cerrar() {
    setErrorCierre(null);
    setCerrando(true);
    try {
      const res = await fetch(`/api/orden/${token}/carga/${cargaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificadorId: verificador.id, notaCierre }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorCierre(data.error ?? "No pudimos cerrar el pase"); return; }
      onCerrada();
      await cargar();
    } catch {
      setErrorCierre("Sin conexión. Conéctate para cerrar el pase.");
    } finally {
      setCerrando(false);
    }
  }

  const grupos = useMemo(() => (carga ? agruparPorCategoria(carga.items) : []), [carga]);
  const avance = useMemo(() => (carga ? avanceCarga(carga.items) : null), [carga]);

  if (cargando || !carga || !avance) return <Cargando />;

  const cerrada = carga.estado === "CERRADA";
  const sinRevisar = carga.items.filter((i) => i.estado === "PENDIENTE").length;
  const enCola = Object.keys(pendientes).length;

  return (
    <>
      {/* Resumen pegajoso: el avance es lo que se consulta a cada rato. */}
      <div className="sticky top-0 z-20 -mx-5 px-5 py-3 bg-white/95 backdrop-blur border-b border-[#e8e8e8] mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="text-[#0d0d0d] font-bold text-[14px] truncate">
              {PASE_LABEL[carga.tipo as TipoPase] ?? carga.tipo}
              {carga.etiqueta ? ` · ${carga.etiqueta}` : ""}
            </p>
            <p className="text-[#9a9a9a] text-[11px] tabular-nums">
              {avance.revisados}/{avance.total} revisados
              {avance.faltantes > 0 && ` · ${avance.faltantes} faltante(s)`}
              {avance.danados > 0 && ` · ${avance.danados} dañado(s)`}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {enCola > 0 && <Chip tono="ambar">{enCola} por enviar</Chip>}
            {cerrada && <Chip tono="verde">Cerrado</Chip>}
          </div>
        </div>
        <Barra pct={avance.pct} tono={cerrada ? "verde" : "oro"} />
      </div>

      {!cerrada && (
        <p className="text-[#5a5a5a] text-[12px] mb-4 leading-relaxed">
          {PASE_DESCRIPCION[carga.tipo as TipoPase]} Marcando como{" "}
          <span className="text-[#0d0d0d] font-bold">{verificador.nombre}</span>.
        </p>
      )}

      {grupos.map(({ categoria, items }) => {
        const listos = items.filter((i) => i.estado !== "PENDIENTE").length;
        const colapsado = abiertos[categoria] === false;
        return (
          <section key={categoria} className="mb-4">
            {/* Barra negra de categoría — igual que el rider impreso. */}
            <div className="flex items-center gap-2 bg-[#111] px-3 py-1.5">
              <button
                onClick={() => setAbiertos((a) => ({ ...a, [categoria]: colapsado }))}
                className="flex-1 min-w-0 flex items-center gap-2 text-left"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                     strokeLinecap="round" strokeLinejoin="round"
                     className={`shrink-0 text-white/40 transition-transform ${colapsado ? "" : "rotate-90"}`}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <span className="text-white text-[10px] font-bold uppercase tracking-[0.15em] truncate">{categoria}</span>
                <span className={`text-[10px] tabular-nums shrink-0 ${listos === items.length ? "text-[#7dd3a0]" : "text-white/40"}`}>
                  {listos}/{items.length}
                </span>
              </button>
              {!cerrada && listos < items.length && (
                <button
                  onClick={() => void marcarGrupo(items)}
                  className="shrink-0 px-2 py-0.5 border border-white/25 rounded text-white/70 text-[10px] font-bold"
                >
                  Marcar todo
                </button>
              )}
            </div>

            {!colapsado && (
              <div className="border border-t-0 border-[#e8e8e8] rounded-b-md divide-y divide-[#f0f0f0] overflow-hidden bg-white">
                {items.map((it) => (
                  <Renglon
                    key={it.id}
                    item={it}
                    cerrada={cerrada}
                    pendienteDeEnvio={!!pendientes[it.id]}
                    onToggle={() => marcar(it, { estado: it.estado === "OK" ? "PENDIENTE" : "OK" })}
                    onDetalle={() => setDetalle(it)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {cerrada ? (
        <div className="border border-[#e8e8e8] rounded-md p-4 mt-6 bg-[#f6f6f6]">
          <p className="text-[#0d0d0d] text-[13.5px] font-medium">
            Pase cerrado{carga.cerradaPor ? ` por ${carga.cerradaPor}` : ""}.
          </p>
          {carga.notaCierre && <p className="text-[#5a5a5a] text-[12px] mt-2 leading-relaxed">{carga.notaCierre}</p>}
        </div>
      ) : (
        <div className="border border-[#e8e8e8] rounded-md p-4 mt-6">
          <h3 className="text-[#0d0d0d] font-bold text-[14px] mb-1">Cerrar el pase</h3>
          <p className="text-[#5a5a5a] text-[12px] mb-4 leading-relaxed">
            {sinRevisar > 0
              ? `Quedan ${sinRevisar} renglón(es) sin revisar. Al cerrar se registran como faltantes, así que explica por qué.`
              : "Todo está revisado. Al cerrar queda el registro firmado."}
          </p>
          {sinRevisar > 0 && (
            <textarea
              value={notaCierre}
              onChange={(e) => setNotaCierre(e.target.value)}
              rows={3}
              placeholder="¿Por qué se cierra con renglones sin revisar?"
              className="w-full border border-[#e0e0e0] rounded-md px-3 py-2.5 text-[13.5px] outline-none focus:border-[#B3985B] mb-3 resize-none"
            />
          )}
          {errorCierre && <p className="text-[#b91c1c] text-[12px] mb-3">{errorCierre}</p>}
          <button
            onClick={() => void cerrar()}
            disabled={cerrando || enCola > 0}
            className="w-full py-3.5 bg-[#B3985B] text-[#0d0d0d] rounded-lg text-[14px] font-bold disabled:opacity-40"
          >
            {cerrando ? "Cerrando…" : enCola > 0 ? "Esperando marcas por enviar…" : "Cerrar pase"}
          </button>
        </div>
      )}

      {detalle && (
        <PanelDetalle
          item={carga.items.find((i) => i.id === detalle.id) ?? detalle}
          cerrada={cerrada}
          onCerrar={() => setDetalle(null)}
          onMarcar={async (m) => {
            await marcar(detalle, m);
            setDetalle(null);
          }}
        />
      )}
    </>
  );
}

const TONO_ESTADO: Record<string, string> = {
  OK: "bg-[#2d6e3e] border-[#2d6e3e]",
  FALTANTE: "bg-[#fef2f2] border-[#b91c1c]",
  DANADO: "bg-[#fffbeb] border-[#b45309]",
  PENDIENTE: "border-[#bbb]",
};

function Renglon({
  item,
  cerrada,
  pendienteDeEnvio,
  onToggle,
  onDetalle,
}: {
  item: Item;
  cerrada: boolean;
  pendienteDeEnvio: boolean;
  onToggle: () => void;
  onDetalle: () => void;
}) {
  const revisado = item.estado !== "PENDIENTE";
  const parcial = revisado && item.cantidadVerificada !== item.cantidadEsperada;

  return (
    /* El resaltado va en el renglón entero y no en cada botón: la fila se parte
       en tres zonas de toque y si cada una se prendiera sola parecería rota. */
    <div className={`flex items-stretch ${cerrada ? "" : "active:bg-[#f6f6f6]"}`}>
      {/* La casilla, con su propia zona ancha: es el toque de precisión. */}
      <button
        onClick={onToggle}
        disabled={cerrada}
        aria-label={`Marcar ${item.descripcion}`}
        className="shrink-0 flex items-center pl-3.5 pr-2.5"
      >
        <span className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center ${TONO_ESTADO[item.estado]}`}>
          {item.estado === "OK" && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
          {item.estado === "FALTANTE" && <span className="text-[#b91c1c] text-xs font-black leading-none">!</span>}
          {item.estado === "DANADO" && <span className="text-[#b45309] text-xs font-black leading-none">⚠</span>}
        </span>
      </button>

      {/* La foto abre la foto, no marca el renglón —por eso vive fuera del
          botón—. El accesorio no trae la suya pero reserva el hueco: si no,
          el hijo quedaría menos sangrado que su equipo y se leería al revés. */}
      <div className="shrink-0 flex items-center pr-3">
        {item.esAccesorio ? (
          <span aria-hidden className="block w-10" />
        ) : (
          <Miniatura url={item.imagenUrl} alt={item.descripcion} />
        )}
      </div>

      {/* El área grande marca completo: es el 90% de los toques. */}
      <button
        onClick={onToggle}
        disabled={cerrada}
        className="flex-1 min-w-0 flex items-center gap-3 py-3.5 pr-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className={`block text-[13.5px] leading-snug ${item.esAccesorio ? "text-[#5a5a5a]" : "text-[#0d0d0d] font-bold"} ${item.estado === "OK" ? "line-through decoration-[#c0c0c0]" : ""}`}>
            {item.esAccesorio && <span className="text-[#ddc98a] mr-1">└</span>}
            {item.descripcion}
          </span>
          {(revisado || item.nota) && (
            <span className="block text-[#9a9a9a] text-[11px] mt-0.5 truncate">
              {[
                item.estado !== "OK" ? ESTADO_ITEM_LABEL[item.estado] : null,
                parcial ? `${item.cantidadVerificada} de ${item.cantidadEsperada}` : null,
                item.nota,
                item.marcadoPor,
              ].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>

        <span className="shrink-0 flex items-center gap-1.5">
          {pendienteDeEnvio && <span className="w-1.5 h-1.5 rounded-full bg-[#b45309]" title="Pendiente de enviar" />}
          <span className="text-[#9A7A3F] text-[11px] font-bold tabular-nums">×{item.cantidadEsperada}</span>
        </span>
      </button>

      {!cerrada && (
        <button
          onClick={onDetalle}
          aria-label="Más opciones"
          className="shrink-0 w-11 flex items-center justify-center border-l border-[#f0f0f0] text-[#c0c0c0]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** Hoja inferior con los casos que no son "todo bien": faltante, dañado, parcial. */
function PanelDetalle({
  item,
  cerrada,
  onCerrar,
  onMarcar,
}: {
  item: Item;
  cerrada: boolean;
  onCerrar: () => void;
  onMarcar: (m: Marca) => Promise<void>;
}) {
  const [nota, setNota] = useState(item.nota ?? "");
  const [cantidad, setCantidad] = useState(item.cantidadVerificada);
  const [severidad, setSeveridad] = useState("MODERADA");
  const [guardando, setGuardando] = useState(false);

  async function aplicar(estado: string) {
    setGuardando(true);
    await onMarcar({
      estado,
      cantidadVerificada: estado === "FALTANTE" ? 0 : cantidad,
      nota: nota.trim() || null,
      severidad,
    });
    setGuardando(false);
  }

  const input = "w-full border border-[#e0e0e0] rounded-md px-3 py-2.5 text-[13.5px] outline-none focus:border-[#B3985B]";

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[88vh] overflow-y-auto">
        <div className="w-10 h-1 bg-[#e0e0e0] rounded-full mx-auto mb-4 sm:hidden" />

        {/* La foto también aquí: este panel es donde se decide "faltante" o
            "dañado", y conviene estar seguro de qué pieza se está juzgando. */}
        <div className="flex items-start gap-3 mb-5">
          {!item.esAccesorio && <Miniatura url={item.imagenUrl} alt={item.descripcion} />}
          <div className="min-w-0 flex-1">
            <p className="text-[#0d0d0d] font-bold text-[16px] leading-snug">{item.descripcion}</p>
            <p className="text-[#9a9a9a] text-[11.5px] mt-1">
              Se esperan {item.cantidadEsperada} · {item.categoria ?? "General"}
              {item.marcadoPor && ` · marcado por ${item.marcadoPor}`}
            </p>
          </div>
        </div>

        {item.cantidadEsperada > 1 && (
          <div className="mb-4">
            <p className="text-[#9a9a9a] text-[9.5px] font-bold uppercase tracking-[0.09em] mb-2">Cuántas hay</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCantidad((c) => Math.max(0, c - 1))}
                className="w-11 h-11 border border-[#d8d8d8] rounded-lg text-[#0d0d0d] text-lg font-bold"
              >
                −
              </button>
              <span className="flex-1 text-center text-[#0d0d0d] text-xl font-bold tabular-nums">
                {cantidad}
                <span className="text-[#9a9a9a] text-sm font-normal"> / {item.cantidadEsperada}</span>
              </span>
              <button
                onClick={() => setCantidad((c) => Math.min(item.cantidadEsperada, c + 1))}
                className="w-11 h-11 border border-[#d8d8d8] rounded-lg text-[#0d0d0d] text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>
        )}

        {item.equipoId && (
          <div className="mb-4">
            <p className="text-[#9a9a9a] text-[9.5px] font-bold uppercase tracking-[0.09em] mb-2">
              Si está dañado, ¿qué tan grave?
            </p>
            <div className="flex gap-2">
              {SEVERIDADES_FALLA.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeveridad(s)}
                  className={`flex-1 py-2.5 rounded-lg text-[12px] font-bold border transition-colors ${
                    severidad === s
                      ? "bg-[#fffbeb] border-[#b45309] text-[#b45309]"
                      : "bg-white border-[#e0e0e0] text-[#5a5a5a]"
                  }`}
                >
                  {SEVERIDAD_FALLA_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          placeholder="Nota (qué pasó, dónde quedó…)"
          className={`${input} resize-none mb-5`}
        />

        <div className="space-y-2">
          <button
            onClick={() => void aplicar("OK")}
            disabled={guardando || cerrada}
            className="w-full py-3.5 bg-[#2d6e3e] text-white rounded-lg text-[14px] font-bold disabled:opacity-40"
          >
            Completo
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => void aplicar("FALTANTE")}
              disabled={guardando || cerrada}
              className="flex-1 py-3.5 bg-[#fef2f2] border border-[#b91c1c] text-[#b91c1c] rounded-lg text-[14px] font-bold disabled:opacity-40"
            >
              Faltante
            </button>
            <button
              onClick={() => void aplicar("DANADO")}
              disabled={guardando || cerrada}
              className="flex-1 py-3.5 bg-[#fffbeb] border border-[#b45309] text-[#b45309] rounded-lg text-[14px] font-bold disabled:opacity-40"
            >
              Dañado
            </button>
          </div>
          {item.estado !== "PENDIENTE" && (
            <button
              onClick={() => void aplicar("PENDIENTE")}
              disabled={guardando || cerrada}
              className="w-full py-3 text-[#9a9a9a] text-[12px] font-bold disabled:opacity-40"
            >
              Quitar la marca
            </button>
          )}
        </div>

        {item.equipoId && (
          <p className="text-[#9a9a9a] text-[11px] mt-4 leading-relaxed">
            Marcar como dañado levanta automáticamente un reporte de falla del equipo.
          </p>
        )}
      </div>
    </div>
  );
}
