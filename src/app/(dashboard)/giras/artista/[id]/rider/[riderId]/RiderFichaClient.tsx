"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { DISCIPLINA_LABEL } from "@/lib/giras";

export interface RiderFicha {
  id: string;
  nombre: string;
  version: number;
  esActivo: boolean;
  formacion: string | null;
  requerimientosGenerales: string | null;
  notasFoh: string | null;
  notasMonitoreo: string | null;
  notasBackline: string | null;
  notasIluminacion: string | null;
  notasVideo: string | null;
  notasEnergia: string | null;
  notasEscenario: string | null;
  notasHospitalidad: string | null;
  notasCrewRequerido: string | null;
  escenarioAnchoM: number | null;
  escenarioProfundoM: number | null;
  escenarioAlturaM: number | null;
  stagePlotUrl: string | null;
  canalesMinimos: number | null;
  mixesMonitor: number | null;
  tiempoSoundcheckMin: number | null;
  tiempoCambioMin: number | null;
}

interface Props {
  artistaId: string;
  rider: RiderFicha;
}

/// Cada bloque de notas es el texto que negocia una disciplina con la casa.
const NOTAS: { campo: keyof RiderFicha; titulo: string; ayuda: string }[] = [
  { campo: "notasFoh", titulo: DISCIPLINA_LABEL.AUDIO + " — FOH", ayuda: "Consola, procesamiento, posición de la cabina, quién mezcla." },
  { campo: "notasMonitoreo", titulo: "Monitoreo", ayuda: "In-ears, wedges, quién mezcla monitores, mixes por persona." },
  { campo: "notasBackline", titulo: DISCIPLINA_LABEL.BACKLINE, ayuda: "Lo que el artista trae y lo que espera encontrar en el venue." },
  { campo: "notasIluminacion", titulo: DISCIPLINA_LABEL.ILUMINACION, ayuda: "Consola, intención de diseño, lo que no se negocia." },
  { campo: "notasVideo", titulo: DISCIPLINA_LABEL.VIDEO, ayuda: "Pantallas, contenido, resolución, quién opera." },
  { campo: "notasEnergia", titulo: DISCIPLINA_LABEL.ENERGIA, ayuda: "Alimentación, tierras, planta de respaldo." },
  { campo: "notasEscenario", titulo: DISCIPLINA_LABEL.ESCENARIO, ayuda: "Risers, acomodo, techo, accesos." },
  { campo: "notasCrewRequerido", titulo: "Crew que se requiere", ayuda: "Cuánta gente local y con qué perfil." },
  { campo: "notasHospitalidad", titulo: "Hospitalidad", ayuda: "Camerinos, alimentos, bebidas, toallas, lo que evita fricción." },
];

type Valores = Record<string, string>;

function aFormulario(r: RiderFicha): Valores {
  const v: Valores = {
    nombre: r.nombre,
    formacion: r.formacion ?? "",
    requerimientosGenerales: r.requerimientosGenerales ?? "",
    stagePlotUrl: r.stagePlotUrl ?? "",
    escenarioAnchoM: r.escenarioAnchoM === null ? "" : String(r.escenarioAnchoM),
    escenarioProfundoM: r.escenarioProfundoM === null ? "" : String(r.escenarioProfundoM),
    escenarioAlturaM: r.escenarioAlturaM === null ? "" : String(r.escenarioAlturaM),
    canalesMinimos: r.canalesMinimos === null ? "" : String(r.canalesMinimos),
    mixesMonitor: r.mixesMonitor === null ? "" : String(r.mixesMonitor),
    tiempoSoundcheckMin: r.tiempoSoundcheckMin === null ? "" : String(r.tiempoSoundcheckMin),
    tiempoCambioMin: r.tiempoCambioMin === null ? "" : String(r.tiempoCambioMin),
  };
  for (const n of NOTAS) v[n.campo as string] = (r[n.campo] as string | null) ?? "";
  return v;
}

export default function RiderFichaClient({ artistaId, rider }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState<Valores>(aFormulario(rider));
  const [original, setOriginal] = useState<Valores>(aFormulario(rider));
  const [guardando, setGuardando] = useState(false);

  const sucio = JSON.stringify(form) !== JSON.stringify(original);

  function set(campo: string, valor: string) {
    setForm((p) => ({ ...p, [campo]: valor }));
  }

  async function guardar(extra: Record<string, unknown> = {}) {
    if (!form.nombre.trim()) {
      toast.error("La versión necesita nombre.");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/artista-riders/${rider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, nombre: form.nombre.trim(), ...extra }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar.");
        return;
      }
      setOriginal(form);
      toast.success("Rider guardado");
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="ms-page space-y-4">
      <section className="ms-card p-4 space-y-4">
        <p className="ms-section-label">Cabecera de la versión</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="ms-label block mb-1.5">Nombre de la versión</label>
            <input className="ms-input w-full" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </div>
          <div>
            <label className="ms-label block mb-1.5">Formación</label>
            <input
              className="ms-input w-full"
              placeholder="ej. 5 piezas + tracks"
              value={form.formacion}
              onChange={(e) => set("formacion", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="ms-label block mb-1.5">Requerimientos generales</label>
          <textarea
            className="ms-textarea w-full"
            rows={3}
            placeholder="El párrafo de apertura del rider: lo que aplica a todas las disciplinas."
            value={form.requerimientosGenerales}
            onChange={(e) => set("requerimientosGenerales", e.target.value)}
          />
        </div>
      </section>

      <section className="ms-card p-4 space-y-4">
        <p className="ms-section-label">Números que condicionan el show</p>
        <p className="ms-micro">
          Son los que descalifican un foro antes de ver el detalle: si no caben los canales ni el escenario, no hay
          show.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Numero label="Canales mínimos" valor={form.canalesMinimos} onChange={(v) => set("canalesMinimos", v)} />
          <Numero label="Mixes de monitor" valor={form.mixesMonitor} onChange={(v) => set("mixesMonitor", v)} />
          <Numero
            label="Soundcheck (min)"
            valor={form.tiempoSoundcheckMin}
            onChange={(v) => set("tiempoSoundcheckMin", v)}
          />
          <Numero label="Cambio (min)" valor={form.tiempoCambioMin} onChange={(v) => set("tiempoCambioMin", v)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Numero
            label="Escenario ancho (m)"
            valor={form.escenarioAnchoM}
            paso="0.1"
            onChange={(v) => set("escenarioAnchoM", v)}
          />
          <Numero
            label="Escenario profundo (m)"
            valor={form.escenarioProfundoM}
            paso="0.1"
            onChange={(v) => set("escenarioProfundoM", v)}
          />
          <Numero
            label="Altura libre (m)"
            valor={form.escenarioAlturaM}
            paso="0.1"
            onChange={(v) => set("escenarioAlturaM", v)}
          />
          <div>
            <label className="ms-label block mb-1.5">Stage plot (URL)</label>
            <input
              className="ms-input w-full"
              placeholder="https://…"
              value={form.stagePlotUrl}
              onChange={(e) => set("stagePlotUrl", e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {NOTAS.map((n) => (
          <section key={n.campo as string} className="ms-card p-4 space-y-2">
            <p className="ms-section-label">{n.titulo}</p>
            <p className="ms-micro">{n.ayuda}</p>
            <textarea
              className="ms-textarea w-full"
              rows={4}
              value={form[n.campo as string] ?? ""}
              onChange={(e) => set(n.campo as string, e.target.value)}
            />
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => void guardar()}
          disabled={guardando || !sucio}
          className="ms-btn-primary disabled:opacity-40"
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
        {sucio && (
          <button onClick={() => setForm(original)} className="ms-btn-ghost">
            Descartar
          </button>
        )}
        {!rider.esActivo && (
          <button onClick={() => void guardar({ esActivo: true })} disabled={guardando} className="ms-btn-secondary">
            Hacer vigente esta versión
          </button>
        )}
        {!sucio && <span className="ms-micro">Sin cambios por guardar.</span>}
        <span className="ms-micro ml-auto">
          Artista:{" "}
          <Link href={`/giras/artista/${artistaId}`} className="ms-link-gold">
            volver a la ficha
          </Link>
        </span>
      </div>
    </div>
  );
}

function Numero({
  label,
  valor,
  paso,
  onChange,
}: {
  label: string;
  valor: string;
  paso?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="ms-label block mb-1.5">{label}</label>
      <input
        type="number"
        min={0}
        step={paso ?? "1"}
        className="ms-input w-full"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
