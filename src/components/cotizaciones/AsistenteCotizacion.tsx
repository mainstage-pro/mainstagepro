"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/cotizador";
import { useToast } from "@/components/Toast";

interface LineaDraft {
  tipo: string;
  descripcion: string;
  categoria: string | null;
  cantidad: number;
  dias: number;
  precioUnitario: number;
  subtotal: number;
  equipoId: string | null;
  rolTecnicoId: string | null;
  revisar: boolean;
}
interface Resumen {
  subtotalEquiposNeto: number;
  subtotalOperacion: number;
  montoDescuento: number;
  granTotal: number;
}
interface Extraido {
  clienteNombre: string | null;
  servicio: string | null;
  tipoEvento: string | null;
  fechaEvento: string | null;
  lugar: string | null;
}
interface Borrador {
  extraido: Extraido;
  horas: number;
  jornada: string;
  cliente: { match: { id: string; nombre: string } | null; nombre: string | null };
  lineas: LineaDraft[];
  noResueltos: string[];
  descuentoEspecialPct: number;
  resumen: Resumen;
}
interface Candidato {
  kind: "EQUIPO" | "ACCESORIO" | "ROL";
  equipoId: string | null;
  rolTecnicoId: string | null;
  descripcion: string;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  precio: number;
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
  const [recalculando, setRecalculando] = useState(false);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [reasignando, setReasignando] = useState<number | null>(null);
  const toast = useToast();
  const router = useRouter();

  // Empaqueta las líneas actuales para reenviarlas al servidor (rehidrata/crea).
  const payloadLineas = (b: Borrador) =>
    b.lineas.map((l) => ({
      equipoId: l.equipoId,
      rolTecnicoId: l.rolTecnicoId,
      cantidad: l.cantidad,
      descripcion: l.descripcion,
    }));

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

  // Recalcula la previa con las líneas editadas (cantidades/reasignaciones).
  const recalcular = useCallback(async (b: Borrador) => {
    setRecalculando(true);
    try {
      const res = await fetch("/api/cotizaciones/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto,
          extraido: b.extraido,
          clienteId: b.cliente.match?.id ?? null,
          lineas: payloadLineas(b),
        }),
      });
      const data = await res.json();
      if (res.ok) setBorrador(data);
    } catch {
      /* silencioso: la previa conserva el estado local */
    } finally {
      setRecalculando(false);
    }
  }, [texto]);

  function setCantidad(idx: number, cantidad: number) {
    setBorrador((prev) => {
      if (!prev) return prev;
      const lineas = prev.lineas.map((l, i) =>
        i === idx ? { ...l, cantidad: Math.max(1, Math.round(cantidad || 1)), subtotal: l.precioUnitario * Math.max(1, Math.round(cantidad || 1)) * l.dias } : l
      );
      return { ...prev, lineas };
    });
  }

  function aplicarReasignacion(idx: number, c: Candidato) {
    setBorrador((prev) => {
      if (!prev) return prev;
      const tipo =
        c.kind === "ROL" ? (c.categoria === "DJ" ? "DJ" : "OPERACION_TECNICA") : "EQUIPO_PROPIO";
      const lineas = prev.lineas.map((l, i) =>
        i === idx
          ? {
              ...l,
              tipo,
              descripcion: c.descripcion,
              categoria: c.categoria,
              equipoId: c.equipoId,
              rolTecnicoId: c.rolTecnicoId,
              precioUnitario: c.precio,
              subtotal: c.precio * l.cantidad * l.dias,
              revisar: false,
            }
          : l
      );
      const nb = { ...prev, lineas };
      recalcular(nb);
      return nb;
    });
    setReasignando(null);
  }

  function quitarLinea(idx: number) {
    setBorrador((prev) => {
      if (!prev) return prev;
      const nb = { ...prev, lineas: prev.lineas.filter((_, i) => i !== idx) };
      recalcular(nb);
      return nb;
    });
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
        body: JSON.stringify({
          texto,
          crear: true,
          extraido: borrador.extraido,
          clienteId: borrador.cliente.match?.id ?? null,
          lineas: payloadLineas(borrador),
        }),
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
                <div key={i} className="px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${l.revisar ? "bg-red-500" : "bg-emerald-500"}`} />
                    <input
                      type="number"
                      min={1}
                      value={l.cantidad}
                      onChange={(e) => setCantidad(i, Number(e.target.value))}
                      onBlur={() => recalcular(borrador)}
                      className="w-12 bg-[#111] border border-[#1a1a1a] rounded px-1 py-0.5 text-center text-white focus:outline-none focus:border-[#B3985B]/50"
                    />
                    <span className="text-white flex-1 truncate">{l.descripcion}</span>
                    <span className="text-[#666] w-20 text-right hidden sm:block">{l.categoria ?? TIPO_LABEL[l.tipo] ?? l.tipo}</span>
                    <span className="text-[#9ca3af] w-20 text-right">{formatCurrency(l.subtotal)}</span>
                    <button
                      onClick={() => setReasignando(reasignando === i ? null : i)}
                      className="text-[#888] hover:text-[#B3985B] text-[11px] underline shrink-0"
                    >
                      {reasignando === i ? "Cerrar" : "Reasignar"}
                    </button>
                    <button onClick={() => quitarLinea(i)} className="text-[#666] hover:text-red-400 text-sm leading-none shrink-0" title="Quitar">×</button>
                  </div>
                  {reasignando === i && (
                    <BuscadorReasignar
                      tipoLinea={l.rolTecnicoId ? "ROL" : "EQUIPO"}
                      onPick={(c) => aplicarReasignacion(i, c)}
                    />
                  )}
                </div>
              ))}
            </div>

            {borrador.noResueltos.length > 0 && (
              <p className="text-xs text-red-400">
                Sin resolver: {borrador.noResueltos.join(", ")}. Usa &quot;Reasignar&quot; para elegirlos del inventario, o agrégalos al glosario para que los reconozca la próxima vez.
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]">
              <div className="text-sm">
                <span className="text-[#888]">Total estimado: </span>
                <span className="text-white font-semibold">{formatCurrency(borrador.resumen.granTotal)}</span>
                {recalculando && <span className="ml-2 text-[#666] text-xs">recalculando…</span>}
              </div>
              <button
                onClick={crear}
                disabled={creando || recalculando}
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

function BuscadorReasignar({ tipoLinea, onPick }: { tipoLinea: "ROL" | "EQUIPO"; onPick: (c: Candidato) => void }) {
  const [q, setQ] = useState("");
  const [ambito, setAmbito] = useState<"" | "EQUIPO" | "ROL">(tipoLinea);
  const [resultados, setResultados] = useState<Candidato[]>([]);
  const [buscando, setBuscando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setResultados([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch("/api/cotizaciones/asistente/buscar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: v, tipo: ambito || undefined }),
        });
        const data = await res.json();
        setResultados(res.ok ? data.candidatos ?? [] : []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 250);
  }

  return (
    <div className="mt-2 ml-4 bg-[#0e0e0e] border border-[#1f1f1f] rounded-lg p-2">
      <div className="flex items-center gap-2 mb-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar equipo, accesorio o rol…"
          className="flex-1 bg-[#111] border border-[#1a1a1a] rounded px-2 py-1 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50"
        />
        <select
          value={ambito}
          onChange={(e) => setAmbito(e.target.value as "" | "EQUIPO" | "ROL")}
          className="bg-[#111] border border-[#1a1a1a] rounded px-1 py-1 text-xs text-[#aaa]"
        >
          <option value="">Todo</option>
          <option value="EQUIPO">Equipos</option>
          <option value="ROL">Roles</option>
        </select>
      </div>
      {buscando && <p className="text-[11px] text-[#666] px-1">Buscando…</p>}
      {!buscando && q.trim().length >= 2 && resultados.length === 0 && (
        <p className="text-[11px] text-[#666] px-1">Sin resultados.</p>
      )}
      <div className="max-h-48 overflow-y-auto divide-y divide-[#161616]">
        {resultados.map((c, i) => (
          <button
            key={i}
            onClick={() => onPick(c)}
            className="w-full text-left px-2 py-1.5 hover:bg-[#161616] flex items-center gap-2"
          >
            <span className="text-[10px] uppercase text-[#B3985B] w-14 shrink-0">
              {c.kind === "ROL" ? "Rol" : c.kind === "ACCESORIO" ? "Acces." : "Equipo"}
            </span>
            <span className="text-white text-xs flex-1 truncate">{c.descripcion}</span>
            {c.categoria && <span className="text-[#666] text-[10px] truncate max-w-[90px]">{c.categoria}</span>}
            {c.precio > 0 && <span className="text-[#9ca3af] text-[11px]">{formatCurrency(c.precio)}</span>}
          </button>
        ))}
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
