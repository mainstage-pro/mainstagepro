"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  ESTADO_GIRA_COLOR,
  ESTADO_GIRA_LABEL,
  TIPOS_FORMACION,
  TIPO_FORMACION_LABEL,
  fmtRango,
} from "@/lib/giras";

interface Artista {
  id: string;
  nombre: string;
  genero: string | null;
  origen: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  instagram: string | null;
  sitioWeb: string | null;
  notas: string | null;
  clienteId: string | null;
  logoUrl: string | null;
  tipoFormacion: string | null;
  integrantesNum: number | null;
}

interface GiraFila {
  id: string;
  nombre: string;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  plazas: number;
}

interface Props {
  artista: Artista;
  clientes: { id: string; nombre: string; empresa: string | null }[];
  giras: GiraFila[];
}

type Formulario = Record<keyof Omit<Artista, "id" | "integrantesNum">, string> & { integrantesNum: string };

function aFormulario(a: Artista): Formulario {
  return {
    nombre: a.nombre,
    genero: a.genero ?? "",
    origen: a.origen ?? "",
    contactoNombre: a.contactoNombre ?? "",
    contactoTelefono: a.contactoTelefono ?? "",
    contactoEmail: a.contactoEmail ?? "",
    instagram: a.instagram ?? "",
    sitioWeb: a.sitioWeb ?? "",
    notas: a.notas ?? "",
    clienteId: a.clienteId ?? "",
    logoUrl: a.logoUrl ?? "",
    tipoFormacion: a.tipoFormacion ?? "",
    integrantesNum: a.integrantesNum === null ? "" : String(a.integrantesNum),
  };
}

export default function DatosArtistaClient({ artista, clientes, giras }: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [form, setForm] = useState<Formulario>(aFormulario(artista));
  const [original, setOriginal] = useState<Formulario>(aFormulario(artista));
  const [guardando, setGuardando] = useState(false);

  const sucio = JSON.stringify(form) !== JSON.stringify(original);

  function set<K extends keyof Formulario>(campo: K, valor: string) {
    setForm((p) => ({ ...p, [campo]: valor }));
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      toast.error("El artista necesita nombre.");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/artistas/${artista.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nombre: form.nombre.trim(),
          integrantesNum: form.integrantesNum === "" ? null : Number(form.integrantesNum),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar.");
        return;
      }
      setOriginal(form);
      toast.success("Datos guardados");
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  async function darDeBaja() {
    const ok = await confirm({
      message: `¿Dar de baja a «${artista.nombre}» del catálogo? Sus riders y giras se conservan.`,
      danger: true,
      confirmText: "Dar de baja",
    });
    if (!ok) return;
    const res = await fetch(`/api/artistas/${artista.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo dar de baja.");
      return;
    }
    toast.success("Artista dado de baja");
    router.push("/giras/artistas");
  }

  return (
    <div className="ms-page space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="ms-card p-4 space-y-4">
            <p className="ms-section-label">Identidad</p>

            <div>
              <label className="ms-label block mb-1.5">Nombre</label>
              <input className="ms-input w-full" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ms-label block mb-1.5">Género</label>
                <input
                  className="ms-input w-full"
                  placeholder="ej. rock alternativo"
                  value={form.genero}
                  onChange={(e) => set("genero", e.target.value)}
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">Origen</label>
                <input
                  className="ms-input w-full"
                  placeholder="ej. Querétaro, MX"
                  value={form.origen}
                  onChange={(e) => set("origen", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ms-label block mb-1.5">Formación</label>
                <select
                  className="ms-input w-full"
                  value={form.tipoFormacion}
                  onChange={(e) => set("tipoFormacion", e.target.value)}
                >
                  <option value="">Sin definir</option>
                  {TIPOS_FORMACION.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_FORMACION_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ms-label block mb-1.5">Integrantes en escena</label>
                <input
                  type="number"
                  min={1}
                  className="ms-input w-full"
                  value={form.integrantesNum}
                  onChange={(e) => set("integrantesNum", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="ms-label block mb-1.5">Cliente que lo contrata o representa</label>
              <Combobox
                value={form.clienteId}
                onChange={(v) => set("clienteId", v)}
                options={[
                  { value: "", label: "Sin cliente" },
                  ...clientes.map((c) => ({
                    value: c.id,
                    label: c.empresa ? `${c.nombre} — ${c.empresa}` : c.nombre,
                  })),
                ]}
                placeholder="Sin cliente"
              />
            </div>
          </section>

          <section className="ms-card p-4 space-y-4">
            <p className="ms-section-label">Contacto de management</p>
            <p className="ms-micro">
              Es el contacto comercial del artista. Las personas de producción (tour manager, FOH, músicos) viven en{" "}
              <Link href={`/giras/artista/${artista.id}/personas`} className="ms-link-gold">
                Personas
              </Link>
              .
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="ms-label block mb-1.5">Nombre</label>
                <input
                  className="ms-input w-full"
                  value={form.contactoNombre}
                  onChange={(e) => set("contactoNombre", e.target.value)}
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">Teléfono</label>
                <input
                  className="ms-input w-full"
                  value={form.contactoTelefono}
                  onChange={(e) => set("contactoTelefono", e.target.value)}
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">Correo</label>
                <input
                  type="email"
                  className="ms-input w-full"
                  value={form.contactoEmail}
                  onChange={(e) => set("contactoEmail", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ms-label block mb-1.5">Instagram</label>
                <input
                  className="ms-input w-full"
                  placeholder="@artista"
                  value={form.instagram}
                  onChange={(e) => set("instagram", e.target.value)}
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">Sitio web</label>
                <input
                  className="ms-input w-full"
                  placeholder="https://…"
                  value={form.sitioWeb}
                  onChange={(e) => set("sitioWeb", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="ms-card p-4 space-y-3">
            <p className="ms-section-label">Notas</p>
            <textarea
              className="ms-textarea w-full"
              rows={4}
              placeholder="Lo que conviene saber antes de operarle: mañas, acuerdos, antecedentes…"
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
            />
          </section>
        </div>

        <div className="space-y-4">
          <section className="ms-card p-4 space-y-3">
            <p className="ms-section-label">Logo</p>
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logoUrl}
                alt=""
                className="w-full aspect-square object-cover rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]"
              />
            ) : (
              <div className="w-full aspect-square rounded-xl border border-dashed border-[#252525] bg-[#0d0d0d] flex items-center justify-center">
                <span className="ms-micro">Sin logo</span>
              </div>
            )}
            <input
              className="ms-input w-full"
              placeholder="https://…"
              value={form.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
            />
            <p className="ms-micro">Encabeza riders, input lists y day sheets.</p>
          </section>

          <section className="ms-card p-4 space-y-3">
            <p className="ms-section-label">Giras del artista</p>
            {giras.length === 0 ? (
              <p className="ms-meta">Todavía no tiene giras registradas.</p>
            ) : (
              <div className="divide-y divide-[#1a1a1a] -mx-4">
                {giras.map((g) => (
                  <Link
                    key={g.id}
                    href={`/giras/${g.id}`}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-[#161616] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] text-white truncate">{g.nombre}</p>
                      <p className="ms-micro">
                        {fmtRango(g.fechaInicio, g.fechaFin)} · {g.plazas} {g.plazas === 1 ? "plaza" : "plazas"}
                      </p>
                    </div>
                    <span className={`ms-badge shrink-0 ${ESTADO_GIRA_COLOR[g.estado] ?? ""}`}>
                      {ESTADO_GIRA_LABEL[g.estado] ?? g.estado}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="ms-card p-4 space-y-2">
            <p className="ms-section-label">Baja del catálogo</p>
            <p className="ms-micro">
              El artista se oculta del catálogo pero no se borra: sus riders, giras y propuestas quedan intactos.
            </p>
            <button onClick={darDeBaja} className="ms-btn-danger">
              Dar de baja
            </button>
          </section>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={guardar} disabled={guardando || !sucio} className="ms-btn-primary disabled:opacity-40">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
        {sucio && (
          <button onClick={() => setForm(original)} className="ms-btn-ghost">
            Descartar
          </button>
        )}
        {!sucio && <span className="ms-micro">Sin cambios por guardar.</span>}
      </div>
    </div>
  );
}
