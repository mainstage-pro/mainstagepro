"use client";

import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  TIPOS_ACREEDOR,
  CAMPO_ACREEDOR,
  tipoAcreedorLabel,
  type TipoAcreedor,
} from "@/lib/proveedor-evento";

/**
 * Rentas, compras y servicios que salieron sobre la marcha, con el evento ya encima. Se
 * capturan en un renglón (quién lo puso, qué, unidades, cuánto) y de ahí salen las
 * cuentas por pagar que administración revisa el lunes. Lo puede poner un proveedor, un
 * técnico o alguien de casa que lo pagó de su bolsa: a los tres se les debe igual.
 * Comparte modelo con los proveedores coordinados en preproducción (ProveedorEvento,
 * marcados con `imprevisto`), para que la deuda se vea en una sola lista.
 */

type Imprevisto = {
  id: string;
  tipoAcreedor: string;
  proveedorId: string | null;
  tecnicoId: string | null;
  personalId: string | null;
  nombreProveedor: string;
  servicioEquipo: string | null;
  unidades: number | null;
  costoAcordado: number | null;
  solicitadoPor: string | null;
  fechaSolicitud: string | null;
  notas: string | null;
  cuentaPagar: { id: string; monto: number; montoPagado: number; estado: string; fechaCompromiso: string } | null;
};

type Persona = { id: string; nombre: string; telefono: string | null };

/** El id del catálogo del que salió el registro, sea cual sea la categoría. */
const acreedorId = (f: Imprevisto): string | null => f.proveedorId ?? f.tecnicoId ?? f.personalId;

const money = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const inputCls =
  "w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]";

const aDiaISO = (v: string | null): string => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const etiquetaDia = (v: string | null): string => {
  const dia = aDiaISO(v);
  if (!dia) return "sin fecha";
  return new Date(`${dia}T12:00:00.000Z`).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

export function PanelImprevistos({ proyectoId }: { proyectoId: string }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [filas, setFilas] = useState<Imprevisto[]>([]);
  const [catalogos, setCatalogos] = useState<Record<TipoAcreedor, Persona[]>>({
    PROVEEDOR: [],
    TECNICO: [],
    PERSONAL_INTERNO: [],
  });
  const [cargando, setCargando] = useState(true);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);

  const [tipo, setTipo] = useState<TipoAcreedor>("PROVEEDOR");
  const [nuevoEnCatalogo, setNuevoEnCatalogo] = useState(false);
  const [catalogoId, setCatalogoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [servicio, setServicio] = useState("");
  const [unidades, setUnidades] = useState("1");
  const [monto, setMonto] = useState("");
  const [agregando, setAgregando] = useState(false);

  useEffect(() => {
    (async () => {
      const [ri, rp, rt, rn] = await Promise.all([
        fetch(`/api/proyectos/${proyectoId}/proveedores-evento?imprevisto=1`),
        fetch("/api/proveedores"),
        fetch("/api/tecnicos"),
        fetch("/api/rrhh/personal"),
      ]);
      if (ri.ok) setFilas((await ri.json()).proveedores ?? []);
      const proveedores: Persona[] = rp.ok ? (await rp.json()).proveedores ?? [] : [];
      const tecnicos = rt.ok ? (await rt.json()).tecnicos ?? [] : [];
      const personal = rn.ok ? (await rn.json()).personal ?? [] : [];
      setCatalogos({
        PROVEEDOR: proveedores,
        TECNICO: tecnicos.map((t: { id: string; nombre: string; celular: string | null }) => ({
          id: t.id,
          nombre: t.nombre,
          telefono: t.celular,
        })),
        PERSONAL_INTERNO: personal
          .filter((p: { activo: boolean }) => p.activo)
          .map((p: { id: string; nombre: string; telefono: string | null }) => ({
            id: p.id,
            nombre: p.nombre,
            telefono: p.telefono,
          })),
      });
      setCargando(false);
    })();
  }, [proyectoId]);

  const opcionesCatalogo = useMemo(
    () => catalogos[tipo].map((c) => ({ value: c.id, label: c.nombre })),
    [catalogos, tipo],
  );

  const vocabulario = TIPOS_ACREEDOR.find((t) => t.valor === tipo)!;

  const total = filas.reduce((s, f) => s + (f.costoAcordado ?? 0), 0);
  const sinCxP = filas.filter((f) => !f.cuentaPagar && (f.costoAcordado ?? 0) > 0);

  function cambiarTipo(nuevo: TipoAcreedor) {
    setTipo(nuevo);
    setCatalogoId("");
    setNuevoEnCatalogo(false);
  }

  async function agregar() {
    const delCatalogo = catalogos[tipo].find((c) => c.id === catalogoId);
    const nom = (nuevoEnCatalogo ? nombre : delCatalogo?.nombre ?? "").trim();
    if (!nom) return;
    setAgregando(true);
    const res = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imprevisto: true,
        tipoAcreedor: tipo,
        [CAMPO_ACREEDOR[tipo]]: nuevoEnCatalogo ? null : catalogoId || null,
        crearEnCatalogo: nuevoEnCatalogo,
        nombreProveedor: nom,
        telefonoProveedor: nuevoEnCatalogo ? celular : delCatalogo?.telefono ?? null,
        servicioEquipo: servicio || null,
        unidades: unidades || null,
        costoAcordado: monto || null,
      }),
    });
    if (res.ok) {
      const { proveedor } = await res.json();
      setFilas((prev) => [...prev, proveedor]);
      const creadoId = acreedorId(proveedor);
      if (nuevoEnCatalogo && creadoId) {
        setCatalogos((prev) => ({
          ...prev,
          [tipo]: [...prev[tipo], { id: creadoId, nombre: nom, telefono: celular || null }],
        }));
      }
      setCatalogoId(""); setNombre(""); setCelular(""); setServicio(""); setUnidades("1"); setMonto("");
      setNuevoEnCatalogo(false);
      setMostrarAlta(false);
    } else {
      toast.error((await res.json().catch(() => ({}))).error ?? "No se pudo registrar el imprevisto");
    }
    setAgregando(false);
  }

  async function editar(fila: Imprevisto, campos: Partial<Record<"servicioEquipo" | "unidades" | "costoAcordado" | "solicitadoPor" | "fechaSolicitud", string>>) {
    setGuardando(fila.id);
    const res = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${fila.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (res.ok) {
      const { proveedor } = await res.json();
      setFilas((prev) => prev.map((f) => (f.id === fila.id ? proveedor : f)));
    } else {
      toast.error("No se pudo guardar");
    }
    setGuardando(null);
  }

  async function generarCxP(fila: Imprevisto) {
    const res = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${fila.id}/cxp`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(d.error ?? "No se pudo generar la cuenta por pagar");
    setFilas((prev) => prev.map((f) => (f.id === fila.id ? { ...f, cuentaPagar: d.cuentaPagar } : f)));
    toast.success(d.creada ? "Cuenta por pagar generada" : "Cuenta por pagar actualizada");
  }

  async function generarTodas() {
    for (const f of sinCxP) await generarCxP(f);
  }

  async function eliminar(fila: Imprevisto) {
    const ok = await confirm({
      title: "Quitar imprevisto",
      message: `Se elimina el registro de ${fila.nombreProveedor}. La cuenta por pagar, si ya la generaste, se queda en finanzas.`,
      confirmText: "Quitar",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/proyectos/${proyectoId}/proveedores-evento/${fila.id}`, { method: "DELETE" });
    if (res.ok) setFilas((prev) => prev.filter((f) => f.id !== fila.id));
    else toast.error("No se pudo quitar");
  }

  if (cargando) return <div className="ms-stat-card text-gray-600 text-xs">Cargando imprevistos…</div>;

  return (
    <div className="space-y-3">
      <div className="ms-stat-card">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10.5px] text-gray-600 font-semibold uppercase tracking-[0.09em]">
              Imprevistos del evento
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Lo que se rentó o pidió sobre la marcha. De aquí salen las cuentas por pagar del lunes.
            </p>
          </div>
          <button
            onClick={() => setMostrarAlta((v) => !v)}
            className="text-sm text-[#B3985B] hover:text-white transition-colors font-medium"
          >
            {mostrarAlta ? "− Cancelar" : "+ Registrar imprevisto"}
          </button>
        </div>

        {mostrarAlta && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">¿Quién lo puso?</label>
              <div className="flex gap-1.5 flex-wrap">
                {TIPOS_ACREEDOR.map((t) => (
                  <button
                    key={t.valor}
                    onClick={() => cambiarTipo(t.valor)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      tipo === t.valor
                        ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]"
                        : "border-[#333] text-gray-500 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {nuevoEnCatalogo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nombre *</label>
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={`Nombre del ${vocabulario.singular}`} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Celular</label>
                  <input value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="10 dígitos" className={inputCls} />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 block mb-1">{vocabulario.label} *</label>
                <Combobox value={catalogoId} onChange={setCatalogoId} options={opcionesCatalogo} placeholder={vocabulario.buscar} />
              </div>
            )}
            <button
              onClick={() => setNuevoEnCatalogo((v) => !v)}
              className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors"
            >
              {nuevoEnCatalogo
                ? "← Elegir uno de la lista"
                : `¿No aparece? Da de alta un ${vocabulario.singular} con nombre y celular`}
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Qué se pidió</label>
                <input value={servicio} onChange={(e) => setServicio(e.target.value)} placeholder="Ej. Bocina JBL SRX835" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Unidades</label>
                <input
                  value={unidades}
                  onChange={(e) => setUnidades(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Costo total</label>
                <input
                  value={monto}
                  onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            </div>
            <button
              disabled={agregando || (nuevoEnCatalogo ? !nombre.trim() : !catalogoId)}
              onClick={agregar}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {agregando ? "Guardando..." : "Registrar"}
            </button>
          </div>
        )}
      </div>

      {filas.length > 0 && (
        <div className="ms-table-wrapper">
          <div className="divide-y divide-[#1a1a1a]">
            {filas.map((f) => (
              <div key={f.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white font-medium">{f.nombreProveedor}</span>
                    {f.tipoAcreedor !== "PROVEEDOR" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f1f1f] text-gray-400">
                        {tipoAcreedorLabel(f.tipoAcreedor)}
                      </span>
                    )}
                    {f.cuentaPagar ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">
                        CxP {money(f.cuentaPagar.monto)} · {f.cuentaPagar.estado.toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-500">
                        sin cuenta por pagar
                      </span>
                    )}
                    {guardando === f.id && <span className="text-[10px] text-gray-600">guardando…</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(f.costoAcordado ?? 0) > 0 && (
                      <button
                        onClick={() => generarCxP(f)}
                        className="text-xs text-[#B3985B] hover:text-white transition-colors font-medium"
                      >
                        {f.cuentaPagar ? "Actualizar CxP" : "Generar CxP"}
                      </button>
                    )}
                    <button onClick={() => eliminar(f)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                      Quitar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-12 gap-2">
                  <div className="col-span-2 sm:col-span-4">
                    <label className="text-[10px] text-gray-600 block mb-0.5">Qué se pidió</label>
                    <input
                      defaultValue={f.servicioEquipo ?? ""}
                      onBlur={(e) => e.target.value !== (f.servicioEquipo ?? "") && editar(f, { servicioEquipo: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-gray-600 block mb-0.5">Unidades</label>
                    <input
                      defaultValue={f.unidades != null ? String(f.unidades) : ""}
                      onBlur={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        if (v !== (f.unidades != null ? String(f.unidades) : "")) editar(f, { unidades: v });
                      }}
                      inputMode="numeric"
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-gray-600 block mb-0.5">Costo total</label>
                    <input
                      defaultValue={f.costoAcordado != null ? String(f.costoAcordado) : ""}
                      onBlur={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, "");
                        if (v !== (f.costoAcordado != null ? String(f.costoAcordado) : "")) editar(f, { costoAcordado: v });
                      }}
                      inputMode="decimal"
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-gray-600 block mb-0.5">Lo pidió</label>
                    <input
                      defaultValue={f.solicitadoPor ?? ""}
                      onBlur={(e) => e.target.value !== (f.solicitadoPor ?? "") && editar(f, { solicitadoPor: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-gray-600 block mb-0.5">Cuándo</label>
                    <input
                      type="date"
                      defaultValue={aDiaISO(f.fechaSolicitud)}
                      onBlur={(e) => e.target.value !== aDiaISO(f.fechaSolicitud) && editar(f, { fechaSolicitud: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>

                {!acreedorId(f) && (
                  <p className="text-[11px] text-amber-600">
                    No está en ningún catálogo: regístralo para poder generarle la cuenta por pagar.
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-[#1a1a1a] flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-gray-500">
              {filas.length} {filas.length === 1 ? "imprevisto" : "imprevistos"} ·{" "}
              <span className="text-white font-semibold">{money(total)}</span>
            </p>
            {sinCxP.length > 0 && (
              <button
                onClick={generarTodas}
                className="text-xs bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Generar las {sinCxP.length} cuentas por pagar pendientes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
