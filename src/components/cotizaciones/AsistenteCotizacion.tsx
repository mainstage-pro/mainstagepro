"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";

interface LineaDraft {
  tipo: string;
  descripcion: string;
  cantidad: number;
  dias: number;
  precioUnitario: number;
  subtotal: number;
  revisar: boolean;
}
interface Resumen {
  subtotalEquiposNeto: number;
  subtotalOperacion: number;
  montoDescuento: number;
  granTotal: number;
}
interface Borrador {
  extraido: {
    clienteNombre: string | null;
    servicio: string | null;
    tipoEvento: string | null;
    fechaEvento: string | null;
    lugar: string | null;
  };
  horas: number;
  jornada: string;
  cliente: { match: { id: string; nombre: string } | null; nombre: string | null };
  lineas: LineaDraft[];
  noResueltos: string[];
  descuentoEspecialPct: number;
  resumen: Resumen;
}

const EJEMPLO =
  "Necesito una cotización con 4 bocinas, 4 bajos, 8 beams, 8 kaleidos, 4 flasher, 8 blinder, 4 trusses de 3 metros, consola yamaha 10 canales, operador de audio, operador de video, para el cliente Juan Manuel Nava, con servicio de producción técnica para el 10 de octubre en Santa Rosa Jáuregui, de 3:00 pm a 1:00 am, con descuento del 15% sobre equipos";

const TIPO_LABEL: Record<string, string> = {
  EQUIPO_PROPIO: "Equipo",
  EQUIPO_EXTERNO: "Equipo externo",
  OPERACION_TECNICA: "Personal",
  DJ: "DJ",
  OTRO: "Sin resolver",
};

export default function AsistenteCotizacion({ onClose }: { onClose: () => void }) {
  const [texto, setTexto] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function analizar() {
    if (!texto.trim()) return;
    setAnalizando(true);
    setBorrador(null);
    try {
      const res = await fetch("/api/cotizaciones/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo interpretar el pedido");
        return;
      }
      setBorrador(data);
    } catch {
      toast.error("Error de red al analizar");
    } finally {
      setAnalizando(false);
    }
  }

  async function crear() {
    if (!borrador) return;
    if (!borrador.cliente.nombre) {
      toast.error("Falta el nombre del cliente en el pedido");
      return;
    }
    setCreando(true);
    try {
      const res = await fetch("/api/cotizaciones/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, crear: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo crear la cotización");
        return;
      }
      toast.success(`${data.numeroCotizacion} creada`);
      router.push(`/cotizaciones/${data.cotizacionId}/editar`);
    } catch {
      toast.error("Error de red al crear");
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl w-full max-w-2xl my-8 p-5 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white text-lg font-semibold">Asistente de cotización</h2>
            <p className="text-[#888] text-xs">Describe el pedido en lenguaje natural y lo convierto en cotización.</p>
          </div>
          <button onClick={onClose} className="text-[#666] hover:text-white text-xl leading-none">×</button>
        </div>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={5}
          placeholder={EJEMPLO}
          className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={analizar}
            disabled={analizando || !texto.trim()}
            className="px-4 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-medium disabled:opacity-40"
          >
            {analizando ? "Analizando..." : "Analizar"}
          </button>
          <button onClick={() => setTexto(EJEMPLO)} className="text-[#888] hover:text-white text-xs underline">
            Usar ejemplo
          </button>
          <a href="/inventario/glosario" className="ml-auto text-[#888] hover:text-[#B3985B] text-xs underline">
            Gestionar glosario
          </a>
        </div>

        {borrador && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Dato label="Cliente" valor={borrador.cliente.nombre ?? "—"} nota={borrador.cliente.match ? "existente" : "nuevo"} />
              <Dato label="Servicio" valor={borrador.extraido.servicio ?? "—"} />
              <Dato label="Fecha" valor={borrador.extraido.fechaEvento ?? "—"} />
              <Dato label="Lugar" valor={borrador.extraido.lugar ?? "—"} />
              <Dato label="Jornada" valor={`${borrador.jornada} (${borrador.horas}h)`} />
              <Dato label="Descuento equipos" valor={borrador.descuentoEspecialPct ? `${Math.round(borrador.descuentoEspecialPct * 100)}%` : "—"} />
            </div>

            <div className="border border-[#1a1a1a] rounded-lg divide-y divide-[#1a1a1a]">
              {borrador.lineas.map((l, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${l.revisar ? "bg-red-500" : "bg-emerald-500"}`} />
                  <span className="text-white flex-1 truncate">
                    {l.cantidad}× {l.descripcion}
                  </span>
                  <span className="text-[#666] w-24 text-right hidden sm:block">{TIPO_LABEL[l.tipo] ?? l.tipo}</span>
                  <span className="text-[#9ca3af] w-24 text-right">{formatCurrency(l.subtotal)}</span>
                </div>
              ))}
            </div>

            {borrador.noResueltos.length > 0 && (
              <p className="text-xs text-red-400">
                No encontré en el inventario: {borrador.noResueltos.join(", ")}. Se agregaron como líneas manuales (en rojo) para revisar. Agrégalos al glosario para que los reconozca la próxima vez.
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]">
              <div className="text-sm">
                <span className="text-[#888]">Total estimado: </span>
                <span className="text-white font-semibold">{formatCurrency(borrador.resumen.granTotal)}</span>
              </div>
              <button
                onClick={crear}
                disabled={creando}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-40"
              >
                {creando ? "Creando..." : "Crear cotización"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Dato({ label, valor, nota }: { label: string; valor: string; nota?: string }) {
  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2">
      <div className="text-[#666] text-[10px] uppercase tracking-wide">{label}</div>
      <div className="text-white text-xs mt-0.5">
        {valor}
        {nota && <span className="ml-1 text-[#B3985B]">· {nota}</span>}
      </div>
    </div>
  );
}
