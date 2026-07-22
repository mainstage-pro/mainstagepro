"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

interface Proyecto {
  nombre: string;
  numeroProyecto: string;
  fechaEvento: string | null;
  lugarEvento: string | null;
  direccionVenue: string | null;
  linkMaps: string | null;
  indicacionesAcceso: string | null;
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
  encargadoCliente: string | null;
  encargadoClienteContacto: string | null;
  encargadoLugar: string | null;
  encargadoLugarContacto: string | null;
  infoRecibidoEn: string | null;
  cliente: { nombre: string; empresa: string | null };
}

type Form = {
  fechaEvento: string;
  lugarEvento: string;
  direccionVenue: string;
  linkMaps: string;
  indicacionesAcceso: string;
  horaInicioEvento: string;
  horaFinEvento: string;
  encargadoCliente: string;
  encargadoClienteContacto: string;
  encargadoLugar: string;
  encargadoLugarContacto: string;
};

const EMPTY: Form = {
  fechaEvento: "", lugarEvento: "", direccionVenue: "", linkMaps: "", indicacionesAcceso: "",
  horaInicioEvento: "", horaFinEvento: "", encargadoCliente: "", encargadoClienteContacto: "",
  encargadoLugar: "", encargadoLugarContacto: "",
};

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#B3985B]/50 transition-colors"
      />
    </div>
  );
}

export default function ConfirmarProyecto() {
  const { token } = useParams<{ token: string }>();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [sending, setSending] = useState(false);

  const set = (k: keyof Form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch(`/api/confirmar/proyecto/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        const p = d.proyecto as Proyecto;
        setProyecto(p);
        setForm({
          fechaEvento: p.fechaEvento ? p.fechaEvento.substring(0, 10) : "",
          lugarEvento: p.lugarEvento ?? "",
          direccionVenue: p.direccionVenue ?? "",
          linkMaps: p.linkMaps ?? "",
          indicacionesAcceso: p.indicacionesAcceso ?? "",
          horaInicioEvento: p.horaInicioEvento ?? "",
          horaFinEvento: p.horaFinEvento ?? "",
          encargadoCliente: p.encargadoCliente ?? "",
          encargadoClienteContacto: p.encargadoClienteContacto ?? "",
          encargadoLugar: p.encargadoLugar ?? "",
          encargadoLugarContacto: p.encargadoLugarContacto ?? "",
        });
        if (p.infoRecibidoEn) setEnviado(true);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

  async function enviar() {
    setSending(true);
    const res = await fetch(`/api/confirmar/proyecto/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSending(false);
    if (res.ok) { setEnviado(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo guardar. Intenta de nuevo.");
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center" style={{ fontFamily: FONT }}>
      <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );

  if (error && !proyecto) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6" style={{ fontFamily: FONT }}>
      <Image src="/logo-white.png" alt="Mainstage Pro" width={130} height={34} className="object-contain opacity-30" />
      <p className="text-white/40 text-sm mt-4">Este enlace no es válido o ha expirado.</p>
      <p className="text-white/20 text-xs">Contacta a tu coordinador para obtener un nuevo enlace.</p>
    </div>
  );

  if (!proyecto) return null;

  if (enviado) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ fontFamily: FONT }}>
      <div className="w-14 h-14 rounded-full bg-[#B3985B]/10 border border-[#B3985B]/30 flex items-center justify-center">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-white text-xl font-bold">¡Información recibida!</h1>
      <p className="text-white/40 text-sm max-w-sm">
        Gracias, {proyecto.cliente.nombre}. Ya guardamos los detalles del proyecto <span className="text-white/70">{proyecto.numeroProyecto}</span>. Nuestro equipo los revisará.
      </p>
      <button
        onClick={() => setEnviado(false)}
        className="mt-2 text-[#B3985B] hover:text-white text-xs font-semibold transition-colors"
      >
        Editar información
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-28" style={{ fontFamily: FONT }}>
      <div className="max-w-xl mx-auto px-6">
        <header className="pt-14 pb-8">
          <Image src="/logo-white.png" alt="Mainstage Pro" width={110} height={28} className="object-contain opacity-80 mb-8" />
          <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-[0.25em] mb-3">
            Confirmación de información · {proyecto.numeroProyecto}
          </p>
          <h1 className="text-white font-bold leading-tight" style={{ fontSize: "clamp(1.5rem,5vw,2.2rem)", letterSpacing: "-0.02em" }}>
            {proyecto.nombre}
          </h1>
          <p className="text-white/40 text-sm mt-3 leading-relaxed">
            Hola {proyecto.cliente.nombre}, ayúdanos a confirmar los datos de tu evento. Revisa lo que ya tenemos, corrige o completa lo que falte y guarda al final.
          </p>
        </header>

        {error && (
          <div className="mb-5 bg-red-900/20 border border-red-500/25 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="space-y-7">
          <section className="space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Fecha y horario</p>
            <Field label="Fecha del evento" type="date" value={form.fechaEvento} onChange={set("fechaEvento")} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora de inicio" value={form.horaInicioEvento} onChange={set("horaInicioEvento")} placeholder="Ej. 7:00 PM" />
              <Field label="Hora de fin" value={form.horaFinEvento} onChange={set("horaFinEvento")} placeholder="Ej. 2:00 AM" />
            </div>
          </section>

          <section className="space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Lugar del evento</p>
            <Field label="Nombre del lugar / venue" value={form.lugarEvento} onChange={set("lugarEvento")} placeholder="Ej. Salón Los Arcos" />
            <Field label="Dirección completa" value={form.direccionVenue} onChange={set("direccionVenue")} placeholder="Calle, número, colonia, ciudad" />
            <Field label="Link de Google Maps" value={form.linkMaps} onChange={set("linkMaps")} placeholder="https://maps.google.com/..." />
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1.5">Indicaciones de acceso</label>
              <textarea
                value={form.indicacionesAcceso}
                onChange={e => set("indicacionesAcceso")(e.target.value)}
                rows={3}
                placeholder="Estacionamiento, acceso de carga, códigos, restricciones de horario, etc."
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#B3985B]/50 transition-colors resize-none"
              />
            </div>
          </section>

          <section className="space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Contactos en el sitio</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Encargado (tu equipo)" value={form.encargadoCliente} onChange={set("encargadoCliente")} placeholder="Nombre" />
              <Field label="Teléfono" value={form.encargadoClienteContacto} onChange={set("encargadoClienteContacto")} placeholder="Celular" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Encargado del lugar" value={form.encargadoLugar} onChange={set("encargadoLugar")} placeholder="Nombre" />
              <Field label="Teléfono del lugar" value={form.encargadoLugarContacto} onChange={set("encargadoLugarContacto")} placeholder="Celular" />
            </div>
          </section>
        </div>

        <div className="text-center pt-8 pb-2">
          <p className="text-white/15 text-[10px]">Este enlace es confidencial — no lo compartas con terceros</p>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-black via-black to-transparent pt-8 pb-5 px-6">
        <div className="max-w-xl mx-auto">
          <button
            onClick={enviar}
            disabled={sending}
            className="w-full bg-[#B3985B] hover:bg-[#c9a960] disabled:opacity-50 text-black font-bold py-4 rounded-2xl text-base transition-colors"
          >
            {sending ? "Guardando…" : "Confirmar y guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
