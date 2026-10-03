"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { useToast } from "@/components/Toast";
import {
  CONTEXTOS_RIDER,
  CONTEXTO_RIDER_AYUDA,
  CONTEXTO_RIDER_LABEL,
  DISCIPLINA_LABEL,
  ORIGEN_RIDER_LABEL,
  fmtTamano,
} from "@/lib/giras";

export interface RiderFicha {
  id: string;
  nombre: string;
  version: number;
  esActivo: boolean;
  contexto: string;
  origen: string;
  archivoUrl: string | null;
  archivoNombre: string | null;
  archivoTamanoBytes: number | null;
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
    contexto: r.contexto,
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
  const [doc, setDoc] = useState({
    origen: rider.origen,
    archivoUrl: rider.archivoUrl,
    archivoNombre: rider.archivoNombre,
    archivoTamanoBytes: rider.archivoTamanoBytes,
  });
  const [subiendo, setSubiendo] = useState(false);
  const inputPdf = useRef<HTMLInputElement>(null);

  const cargado = doc.origen === "CARGADO";
  const sucio = JSON.stringify(form) !== JSON.stringify(original);

  function set(campo: string, valor: string) {
    setForm((p) => ({ ...p, [campo]: valor }));
  }

  /// El rider cargado se guarda aparte del formulario: el PATCH debe salir en el
  /// momento en que termina la subida, no cuando el usuario se acuerde de guardar.
  async function parchearDoc(campos: Record<string, unknown>) {
    const res = await fetch(`/api/artista-riders/${rider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo guardar.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function subirPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    try {
      // El binario sube directo del navegador a Blob: un rider escaneado de 25 MB
      // no cabe en el límite de las funciones serverless.
      const blob = await upload(`riders/${rider.id}/${Date.now()}-rider.pdf`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/token",
      });
      const campos = {
        origen: "CARGADO",
        archivoUrl: blob.url,
        archivoNombre: file.name,
        archivoTamanoBytes: file.size,
      };
      if (await parchearDoc(campos)) {
        setDoc(campos);
        toast.success("Rider del artista cargado");
      }
    } catch {
      toast.error("No se pudo subir el documento");
    } finally {
      setSubiendo(false);
      if (inputPdf.current) inputPdf.current.value = "";
    }
  }

  async function volverAGenerado() {
    const campos = { origen: "GENERADO", archivoUrl: null, archivoNombre: null, archivoTamanoBytes: null };
    if (await parchearDoc(campos)) {
      setDoc(campos);
      toast.success("El rider vuelve a armarse en la plataforma");
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div>
            <label className="ms-label block mb-1.5">Nombre de la versión</label>
            <input className="ms-input w-full" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </div>
          <div>
            <label className="ms-label block mb-1.5">Para qué tipo de show</label>
            <select
              className="ms-input w-full"
              value={form.contexto}
              onChange={(e) => set("contexto", e.target.value)}
            >
              {CONTEXTOS_RIDER.map((c) => (
                <option key={c} value={c}>
                  {CONTEXTO_RIDER_LABEL[c]}
                </option>
              ))}
            </select>
            <p className="ms-micro mt-1">{CONTEXTO_RIDER_AYUDA[form.contexto] ?? ""}</p>
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

        <p className="ms-micro">
          Cada tipo de show lleva su propia línea de versiones: el rider de festival no apaga al de tour. Si cambias
          el tipo aquí, esta versión pasa a competir por «vigente» en el tipo nuevo.
        </p>

        {!cargado && (
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
        )}
      </section>

      {/* El artista que ya tiene un rider que le funciona no debería recapturarlo:
          se sube su PDF y la plataforma solo le pega los anexos y lo distribuye. */}
      <section className="ms-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="ms-section-label">De dónde sale el documento</p>
          <span className={`ms-badge ${cargado ? "ms-badge-gray" : "ms-badge-gold"}`}>
            {ORIGEN_RIDER_LABEL[doc.origen] ?? doc.origen}
          </span>
        </div>

        {cargado ? (
          <>
            <p className="ms-micro">
              El PDF del artista se manda tal como está: no se re-maqueta para no perder el formato que ellos
              negocian. Lo único que se le agrega son los anexos marcados «incluir en el PDF».
            </p>
            <div className="ms-card-deep p-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <a
                href={doc.archivoUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] text-white hover:text-[#B3985B] transition-colors"
              >
                {doc.archivoNombre ?? "Documento del artista"}
              </a>
              {doc.archivoTamanoBytes ? (
                <span className="ms-micro">{fmtTamano(doc.archivoTamanoBytes)}</span>
              ) : null}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  className="ms-btn-secondary disabled:opacity-50"
                  onClick={() => inputPdf.current?.click()}
                  disabled={subiendo}
                >
                  {subiendo ? "Subiendo…" : "Reemplazar PDF"}
                </button>
                <button className="ms-btn-ghost" onClick={() => void volverAGenerado()} disabled={subiendo}>
                  Armarlo en la plataforma
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="ms-micro">
              Esta versión se arma aquí: la plataforma maqueta el rider con las notas, la input/output list, el equipo
              que pide y los contactos. Si el artista ya trae un rider que le funciona, súbelo y se usa ese.
            </p>
            <button
              className="ms-btn-secondary disabled:opacity-50"
              onClick={() => inputPdf.current?.click()}
              disabled={subiendo}
            >
              {subiendo ? "Subiendo…" : "Cargar el rider del artista (PDF)"}
            </button>
          </>
        )}

        <input
          ref={inputPdf}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => void subirPdf(e)}
        />
      </section>

      {!cargado && (
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
            <label className="ms-label block mb-1.5">Stage plot</label>
            <Link
              href={`/giras/artista/${artistaId}/rider/${rider.id}/anexos`}
              className="ms-btn-secondary inline-block"
            >
              Subir imagen o PDF
            </Link>
            <p className="ms-micro mt-1">Se imprime en su propia página, sin deformar las medidas.</p>
          </div>
        </div>
      </section>
      )}

      {!cargado && (
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
      )}

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
            Hacerla vigente en {CONTEXTO_RIDER_LABEL[form.contexto] ?? form.contexto}
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
