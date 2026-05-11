"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

type PersonalItem = { id: string; nombre: string; rol: string; confirmado: boolean; telefono?: string | null };
type EquipoItem = { id: string; nombre: string; cantidad: number };

type Plan = {
  objetivoEvento: string;
  briefingProduccion: string;
  encargadoProduccion: string;
  encargadoProduccionTel: string;
  encargadoLugar: string;
  encargadoLugarTel: string;
  horaLlegada: string;
  rutaTransporte: string;
  vehiculo: string;
  montajeInicio: string;
  montajeFin: string;
  soundcheckHora: string;
  cronogramaDia: string;
  equipoEspecial: string;
  proveedoresExternos: string;
  alimentacion: string;
  hospedaje: string;
  notasFinales: string;
};

const PLAN_DEFAULT: Plan = {
  objetivoEvento: "",
  briefingProduccion: "",
  encargadoProduccion: "",
  encargadoProduccionTel: "",
  encargadoLugar: "",
  encargadoLugarTel: "",
  horaLlegada: "",
  rutaTransporte: "",
  vehiculo: "",
  montajeInicio: "",
  montajeFin: "",
  soundcheckHora: "",
  cronogramaDia: "",
  equipoEspecial: "",
  proveedoresExternos: "",
  alimentacion: "",
  hospedaje: "",
  notasFinales: "",
};

function Field({ label, value, onChange, placeholder, multiline, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; required?: boolean;
}) {
  const cls = "w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50";
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#555] uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${cls} resize-none`} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

export default function PlanProduccionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [proyecto, setProyecto] = useState<{
    nombre: string; numeroProyecto: string; fechaEvento: string; lugarEvento?: string | null;
    estado: string; planProduccion: string | null; planProduccionAprobado: boolean;
    planProduccionAprobadoEn: string | null;
    personal: PersonalItem[]; equipos: EquipoItem[];
    transportes?: string | null; cronograma?: string | null;
    encargadoLugar?: string | null; encargadoLugarContacto?: string | null;
    contactosEmergencia?: string | null;
  } | null>(null);

  const [plan, setPlan] = useState<Plan>(PLAN_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aprobando, setAprobando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/proyectos/${id}`);
    const d = await r.json();
    const p = d.proyecto;
    setProyecto(p);
    if (p?.planProduccion) {
      try {
        const stored = JSON.parse(p.planProduccion);
        setPlan({ ...PLAN_DEFAULT, ...stored });
      } catch { /* noop */ }
    } else {
      // Pre-rellenar con datos existentes del proyecto
      setPlan(prev => ({
        ...prev,
        encargadoLugar: p?.encargadoLugar ?? "",
        encargadoLugarTel: p?.encargadoLugarContacto ?? "",
        rutaTransporte: p?.transportes ?? "",
        cronogramaDia: p?.cronograma ?? "",
        notasFinales: p?.contactosEmergencia ?? "",
      }));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    setSaving(true);
    const r = await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planProduccion: JSON.stringify(plan) }),
    });
    if (r.ok) {
      toast.success("Plan guardado");
      await cargar();
    } else {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const aprobar = async () => {
    if (!proyecto) return;
    const horasAntes = proyecto.fechaEvento
      ? (new Date(proyecto.fechaEvento).getTime() - Date.now()) / 3600000
      : 9999;

    if (horasAntes < 0) {
      toast.error("El evento ya ocurrió");
      return;
    }

    setAprobando(true);
    // Guardar el plan primero
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planProduccion: JSON.stringify(plan), planProduccionAprobado: true }),
    });
    toast.success("Plan de producción aprobado");
    await cargar();
    setAprobando(false);
  };

  if (loading) {
    return <div className="p-6 text-center text-[#444] text-sm">Cargando plan...</div>;
  }

  if (!proyecto) {
    return <div className="p-6 text-center text-[#444]">Proyecto no encontrado</div>;
  }

  const ahora = Date.now();
  const msEvento = new Date(proyecto.fechaEvento).getTime();
  const horasRestantes = (msEvento - ahora) / 3600000;
  const diasRestantes = horasRestantes / 24;

  const esInminente = horasRestantes >= 0 && horasRestantes <= 72;
  const esAprobado = proyecto.planProduccionAprobado;

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const personalConfirmado = proyecto.personal.filter(p => p.confirmado);
  const personalPendiente = proyecto.personal.filter(p => !p.confirmado);

  const requiredOk = plan.briefingProduccion.trim().length > 0
    && plan.encargadoProduccion.trim().length > 0
    && plan.horaLlegada.trim().length > 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/proyectos/${id}`} className="text-[#555] hover:text-white text-xs transition-colors">
              ← {proyecto.numeroProyecto}
            </Link>
            <span className="text-[#333]">/</span>
            <span className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">Plan de Producción</span>
          </div>
          <h1 className="text-white text-2xl font-bold">{proyecto.nombre}</h1>
          <p className="text-[#666] text-sm mt-1">{fmtDate(proyecto.fechaEvento)}</p>
        </div>
        <div className="shrink-0 text-right">
          {esAprobado ? (
            <div className="bg-green-900/30 border border-green-800/50 rounded-xl px-4 py-2 text-center">
              <p className="text-green-400 text-sm font-bold">Plan aprobado</p>
              {proyecto.planProduccionAprobadoEn && (
                <p className="text-green-600 text-[10px] mt-0.5">
                  {new Date(proyecto.planProduccionAprobadoEn).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          ) : (
            <div className={`rounded-xl px-4 py-2 text-center border ${
              esInminente ? "bg-red-950/30 border-red-900/50" : "bg-[#111] border-[#1e1e1e]"
            }`}>
              <p className={`text-sm font-bold ${esInminente ? "text-red-400" : "text-[#B3985B]"}`}>
                {horasRestantes < 0 ? "Evento pasado" : diasRestantes >= 1 ? `${Math.floor(diasRestantes)}d restantes` : `${Math.round(horasRestantes)}h restantes`}
              </p>
              <p className="text-[#555] text-[10px] mt-0.5">
                {esInminente ? "¡Aprueba el plan ahora!" : "Límite: 72h antes"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Alerta 72h */}
      {!esAprobado && esInminente && (
        <div className="bg-red-950/20 border border-red-800/50 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl shrink-0">⚠</span>
          <div>
            <p className="text-red-400 font-bold text-sm">Plan no aprobado — evento en menos de 72 horas</p>
            <p className="text-red-300/70 text-xs mt-0.5">
              Completa y aprueba el plan de producción para que el equipo tenga claridad operativa.
            </p>
          </div>
        </div>
      )}

      {/* Resumen de personal y equipos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[10px] font-bold text-[#555] uppercase tracking-wider mb-3">Personal</p>
          {proyecto.personal.length === 0 ? (
            <p className="text-[#444] text-xs">Sin personal asignado</p>
          ) : (
            <div className="space-y-1.5">
              {proyecto.personal.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">{p.nombre}</p>
                    <p className="text-[#555] text-[10px]">{p.rol}</p>
                  </div>
                  <span className={`text-[10px] font-bold ${p.confirmado ? "text-green-400" : "text-yellow-400"}`}>
                    {p.confirmado ? "Confirmado" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          )}
          {personalPendiente.length > 0 && (
            <p className="text-yellow-500 text-[10px] mt-2">{personalPendiente.length} pendiente(s) de confirmar</p>
          )}
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[10px] font-bold text-[#555] uppercase tracking-wider mb-3">Equipos asignados</p>
          {proyecto.equipos.length === 0 ? (
            <p className="text-[#444] text-xs">Sin equipos asignados</p>
          ) : (
            <div className="space-y-1.5">
              {proyecto.equipos.slice(0, 6).map(e => (
                <div key={e.id} className="flex items-center justify-between">
                  <p className="text-white text-sm">{e.nombre}</p>
                  <span className="text-[#555] text-xs">×{e.cantidad}</span>
                </div>
              ))}
              {proyecto.equipos.length > 6 && (
                <p className="text-[#444] text-xs">+{proyecto.equipos.length - 6} más</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Formulario del plan */}
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-4">BRIEFING DE PRODUCCIÓN</p>
          <div className="space-y-4">
            <Field
              label="Objetivo del evento"
              value={plan.objetivoEvento}
              onChange={v => setPlan(p => ({ ...p, objetivoEvento: v }))}
              placeholder="Qué se espera lograr, tipo de evento, tono..."
              multiline
            />
            <Field
              label="Briefing general para el equipo de producción"
              required
              value={plan.briefingProduccion}
              onChange={v => setPlan(p => ({ ...p, briefingProduccion: v }))}
              placeholder="Instrucciones clave, expectativas del cliente, puntos críticos a cuidar..."
              multiline
            />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-4">RESPONSABLES</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Encargado de producción" required value={plan.encargadoProduccion}
              onChange={v => setPlan(p => ({ ...p, encargadoProduccion: v }))} placeholder="Nombre del encargado principal" />
            <Field label="Teléfono" value={plan.encargadoProduccionTel}
              onChange={v => setPlan(p => ({ ...p, encargadoProduccionTel: v }))} placeholder="+52 55 0000 0000" />
            <Field label="Encargado del lugar" value={plan.encargadoLugar}
              onChange={v => setPlan(p => ({ ...p, encargadoLugar: v }))} placeholder="Contacto en el venue" />
            <Field label="Teléfono del lugar" value={plan.encargadoLugarTel}
              onChange={v => setPlan(p => ({ ...p, encargadoLugarTel: v }))} placeholder="+52 55 0000 0000" />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-4">LOGÍSTICA Y TRANSPORTE</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Hora de llegada al venue" required value={plan.horaLlegada}
              onChange={v => setPlan(p => ({ ...p, horaLlegada: v }))} placeholder="ej: 08:00" />
            <Field label="Vehículo / transporte" value={plan.vehiculo}
              onChange={v => setPlan(p => ({ ...p, vehiculo: v }))} placeholder="Camioneta, trailer, van..." />
            <Field label="Ruta / dirección de carga" value={plan.rutaTransporte}
              onChange={v => setPlan(p => ({ ...p, rutaTransporte: v }))} placeholder="Punto de salida y ruta hasta el venue" multiline />
            <Field label="Alimentación del crew" value={plan.alimentacion}
              onChange={v => setPlan(p => ({ ...p, alimentacion: v }))} placeholder="Quién provee, horarios, restricciones..." />
          </div>
          <div className="mt-4">
            <Field label="Hospedaje (si aplica)" value={plan.hospedaje}
              onChange={v => setPlan(p => ({ ...p, hospedaje: v }))} placeholder="Hotel, dirección, quién se queda..." />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-4">CRONOGRAMA DEL DÍA</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Inicio de montaje" value={plan.montajeInicio}
              onChange={v => setPlan(p => ({ ...p, montajeInicio: v }))} placeholder="08:00" />
            <Field label="Fin de montaje / check" value={plan.montajeFin}
              onChange={v => setPlan(p => ({ ...p, montajeFin: v }))} placeholder="14:00" />
            <Field label="Soundcheck / prueba" value={plan.soundcheckHora}
              onChange={v => setPlan(p => ({ ...p, soundcheckHora: v }))} placeholder="15:00" />
          </div>
          <div className="mt-4">
            <Field label="Cronograma detallado del día" value={plan.cronogramaDia}
              onChange={v => setPlan(p => ({ ...p, cronogramaDia: v }))} placeholder="08:00 Llegada y descarga&#10;09:00 Montaje de luces&#10;12:00 Prueba de sonido&#10;..." multiline />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-[#3a3a3a] uppercase tracking-widest mb-4">NOTAS ESPECIALES</p>
          <div className="space-y-4">
            <Field label="Equipo especial o requerimientos técnicos" value={plan.equipoEspecial}
              onChange={v => setPlan(p => ({ ...p, equipoEspecial: v }))} placeholder="Rider especial, requerimientos del artista, condiciones del venue..." multiline />
            <Field label="Proveedores externos / subcontratados" value={plan.proveedoresExternos}
              onChange={v => setPlan(p => ({ ...p, proveedoresExternos: v }))} placeholder="Iluminador externo, catering, seguridad, staff extra..." multiline />
            <Field label="Notas finales / emergencias" value={plan.notasFinales}
              onChange={v => setPlan(p => ({ ...p, notasFinales: v }))} placeholder="Contactos de emergencia, plan B, restricciones del lugar..." multiline />
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#1a1a1a]">
        <button
          onClick={() => router.push(`/proyectos/${id}`)}
          className="text-[#555] hover:text-white text-sm transition-colors"
        >
          ← Volver al proyecto
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={guardar}
            disabled={saving}
            className="bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-xl border border-[#2a2a2a] transition-all"
          >
            {saving ? "Guardando..." : "Guardar borrador"}
          </button>
          {!esAprobado && (
            <button
              onClick={aprobar}
              disabled={aprobando || !requiredOk}
              className="bg-[#B3985B] hover:bg-[#c9aa6a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2 rounded-xl transition-all"
              title={!requiredOk ? "Completa los campos requeridos primero" : ""}
            >
              {aprobando ? "Aprobando..." : "Aprobar plan de producción"}
            </button>
          )}
          {esAprobado && (
            <button
              onClick={async () => {
                await fetch(`/api/proyectos/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ planProduccionAprobado: false }),
                });
                await cargar();
                toast.success("Aprobación retirada");
              }}
              className="text-[#555] hover:text-yellow-400 text-xs transition-colors"
            >
              Retirar aprobación
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
