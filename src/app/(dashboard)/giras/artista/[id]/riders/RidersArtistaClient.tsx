"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  CONTEXTOS_RIDER,
  CONTEXTO_RIDER_AYUDA,
  CONTEXTO_RIDER_COLOR,
  CONTEXTO_RIDER_LABEL,
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
  contexto: string;
  archivoNombre: string | null;
  canalesMinimos: number | null;
  mixesMonitor: number | null;
  actualizado: string;
  canales: number;
  lineas: number;
  giras: number;
  contactos: number;
  anexos: number;
}

interface Props {
  artistaId: string;
  artistaNombre: string;
  tipoFormacion: string | null;
  ridersIniciales: RiderFila[];
}

/// De dónde sale la ficha. El PDF del artista ya no es una de estas opciones: se
/// adjunta aparte, como referencia, y se puede combinar con cualquiera de las tres.
type Arranque = "VACIO" | "PLANTILLA" | "CLON";

export default function RidersArtistaClient({ artistaId, artistaNombre, tipoFormacion, ridersIniciales }: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [riders, setRiders] = useState<RiderFila[]>(ridersIniciales);
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [contexto, setContexto] = useState("GENERAL");
  const [arranque, setArranque] = useState<Arranque>("PLANTILLA");
  const [clonarDeId, setClonarDeId] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [trabajandoFila, setTrabajandoFila] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputPdf = useRef<HTMLInputElement>(null);

  function abrirModal() {
    const siguiente = (riders[0]?.version ?? 0) + 1;
    setNombre(`Rider ${artistaNombre} v${siguiente}`);
    setContexto("GENERAL");
    setArranque(riders.length ? "CLON" : "PLANTILLA");
    setClonarDeId(riders[0]?.id ?? "");
    setPdf(null);
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
      // El PDF sube antes de crear la versión: si falla la subida no queda una
      // ficha apuntando a un archivo que no existe.
      let archivo: { archivoUrl: string; archivoNombre: string; archivoTamanoBytes: number } | null = null;
      if (pdf) {
        const blob = await upload(`riders/${artistaId}/${Date.now()}-rider.pdf`, pdf, {
          access: "public",
          handleUploadUrl: "/api/upload/token",
        });
        archivo = { archivoUrl: blob.url, archivoNombre: pdf.name, archivoTamanoBytes: pdf.size };
      }

      const res = await fetch(`/api/artistas/${artistaId}/riders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          contexto,
          clonarDeId: arranque === "CLON" ? clonarDeId : null,
          ...(archivo ?? {}),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "No se pudo crear la versión.");
        return;
      }
      if (arranque === "PLANTILLA") await sembrarPlantilla(d.rider.id);
      toast.success(
        `Rider v${d.rider.version} creado y vigente en ${CONTEXTO_RIDER_LABEL[contexto] ?? contexto}`,
      );
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
      // Solo apaga a las de su mismo tipo de show: el de festival no toca al de tour.
      setRiders((prev) =>
        prev.map((x) => (x.contexto === r.contexto ? { ...x, esActivo: x.id === r.id } : x)),
      );
      toast.success(`v${r.version} es ahora el rider vigente en ${CONTEXTO_RIDER_LABEL[r.contexto] ?? r.contexto}`);
      router.refresh();
    } finally {
      setTrabajandoFila(null);
    }
  }

  async function darDeBaja(r: RiderFila) {
    const ok = await confirm({
      message:
        r.giras > 0
          ? `«${r.nombre}» está ligado a ${r.giras} ${r.giras === 1 ? "registro" : "registros"}. ¿Darlo de baja de todos modos? Conservan su advance.`
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

  // Agrupadas por tipo de show, en el orden del vocabulario: cada tipo es su
  // propia línea de versiones y leerlas revueltas es justo la confusión que se
  // está quitando.
  const grupos: [string, RiderFila[]][] = CONTEXTOS_RIDER.map(
    (c) => [c as string, riders.filter((r) => r.contexto === c)] as [string, RiderFila[]],
  ).filter(([, del]) => del.length > 0);

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Riders del artista</h2>
          <p className="ms-subtitle mt-1">
            Un rider por tipo de show, no uno para todo: lo que pide en festival no es lo que pide en un privado.
            Cada tipo tiene su propia versión vigente y su propio historial.
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
        grupos.map(([ctx, delGrupo]) => (
        <div key={ctx} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`ms-badge ${CONTEXTO_RIDER_COLOR[ctx] ?? "ms-badge-gray"}`}>
              {CONTEXTO_RIDER_LABEL[ctx] ?? ctx}
            </span>
            <span className="ms-micro">
              {delGrupo.length} {delGrupo.length === 1 ? "versión" : "versiones"} ·{" "}
              {CONTEXTO_RIDER_AYUDA[ctx] ?? ""}
            </span>
          </div>
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th text-left">Versión</th>
                <th className="ms-th text-left">Formación</th>
                <th className="ms-th text-right">Canales</th>
                <th className="ms-th text-right">Conceptos</th>
                <th className="ms-th text-right">Contactos</th>
                <th className="ms-th text-right">Anexos</th>
                <th className="ms-th text-right">En uso</th>
                <th className="ms-th text-left">Actualizado</th>
                <th className="ms-th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {delGrupo.map((r) => (
                <tr key={r.id} className="ms-tr">
                  <td className="ms-td">
                    <Link
                      href={`/giras/artista/${artistaId}/rider/${r.id}`}
                      className="text-white text-[13px] hover:text-[#B3985B] transition-colors"
                    >
                      {r.nombre}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="ms-micro">v{r.version}</span>
                      {r.esActivo && <span className="ms-badge ms-badge-gold">Vigente</span>}
                      {/* El PDF del artista es referencia adjunta, no otro tipo de
                          rider: la ficha es la que manda en todos los casos. */}
                      {r.archivoNombre && (
                        <span className="ms-badge ms-badge-gray" title={r.archivoNombre}>
                          PDF del artista
                        </span>
                      )}
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
                  <td className="ms-td text-right text-[#9ca3af] text-[13px] tabular-nums">{r.contactos}</td>
                  <td className="ms-td text-right text-[#9ca3af] text-[13px] tabular-nums">{r.anexos}</td>
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
        </div>
        ))
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

          <div>
            <label className="ms-label block mb-1.5">Para qué tipo de show</label>
            <select className="ms-input w-full" value={contexto} onChange={(e) => setContexto(e.target.value)}>
              {CONTEXTOS_RIDER.map((c) => (
                <option key={c} value={c}>
                  {CONTEXTO_RIDER_LABEL[c]}
                </option>
              ))}
            </select>
            <p className="ms-micro mt-1">{CONTEXTO_RIDER_AYUDA[contexto] ?? ""}</p>
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

          {/* El PDF del artista no compite con las tres opciones de arriba: es el
              documento de referencia del que se transcribe la ficha, y se queda
              adjunto para cotejar. */}
          <div className="space-y-2">
            <label className="ms-label block">El PDF del artista (opcional)</label>
            <p className="ms-micro">
              Si el artista ya trae su rider en PDF, adjúntalo: se queda fijo para consulta y desde la ficha se puede
              transcribir a la plataforma. El documento que se manda al foro siempre se arma con la ficha.
            </p>
            <div className="ms-card-deep p-3 flex flex-wrap items-center gap-2">
              <button className="ms-btn-secondary" onClick={() => inputPdf.current?.click()}>
                {pdf ? "Cambiar PDF" : "Elegir PDF"}
              </button>
              <span className="ms-micro">{pdf ? pdf.name : "Ningún archivo elegido"}</span>
              {pdf && (
                <button className="ms-btn-ghost" onClick={() => setPdf(null)}>
                  Quitar
                </button>
              )}
              <input
                ref={inputPdf}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {tipoFormacion && tipoFormacion !== "BANDA" && arranque === "PLANTILLA" && (
            <p className="text-xs text-amber-300">
              Este artista está registrado como {TIPO_FORMACION_LABEL[tipoFormacion] ?? tipoFormacion}: la plantilla
              es de banda completa, vas a tener que borrar varios renglones.
            </p>
          )}

          <p className="ms-micro">
            Queda vigente en {CONTEXTO_RIDER_LABEL[contexto] ?? contexto} y apaga a la anterior de ese mismo tipo. Las
            de otros tipos de show no se tocan.
          </p>

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
