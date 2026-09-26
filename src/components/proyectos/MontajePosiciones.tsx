"use client";

import { useEffect, useState } from "react";
import { getPerfilMontaje, soportePideAltura, ZONAS, type OpcionMontaje } from "@/lib/montaje-vocabulario";

export type Posicion = {
  id?: string;
  cantidad: number;
  funcion: string | null;
  soporte: string | null;
  zona: string | null;
  alturaM: number | null;
  notas: string | null;
};

type Props = {
  proyectoId: string;
  equipoId: string;
  cantidadTotal: number;
  categoria: string | null;
  disciplina: string | null;
  posiciones: Posicion[];
  onSaved: (posiciones: Posicion[]) => void;
};

const selectCls =
  "bg-[#141414] border border-[#252525] rounded-md px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#B3985B]/50 w-full";

function Campo({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <span className="block text-[9px] text-gray-500 uppercase tracking-wider mb-1">{label}</span>
      {children}
    </div>
  );
}

type OpcionGuardada = { id: string; tipo: string; label: string; categoria: string | null };

let cacheOpciones: Promise<OpcionGuardada[]> | null = null;

function cargarOpcionesGuardadas(recargar = false): Promise<OpcionGuardada[]> {
  if (recargar || !cacheOpciones) {
    cacheOpciones = fetch("/api/montaje-opciones")
      .then((r) => (r.ok ? r.json() : { opciones: [] }))
      .then((d) => d.opciones ?? [])
      .catch(() => []);
  }
  return cacheOpciones;
}

const OTRA = "__OTRA__";

/** Select del catálogo con escape a texto libre, opcionalmente reutilizable después. */
function SelectorMontaje({
  valor,
  opciones,
  onChange,
  guardar,
  onGuardar,
}: {
  valor: string | null;
  opciones: OpcionMontaje[];
  onChange: (v: string | null) => void;
  guardar: boolean;
  onGuardar: (v: boolean) => void;
}) {
  const [libre, setLibre] = useState(false);
  const escribiendo = libre || (!!valor && !opciones.some((o) => o.id === valor));

  if (escribiendo) {
    return (
      <div>
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="text"
            placeholder="Escribe la opción"
            value={valor ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className={selectCls}
          />
          <button
            onClick={() => { setLibre(false); onChange(null); onGuardar(false); }}
            title="Volver al catálogo"
            className="text-gray-600 hover:text-white text-xs px-1"
          >
            ×
          </button>
        </div>
        <label className="flex items-center gap-1 mt-1 text-[9px] text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={guardar}
            onChange={(e) => onGuardar(e.target.checked)}
            className="w-3 h-3 accent-[#B3985B]"
          />
          Guardar para futuros proyectos
        </label>
      </div>
    );
  }

  return (
    <select
      value={valor ?? ""}
      onChange={(e) => {
        if (e.target.value === OTRA) { setLibre(true); onChange(null); }
        else onChange(e.target.value || null);
      }}
      className={selectCls}
    >
      <option value="">— Elegir —</option>
      {opciones.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
      <option value={OTRA}>+ Otra…</option>
    </select>
  );
}

export function MontajePosiciones({ proyectoId, equipoId, cantidadTotal, categoria, disciplina, posiciones, onSaved }: Props) {
  const perfil = getPerfilMontaje(categoria, disciplina);
  const [filas, setFilas] = useState<Posicion[]>(
    posiciones.length > 0
      ? posiciones
      : [{ cantidad: cantidadTotal, funcion: null, soporte: null, zona: null, alturaM: null, notas: null }],
  );
  const [dirty, setDirty] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadas, setGuardadas] = useState<OpcionGuardada[]>([]);
  const [porGuardar, setPorGuardar] = useState<Record<string, boolean>>({});

  useEffect(() => { cargarOpcionesGuardadas().then(setGuardadas); }, []);

  const conGuardadas = (tipo: string, base: OpcionMontaje[]): OpcionMontaje[] => {
    const extra = guardadas
      .filter((o) => o.tipo === tipo && (tipo === "ZONA" || !o.categoria || o.categoria === categoria))
      .map((o) => ({ id: o.label, label: o.label }))
      .filter((o) => !base.some((b) => b.id === o.id));
    return [...base, ...extra];
  };

  const configuraciones = conGuardadas("CONFIGURACION", perfil.configuraciones);
  const soportes = conGuardadas("SOPORTE", perfil.soportes);
  const zonas = conGuardadas("ZONA", ZONAS);

  const asignadas = filas.reduce((s, f) => s + (Number(f.cantidad) || 0), 0);
  const restante = cantidadTotal - asignadas;
  // Grupal = una sola indicación que cubre todas las unidades del concepto. Es el default.
  const esGrupal = filas.length === 1;
  const filaTieneDatos = (f: Posicion) => !!(f.funcion || f.soporte || f.zona || f.alturaM || f.notas);

  const actualizar = (i: number, cambios: Partial<Posicion>) => {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...cambios } : f)));
    setDirty(true);
  };

  const agregar = () => {
    setFilas((prev) => {
      // Al salir del modo grupal la fila única representa todas las unidades.
      const base = prev.length === 1 ? [{ ...prev[0], cantidad: cantidadTotal }] : prev;
      const libres = cantidadTotal - base.reduce((s, f) => s + (Number(f.cantidad) || 0), 0);
      const nueva = { cantidad: Math.max(1, libres), funcion: null, soporte: null, zona: null, alturaM: null, notas: null };
      if (libres > 0) return [...base, nueva];
      // Sin unidades libres, el grupo nuevo se toma del más grande.
      const mayor = base.reduce((m, f, i) => ((Number(f.cantidad) || 0) > (Number(base[m].cantidad) || 0) ? i : m), 0);
      if ((Number(base[mayor].cantidad) || 0) <= 1) return [...base, nueva];
      return [...base.map((f, i) => (i === mayor ? { ...f, cantidad: f.cantidad - 1 } : f)), nueva];
    });
    setDirty(true);
  };

  const quitar = (i: number) => {
    setFilas((prev) => prev.filter((_, idx) => idx !== i));
    setPorGuardar({}); // las claves van por índice de fila y al quitar una se recorren
    setDirty(true);
  };

  // Cada grupo se abre en tantas filas de 1 como unidades tenga, conservando lo capturado.
  const desglosarPorUnidad = () => {
    setFilas((prev) => {
      const base = prev.length === 1 ? [{ ...prev[0], cantidad: cantidadTotal }] : prev;
      return base.flatMap((f) =>
        Array.from({ length: Math.max(1, Number(f.cantidad) || 1) }, () => ({ ...f, id: undefined, cantidad: 1 })),
      );
    });
    setPorGuardar({});
    setDirty(true);
  };

  const volverAGrupal = () => {
    const conDatos = filas.filter(filaTieneDatos);
    if (conDatos.length > 1 && !confirm("Se conservará solo la primera indicación y aplicará a todo el concepto. ¿Continuar?")) return;
    setFilas([{ ...(conDatos[0] ?? filas[0]), id: undefined, cantidad: cantidadTotal }]);
    setPorGuardar({});
    setDirty(true);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const nuevas = Object.entries(porGuardar)
        .filter(([, v]) => v)
        .map(([clave]) => {
          const [i, campo] = clave.split("|");
          const fila = filas[Number(i)];
          const tipo = campo === "funcion" ? "CONFIGURACION" : campo === "soporte" ? "SOPORTE" : "ZONA";
          return { tipo, label: fila?.[campo as "funcion" | "soporte" | "zona"] ?? "" };
        })
        .filter((o) => o.label.trim() !== "");

      if (nuevas.length > 0) {
        await Promise.all(
          nuevas.map((o) =>
            fetch("/api/montaje-opciones", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...o, categoria, disciplina }),
            }),
          ),
        );
        setPorGuardar({});
        setGuardadas(await cargarOpcionesGuardadas(true));
      }

      const res = await fetch(`/api/proyectos/${proyectoId}/equipos/${equipoId}/posiciones`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posiciones: esGrupal ? [{ ...filas[0], cantidad: cantidadTotal }] : filas }),
      });
      if (res.ok) {
        const d = await res.json();
        setFilas(d.posiciones);
        setDirty(false);
        onSaved(d.posiciones);
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] p-3">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <span className="text-[10px] text-[#B3985B]/70 font-bold uppercase tracking-widest">Montaje</span>
        {!esGrupal && (
          <span className={`text-[10px] font-semibold ${restante === 0 ? "text-green-500" : "text-amber-500"}`}>
            {asignadas} de {cantidadTotal} asignadas
            {restante > 0 && ` · faltan ${restante}`}
            {restante < 0 && ` · sobran ${-restante}`}
          </span>
        )}
      </div>

      {cantidadTotal > 1 && (
        <div className="flex items-center gap-1 mb-2 p-0.5 rounded-md bg-[#141414] border border-[#1f1f1f] w-fit">
          <button
            onClick={() => { if (!esGrupal) volverAGrupal(); }}
            className={`text-[10px] px-2.5 py-1 rounded transition-colors ${esGrupal ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-gray-300"}`}
          >
            Todo el concepto
          </button>
          <button
            onClick={() => { if (esGrupal) desglosarPorUnidad(); }}
            className={`text-[10px] px-2.5 py-1 rounded transition-colors ${!esGrupal ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-gray-300"}`}
          >
            Por unidad
          </button>
        </div>
      )}
      <p className="text-[10px] text-gray-600 mb-2 leading-snug">
        {!esGrupal
          ? "Cada renglón lleva su propia configuración, zona y notas. Puedes agrupar unidades subiendo su cantidad."
          : cantidadTotal > 1
            ? `Una sola indicación para las ${cantidadTotal} unidades del concepto.`
            : "Cómo se monta esta unidad."}
      </p>

      <div className="space-y-2">
        {filas.map((f, i) => {
          const pideAltura = soportePideAltura(f.soporte, categoria, disciplina);
          return (
            <div key={f.id ?? i} className="rounded-md border border-[#1a1a1a] bg-[#101010] p-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider">
                  {esGrupal
                    ? cantidadTotal > 1 ? `Todo el concepto · ×${cantidadTotal}` : "Montaje"
                    : f.cantidad === 1 ? `Unidad ${i + 1}` : `Grupo ${i + 1}`}
                </span>
                {!esGrupal && (
                  <button
                    onClick={() => quitar(i)}
                    className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-12 gap-1.5">
                {!esGrupal && (
                  <Campo label="Cantidad" className="lg:col-span-1">
                    <input
                      type="number"
                      min={1}
                      value={f.cantidad}
                      onChange={(e) => actualizar(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })}
                      className={`${selectCls} text-center`}
                    />
                  </Campo>
                )}
                <Campo label="Configuración" className={esGrupal ? "lg:col-span-5" : "lg:col-span-4"}>
                  <SelectorMontaje
                    valor={f.funcion}
                    opciones={configuraciones}
                    onChange={(v) => actualizar(i, { funcion: v })}
                    guardar={porGuardar[`${i}|funcion`] ?? false}
                    onGuardar={(v) => setPorGuardar((p) => ({ ...p, [`${i}|funcion`]: v }))}
                  />
                </Campo>
                <Campo label="Soporte" className="lg:col-span-4">
                  <SelectorMontaje
                    valor={f.soporte}
                    opciones={soportes}
                    onChange={(v) => actualizar(i, { soporte: v })}
                    guardar={porGuardar[`${i}|soporte`] ?? false}
                    onGuardar={(v) => setPorGuardar((p) => ({ ...p, [`${i}|soporte`]: v }))}
                  />
                </Campo>
                <Campo label="Zona" className={pideAltura ? "lg:col-span-2" : "lg:col-span-3"}>
                  <SelectorMontaje
                    valor={f.zona}
                    opciones={zonas}
                    onChange={(v) => actualizar(i, { zona: v })}
                    guardar={porGuardar[`${i}|zona`] ?? false}
                    onGuardar={(v) => setPorGuardar((p) => ({ ...p, [`${i}|zona`]: v }))}
                  />
                </Campo>
                {pideAltura && (
                  <Campo label="Altura m" className="lg:col-span-1">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={f.alturaM ?? ""}
                      onChange={(e) => actualizar(i, { alturaM: e.target.value === "" ? null : Number(e.target.value) })}
                      className={`${selectCls} text-center`}
                    />
                  </Campo>
                )}
                <Campo label="Notas" className="col-span-2 lg:col-span-12">
                  <input
                    type="text"
                    placeholder="Indicación para el técnico (opcional)"
                    value={f.notas ?? ""}
                    onChange={(e) => actualizar(i, { notas: e.target.value || null })}
                    className={selectCls}
                  />
                </Campo>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <button onClick={agregar} className="text-[11px] text-[#B3985B] hover:text-[#d4b56f] transition-colors">
          {esGrupal ? "+ Separar un grupo aparte" : "+ Agregar grupo"}
        </button>
        {dirty && (
          <button
            onClick={guardar}
            disabled={guardando}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-md bg-[#B3985B] text-black hover:bg-[#c9ab68] disabled:opacity-50 transition-colors"
          >
            {guardando ? "Guardando…" : "Guardar montaje"}
          </button>
        )}
      </div>
    </div>
  );
}
