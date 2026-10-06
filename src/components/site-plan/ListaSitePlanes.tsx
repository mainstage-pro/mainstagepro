"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Map, Plus, Trash2 } from "lucide-react";

export type FilaPlan = {
  id: string;
  nombre: string;
  fondoUrl: string | null;
  escalaMPorPx: number | null;
  objetos: number;
  actualizado: string;
};

export type Plantilla = { id: string; nombre: string; venue: string };

/**
 * Los planos de un predio. Cuelgan de una fecha de gira o de un proyecto de
 * eventos —un festival en un predio necesita exactamente el mismo plano—, así que
 * la procedencia entra como dato y la pantalla es una sola.
 *
 * Las plantillas son los planos del venue sin dueño: se copian para no volver a
 * trazar el predio cada vez que se toca el mismo lugar.
 */
export default function ListaSitePlanes({
  showId,
  proyectoId,
  base,
  planes,
  plantillas,
}: {
  showId?: string;
  proyectoId?: string;
  base: string;
  planes: FilaPlan[];
  plantillas: Plantilla[];
}) {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");

  const duenio = showId ? "este show" : "este proyecto";

  async function crear(copiarDe?: string) {
    if (creando) return;
    setCreando(true);
    try {
      const res = await fetch("/api/site-planes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showId,
          proyectoId,
          nombre: nombre.trim() || (copiarDe ? "Copia del plano del venue" : "Site plan"),
          copiarDe,
        }),
      });
      if (!res.ok) throw new Error();
      const plan = await res.json();
      router.push(`${base}/${plan.id}`);
    } catch {
      setCreando(false);
      alert("No se pudo crear el plano");
    }
  }

  async function borrar(id: string, nombrePlan: string) {
    if (!confirm(`¿Quitar "${nombrePlan}"?`)) return;
    const res = await fetch(`/api/site-planes/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("No se pudo quitar");
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ms-h2">Site plan</h2>
          <p className="ms-subtitle mt-0.5">
            El plano del predio: zonas, accesos y puntos de servicio trazados sobre la foto aérea o el plano del venue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Nombre del plano"
            className="ms-input w-48"
          />
          <button type="button" onClick={() => crear()} disabled={creando} className="ms-btn-primary">
            <Plus size={14} /> Nuevo plano
          </button>
        </div>
      </div>

      {plantillas.length > 0 ? (
        <div className="ms-card-deep p-3">
          <p className="ms-section-label mb-2">Planos guardados de este venue</p>
          <div className="flex flex-col gap-1.5">
            {plantillas.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <Map size={13} className="text-[#555] shrink-0" />
                <span className="flex-1 min-w-0 truncate text-[12px] text-[#ddd]">{p.nombre}</span>
                <span className="ms-micro text-[#555] shrink-0">{p.venue}</span>
                <button
                  type="button"
                  onClick={() => crear(p.id)}
                  disabled={creando}
                  className="ms-btn-ghost shrink-0"
                >
                  <Copy size={12} /> Usar
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {planes.length === 0 ? (
        <div className="ms-empty-state">
          <Map size={22} className="text-[#333] mb-2" />
          <p className="text-[13px] text-[#888]">Todavía no hay plano para {duenio}.</p>
          <p className="ms-micro text-[#555] mt-1">
            Crea uno, sube la vista aérea de Google Maps o el plano del venue y traza encima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {planes.map(p => (
            <div key={p.id} className="ms-card-hover overflow-hidden flex flex-col">
              <a href={`${base}/${p.id}`} className="block aspect-video bg-[#0b0b0b] overflow-hidden">
                {p.fondoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.fondoUrl} alt="" className="w-full h-full object-cover opacity-80" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center">
                    <Map size={20} className="text-[#2a2a2a]" />
                  </span>
                )}
              </a>
              <div className="p-3 flex items-start gap-2">
                <a href={`${base}/${p.id}`} className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#eee] truncate">{p.nombre}</p>
                  <p className="ms-micro text-[#666] mt-0.5">
                    {p.objetos} {p.objetos === 1 ? "elemento" : "elementos"}
                    {p.escalaMPorPx ? " · con escala" : " · sin escala"} · {p.actualizado}
                  </p>
                </a>
                <button
                  type="button"
                  onClick={() => borrar(p.id, p.nombre)}
                  className="ms-btn-icon text-[#555] hover:text-[#d9444f] shrink-0"
                  title="Quitar"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
