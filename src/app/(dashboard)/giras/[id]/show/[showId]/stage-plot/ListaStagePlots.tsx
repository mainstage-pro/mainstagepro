"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

export type FilaPlot = {
  id: string;
  nombre: string;
  anchoM: number | null;
  largoM: number | null;
  alturaM: number | null;
  notas: string | null;
  piezas: number;
  actualizado: string;
};

type Borrador = { nombre: string; anchoM: string; largoM: string; alturaM: string; notas: string };

function aBorrador(p: FilaPlot): Borrador {
  return {
    nombre: p.nombre,
    anchoM: p.anchoM != null ? String(p.anchoM) : "",
    largoM: p.largoM != null ? String(p.largoM) : "",
    alturaM: p.alturaM != null ? String(p.alturaM) : "",
    notas: p.notas ?? "",
  };
}

/**
 * Los stage plots de esta fecha. Son del show y no de la gira porque cada venue
 * monta distinto: las medidas que valen son las de la plaza, no las del tour.
 * Una fecha puede llevar más de uno (principal y cambio rápido, por ejemplo).
 */
export default function ListaStagePlots({
  showId,
  base,
  medidasVenue,
  plots,
}: {
  showId: string;
  base: string;
  /** Lo que el catálogo del venue dice del escenario, como referencia al capturar. */
  medidasVenue: string | null;
  plots: FilaPlot[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(irADibujar: boolean) {
    if (creando) return;
    setCreando(true);
    try {
      const r = await fetch(`/api/gira-shows/${showId}/stage-plots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim() || undefined }),
      });
      if (!r.ok) throw new Error();
      const { plot } = await r.json();
      setNombre("");
      if (irADibujar && plot?.id) router.push(`${base}/${plot.id}`);
      else router.refresh();
    } catch {
      toast.error("No se pudo crear el stage plot");
    } finally {
      setCreando(false);
    }
  }

  async function guardar(id: string) {
    if (!borrador) return;
    setGuardando(true);
    const r = await fetch(`/api/show-stage-plots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: borrador.nombre,
        anchoM: borrador.anchoM,
        largoM: borrador.largoM,
        alturaM: borrador.alturaM,
        notas: borrador.notas,
      }),
    });
    setGuardando(false);
    if (!r.ok) {
      toast.error("No se pudo guardar");
      return;
    }
    setAbierto(null);
    setBorrador(null);
    router.refresh();
  }

  async function borrar(p: FilaPlot) {
    const ok = await confirm({
      title: `¿Quitar «${p.nombre}»?`,
      message: "Se borra el plano de esta fecha. No toca el rider ni el advance.",
      confirmText: "Quitar",
      danger: true,
    });
    if (!ok) return;
    const r = await fetch(`/api/show-stage-plots/${p.id}`, { method: "DELETE" });
    if (r.ok) router.refresh();
    else toast.error("No se pudo quitar");
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ms-h2">Stage plot</h2>
          <p className="ms-subtitle mt-0.5">
            El plano del escenario de esta plaza, en metros y visto desde el público: dónde va cada
            músico, su monitor y su amplificador.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Nombre del plano"
            className="ms-input w-48"
          />
          <button type="button" onClick={() => crear(true)} disabled={creando} className="ms-btn-primary">
            <Plus size={14} /> Nuevo stage plot
          </button>
        </div>
      </div>

      {medidasVenue ? (
        <p className="ms-micro text-[#666]">
          El catálogo del venue dice del escenario: <span className="text-[#aaa]">{medidasVenue}</span>. Es
          referencia: lo que manda es lo que se mide en sitio.
        </p>
      ) : null}

      {plots.length === 0 ? (
        <div className="ms-empty-state">
          <LayoutGrid size={22} className="text-[#333] mb-2" />
          <p className="text-[13px] text-[#888]">Todavía no hay stage plot para esta fecha.</p>
          <p className="ms-micro text-[#555] mt-1">
            Crea uno, captura las medidas del escenario de la plaza y acomoda el backline encima.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {plots.map(p => {
            const editando = abierto === p.id;
            return (
              <div key={p.id} className="ms-card p-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Link href={`${base}/${p.id}`} className="min-w-0 flex-1 group">
                    <p className="text-[13px] text-[#eee] truncate group-hover:text-[#B3985B] transition-colors">
                      {p.nombre}
                    </p>
                    <p className="ms-micro text-[#666] mt-0.5">
                      {p.anchoM && p.largoM ? `${p.anchoM} × ${p.largoM} m` : "medidas por capturar"}
                      {p.alturaM ? ` · ${p.alturaM} m de alto` : ""}
                      {" · "}
                      {p.piezas} {p.piezas === 1 ? "pieza" : "piezas"} · {p.actualizado}
                    </p>
                  </Link>
                  <Link href={`${base}/${p.id}`} className="ms-btn-ghost shrink-0">
                    <LayoutGrid size={12} /> Dibujar
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setAbierto(editando ? null : p.id);
                      setBorrador(editando ? null : aBorrador(p));
                    }}
                    className="ms-btn-ghost shrink-0"
                  >
                    {editando ? "Cerrar" : "Medidas"}
                  </button>
                  <button
                    type="button"
                    onClick={() => borrar(p)}
                    className="ms-btn-icon text-[#555] hover:text-[#d9444f] shrink-0"
                    title="Quitar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {editando && borrador ? (
                  <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex flex-col gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="ms-label">Nombre</span>
                        <input
                          value={borrador.nombre}
                          onChange={e => setBorrador({ ...borrador, nombre: e.target.value })}
                          className="ms-input"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="ms-label">Ancho (m)</span>
                        <input
                          type="number" step="0.1" min="0"
                          value={borrador.anchoM}
                          onChange={e => setBorrador({ ...borrador, anchoM: e.target.value })}
                          className="ms-input"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="ms-label">Fondo (m)</span>
                        <input
                          type="number" step="0.1" min="0"
                          value={borrador.largoM}
                          onChange={e => setBorrador({ ...borrador, largoM: e.target.value })}
                          className="ms-input"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="ms-label">Alto (m)</span>
                        <input
                          type="number" step="0.1" min="0"
                          value={borrador.alturaM}
                          onChange={e => setBorrador({ ...borrador, alturaM: e.target.value })}
                          className="ms-input"
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1">
                      <span className="ms-label">Notas del escenario</span>
                      <textarea
                        value={borrador.notas}
                        onChange={e => setBorrador({ ...borrador, notas: e.target.value })}
                        rows={2}
                        placeholder="Accesos, altura de reja, limitaciones de la plaza…"
                        className="ms-input resize-y"
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => guardar(p.id)}
                        disabled={guardando}
                        className="ms-btn-primary"
                      >
                        {guardando ? "Guardando…" : "Guardar medidas"}
                      </button>
                      <span className="ms-micro text-[#555]">
                        Sin medidas el lienzo arranca en 12 × 8 m.
                      </span>
                    </div>
                  </div>
                ) : p.notas ? (
                  <p className="ms-micro text-[#666] mt-2 whitespace-pre-wrap">{p.notas}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
