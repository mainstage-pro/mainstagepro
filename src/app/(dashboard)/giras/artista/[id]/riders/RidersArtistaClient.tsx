"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  PLANTILLA_INPUT_BANDA,
  PLANTILLA_OUTPUT_BANDA,
  numerarSalidas,
  PLANTILLA_RIDER_BANDA,
  TIPO_FORMACION_LABEL,
  fmtFechaCorta,
} from "@/lib/giras";

export interface RiderFila {
  id: string;
  nombre: string;
  version: number;
  esActivo: boolean;
  formacion: string | null;
  canalesMinimos: number | null;
  mixesMonitor: number | null;
  actualizado: string;
  canales: number;
  lineas: number;
  giras: number;
}

interface Props {
  artistaId: string;
  artistaNombre: string;
  tipoFormacion: string | null;
  ridersIniciales: RiderFila[];
}

type Arranque = "VACIO" | "PLANTILLA" | "CLON";

export default function RidersArtistaClient({ artistaId, artistaNombre, tipoFormacion, ridersIniciales }: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [riders, setRiders] = useState<RiderFila[]>(ridersIniciales);
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [arranque, setArranque] = useState<Arranque>("PLANTILLA");
  const [clonarDeId, setClonarDeId] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [trabajandoFila, setTrabajandoFila] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function abrirModal() {
    const siguiente = (riders[0]?.version ?? 0) + 1;
    setNombre(`Rider ${artistaNombre} v${siguiente}`);
    setArranque(riders.length ? "CLON" : "PLANTILLA");
    setClonarDeId(riders[0]?.id ?? "");
    setError(null);
    setAbierto(true);
  }

  /// La plantilla se siembra desde el cliente con los dos PUT de reemplazo total
  /// que ya exponen las APIs: el POST de riders solo sabe clonar.
  async function sembrarPlantilla(riderId: string) {
    const canales = await Promise.all(
      (
        [
          { tipo: "INPUT", canales: PLANTILLA_INPUT_BANDA.map((c, i) => ({ ...c, numero: i + 1 })) },
          {
            tipo: "OUTPUT",
            canales: numerarSalidas(
              PLANTILLA_OUTPUT_BANDA.map((c) => ({ ...c, estereo: c.estereo === true })),
            ).map(({ canal, ...c }) => ({ ...c, numero: canal })),
          },
        ] as const
      ).map((carga) =>
        fetch(`/api/artista-riders/${riderId}/canales`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(carga),
        }),
      ),
    );
    const lineas = await fetch(`/api/artista-riders/${riderId}/lineas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineas: PLANTILLA_RIDER_BANDA.map((l, i) => ({ ...l, orden: i })) }),
    });
    if (canales.some((r) => !r.ok) || !lineas.ok) {
      toast.error("El rider se creó, pero la plantilla quedó incompleta. Revísala en la ficha.");
    }
  }

  async function crear() {
    if (!nombre.trim()) {
      setError("Ponle nombre a la versión.");
      return;
    }
    if (arranque === "CLON" && !clonarDeId) {
      setError("Elige de cuál versión se copia.");
      return;
    }
    setTrabajando(true);
    setError(null);
    try {
      const res = await fetch(`/api/artistas/${artistaId}/riders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          clonarDeId: arranque === "CLON" ? clonarDeId : null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "No se pudo crear la versión.");
        return;
      }
      if (arranque === "PLANTILLA") await sembrarPlantilla(d.rider.id);
      toast.success(`Rider v${d.rider.version} creado y marcado como vigente`);
      router.push(`/giras/artista/${artistaId}/rider/${d.rider.id}`);
    } catch {
      setError("No se pudo crear la versión.");
    } finally {
      setTrabajando(false);
    }
  }

  async function hacerVigente(r: RiderFila) {
    setTrabajandoFila(r.id);
    try {
      const res = await fetch(`/api/artista-riders/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ esActivo: true }),
      });
      if (!res.ok) {
        toast.error("No se pudo marcar como vigente");
        return;
      }
      setRiders((prev) => prev.map((x) => ({ ...x, esActivo: x.id === r.id })));
      toast.success(`v${r.version} es ahora el rider vigente`);
      router.refresh();
    } finally {
      setTrabajandoFila(null);
    }
  }

  async function darDeBaja(r: RiderFila) {
    const ok = await confirm({
      message:
        r.giras > 0
          ? `«${r.nombre}» está ligado a ${r.giras} ${r.giras === 1 ? "gira" : "giras"}. ¿Darlo de baja de todos modos? Las giras conservan su advance.`
          : `¿Dar de baja «${r.nombre}»? Se oculta, no se borra.`,
      danger: true,
      confirmText: "Dar de baja",
    });
    if (!ok) return;
    setTrabajandoFila(r.id);
    try {
      const res = await fetch(`/api/artista-riders/${r.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo dar de baja");
        return;
      }
      setRiders((prev) => prev.filter((x) => x.id !== r.id));
      toast.success("Versión dada de baja");
      // La API pasa el relevo de «vigente» a la versión más reciente que quede.
      router.refresh();
    } finally {
      setTrabajandoFila(null);
    }
  }

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Riders del artista</h2>
          <p className="ms-subtitle mt-1">
            El rider maestro es lo que el artista pide una vez; cada show lo resuelve en su advance. Solo una versión
            es la vigente.
          </p>
        </div>
        <button className="ms-btn-primary" onClick={abrirModal}>
          Nueva versión
        </button>
      </div>

      {riders.length === 0 ? (
        <div className="ms-empty-state space-y-3">
          <p className="text-sm text-[#6b7280]">
            Este artista todavía no tiene rider. Arranca de la plantilla de banda y corrige lo que no aplique: se
            captura más rápido que 30 renglones en blanco.
          </p>
          <button className="ms-btn-primary" onClick={abrirModal}>
            Armar el primer rider
          </button>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th text-left">Versión</th>
                <th className="ms-th text-left">Formación</th>
                <th className="ms-th text-right">Canales</th>
                <th className="ms-th text-right">Conceptos</th>
                <th className="ms-th text-right">Giras</th>
                <th className="ms-th text-left">Actualizado</th>
                <th className="ms-th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {riders.map((r) => (
                <tr key={r.id} className="ms-tr">
                  <td className="ms-td">
                    <Link
                      href={`/giras/artista/${artistaId}/rider/${r.id}`}
                      className="text-white text-[13px] hover:text-[#B3985B] transition-colors"
                    >
                      {r.nombre}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="ms-micro">v{r.version}</span>
                      {r.esActivo && <span className="ms-badge ms-badge-gold">Vigente</span>}
                    </div>
                  </td>
                  <td className="ms-td text-[#9ca3af] text-[13px]">
                    {r.formacion ?? "—"}
                    {r.mixesMonitor ? <div className="ms-micro">{r.mixesMonitor} mixes de monitor</div> : null}
                  </td>
                  <td className="ms-td text-right text-[#9ca3af] text-[13px] tabular-nums">
                    {r.canales}
                    {r.canalesMinimos ? <div className="ms-micro">mín. {r.canalesMinimos}</div> : null}
                  </td>
                  <td className="ms-td text-right text-[#9ca3af] text-[13px] tabular-nums">{r.lineas}</td>
                  <td className="ms-td text-right text-[#9ca3af] text-[13px] tabular-nums">{r.giras}</td>
                  <td className="ms-td text-[#9ca3af] text-[13px]">{fmtFechaCorta(r.actualizado)}</td>
                  <td className="ms-td">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/giras/artista/${artistaId}/rider/${r.id}`} className="ms-btn-secondary">
                        Abrir
                      </Link>
                      {!r.esActivo && (
                        <button
                          onClick={() => void hacerVigente(r)}
                          disabled={trabajandoFila === r.id}
                          className="ms-btn-ghost disabled:opacity-50"
                        >
                          Hacer vigente
                        </button>
                      )}
                      <button
                        onClick={() => void darDeBaja(r)}
                        disabled={trabajandoFila === r.id}
                        className="text-[#555] hover:text-red-400 transition-colors px-1"
                        title="Dar de baja la versión"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={abierto} onClose={() => setAbierto(false)} title="Nueva versión del rider" maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="ms-label block mb-1.5">Nombre de la versión</label>
            <input
              autoFocus
              className="ms-input w-full"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Rider 2026 — banda completa"
            />
          </div>

          <div className="space-y-2">
            <label className="ms-label block">De dónde arranca</label>
            <Opcion
              activa={arranque === "CLON"}
              titulo="Copiar una versión existente"
              detalle="Trae cabecera, input/output list y conceptos. Es lo normal: una versión nueva casi siempre es la anterior con cambios."
              deshabilitada={riders.length === 0}
              onClick={() => setArranque("CLON")}
            />
            {arranque === "CLON" && riders.length > 0 && (
              <select
                className="ms-input w-full"
                value={clonarDeId}
                onChange={(e) => setClonarDeId(e.target.value)}
              >
                {riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    v{r.version} — {r.nombre} ({r.canales} canales, {r.lineas} conceptos)
                  </option>
                ))}
              </select>
            )}
            <Opcion
              activa={arranque === "PLANTILLA"}
              titulo="Sembrar la plantilla de banda"
              detalle={`${PLANTILLA_INPUT_BANDA.length} inputs, ${PLANTILLA_OUTPUT_BANDA.length} outputs y ${PLANTILLA_RIDER_BANDA.length} conceptos de equipo. Todo editable y borrable.`}
              onClick={() => setArranque("PLANTILLA")}
            />
            <Opcion
              activa={arranque === "VACIO"}
              titulo="Empezar en blanco"
              detalle="Solo la cabecera; las listas se capturan a mano."
              onClick={() => setArranque("VACIO")}
            />
          </div>

          {tipoFormacion && tipoFormacion !== "BANDA" && arranque === "PLANTILLA" && (
            <p className="text-xs text-amber-300">
              Este artista está registrado como {TIPO_FORMACION_LABEL[tipoFormacion] ?? tipoFormacion}: la plantilla
              es de banda completa, vas a tener que borrar varios renglones.
            </p>
          )}

          <p className="ms-micro">La versión nueva queda marcada como vigente y apaga a la anterior.</p>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={crear} disabled={trabajando} className="ms-btn-primary disabled:opacity-50">
              {trabajando ? "Creando…" : "Crear y abrir"}
            </button>
            <button onClick={() => setAbierto(false)} className="ms-btn-ghost">
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Opcion({
  activa,
  titulo,
  detalle,
  deshabilitada,
  onClick,
}: {
  activa: boolean;
  titulo: string;
  detalle: string;
  deshabilitada?: boolean;
  onClick: () => void;
}) {
  if (deshabilitada) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition-colors ${
        activa ? "border-[#B3985B] bg-[#B3985B]/5" : "border-[#1e1e1e] bg-[#0d0d0d] hover:border-[#2a2a2a]"
      }`}
    >
      <p className={`text-[13px] ${activa ? "text-white" : "text-[#9ca3af]"}`}>{titulo}</p>
      <p className="ms-micro mt-0.5">{detalle}</p>
    </button>
  );
}
