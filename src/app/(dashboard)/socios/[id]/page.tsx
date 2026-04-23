"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

// ─── Types ────────────────────────────────────────────────────────────────────
type Requisito = { id: string; requisito: string; completado: boolean; notas: string | null; orden: number };
type Activo = {
  id: string; codigoInventario: string; nombre: string; marca: string | null; modelo: string | null;
  serial: string | null; categoria: string; condicion: string; valorDeclarado: number;
  precioDia: number; pctSocioOverride: number | null; pctMainstageOverride: number | null;
  activo: boolean; notas: string | null;
  _count: { rentas: number; mantenimientos: number };
};
type Renta = {
  id: string; descripcion: string; mes: number; anio: number; dias: number;
  precioDia: number; subtotal: number; pctSocio: number; pctMainstage: number;
  montoSocio: number; montoMainstage: number; notas: string | null; createdAt: string;
  activo: { nombre: string; codigoInventario: string; categoria: string };
};
type Mantenimiento = {
  id: string; tipo: string; descripcion: string; fechaEjecucion: string | null;
  costoTotal: number; costoSocio: number; costoMainstage: number; realizadoPor: string | null;
  createdAt: string; activo: { nombre: string; codigoInventario: string };
};
type Reporte = {
  id: string; mes: number; anio: number; totalEventos: number; totalDias: number;
  totalFacturado: number; totalSocio: number; totalMainstage: number;
  estado: string; pagadoEn: string | null; notas: string | null;
};
type Socio = {
  id: string; nombre: string; tipo: string; esFundador: boolean; rfc: string | null; curp: string | null;
  telefono: string | null; email: string | null; domicilio: string | null; colonia: string | null;
  ciudad: string | null; estado: string | null; cp: string | null;
  status: string; notas: string | null; pctSocio: number; pctMainstage: number;
  contratoInicio: string | null; contratoFin: string | null;
  checklist: Requisito[]; activos: Activo[]; reportes: Reporte[];
};

// ─── Types HERVAM (solo fundador) ─────────────────────────────────────────────
type HervamConfig = {
  id: string; socioId: string | null;
  valorTotalActivos: number; tasaAnualRendimiento: number; usarSumaActivos: boolean;
  modoActivo: string; porcentajeVariable: number; pisoMinimoFijo: number;
  creditoSaldoInicial: number; creditoSaldoActual: number;
  creditoCuotaMensual: number; creditoPlazoMeses: number;
  creditoFechaInicio: string | null; notas: string | null;
};
type HervamActivo = {
  id: string; nombre: string; descripcion: string | null; categoria: string;
  valorAdquisicion: number; valorActual: number; fechaAdquisicion: string | null;
  activo: boolean; notas: string | null;
};
type HervamPago = {
  id: string; mes: number; anio: number; montoFijo: number;
  utilidadMes: number | null; montoVariable: number | null; montoAcordado: number;
  montoPagado: number; estado: string; modoPago: string | null;
  notas: string | null; pagadoEn: string | null; createdAt: string;
};

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const now = new Date();

const STATUS_COLORS: Record<string, string> = {
  EN_REVISION: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
  ACTIVO: "text-green-400 bg-green-900/20 border-green-700/40",
  SUSPENDIDO: "text-orange-400 bg-orange-900/20 border-orange-700/40",
  INACTIVO: "text-gray-500 bg-gray-800/20 border-gray-700/40",
};
const STATUS_LABEL: Record<string, string> = {
  EN_REVISION: "En revisión", ACTIVO: "Activo", SUSPENDIDO: "Suspendido", INACTIVO: "Inactivo",
};
const CAT_COLORS: Record<string, string> = {
  AUDIO: "text-blue-400 bg-blue-900/20 border-blue-700/40",
  ILUMINACION: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
  VIDEO: "text-purple-400 bg-purple-900/20 border-purple-700/40",
  ESTRUCTURAS: "text-orange-400 bg-orange-900/20 border-orange-700/40",
  ACCESORIOS: "text-gray-400 bg-gray-800/20 border-gray-700/40",
  OTRO: "text-gray-500 bg-gray-800/20 border-gray-700/40",
};
const RPT_COLORS: Record<string, string> = {
  BORRADOR: "text-gray-400 bg-gray-800/20 border-gray-700/40",
  ENVIADO: "text-blue-400 bg-blue-900/20 border-blue-700/40",
  PAGADO: "text-green-400 bg-green-900/20 border-green-700/40",
};
const COND_COLORS: Record<string, string> = {
  NUEVO: "text-green-400", EXCELENTE: "text-green-400", BUENO: "text-blue-400",
  REGULAR: "text-yellow-400", REQUIERE_MANTENIMIENTO: "text-red-400",
};

// ─── Input / Select helpers ───────────────────────────────────────────────────
const DarkInput = ({ value, onChange, placeholder, type = "text", readOnly, required }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; readOnly?: boolean; required?: boolean;
}) => (
  <input type={type} value={value} readOnly={readOnly} required={required}
    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    placeholder={placeholder}
    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] disabled:opacity-50" />
);

const DarkSelect = ({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) => (
  <Combobox value={value} onChange={onChange} options={options}
    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs text-gray-500 mb-1 block">{children}</label>
);

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────
function TabPerfil({ socio, reload }: { socio: Socio; reload: () => void }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ ...socio });
  const [saving, setSaving] = useState(false);

  const f = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    await fetch(`/api/socios/${socio.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre, tipo: form.tipo, rfc: form.rfc, curp: form.curp,
        telefono: form.telefono, email: form.email, domicilio: form.domicilio,
        colonia: form.colonia, ciudad: form.ciudad, estado: form.estado, cp: form.cp,
        status: form.status, notas: form.notas, pctSocio: form.pctSocio,
        pctMainstage: form.pctMainstage, contratoInicio: form.contratoInicio, contratoFin: form.contratoFin,
      }),
    });
    setSaving(false);
    setEdit(false);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Información del socio</p>
        {edit ? (
          <div className="flex gap-3">
            <button onClick={() => { setEdit(false); setForm({ ...socio }); }}
              className="text-gray-500 hover:text-white text-sm transition-colors">Cancelar</button>
            <button onClick={save} disabled={saving}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        ) : (
          <button onClick={() => setEdit(true)}
            className="text-[#B3985B] text-xs hover:underline">Editar</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Estado */}
        <div className="col-span-2 flex items-center gap-3">
          <FieldLabel>Estado:</FieldLabel>
          {edit ? (
            <div className="w-48">
              <DarkSelect value={form.status} onChange={(v) => f("status", v)}
                options={[{ value: "EN_REVISION", label: "En revisión" }, { value: "ACTIVO", label: "Activo" }, { value: "SUSPENDIDO", label: "Suspendido" }, { value: "INACTIVO", label: "Inactivo" }]} />
            </div>
          ) : (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_COLORS[socio.status]}`}>
              {STATUS_LABEL[socio.status]}
            </span>
          )}
        </div>

        {[
          { label: "Nombre completo", key: "nombre" as const },
          { label: "Tipo", key: "tipo" as const, sel: [["FISICA","Persona Física"],["MORAL","Persona Moral"]] as [string,string][] },
          { label: "RFC", key: "rfc" as const },
          { label: "CURP", key: "curp" as const },
          { label: "Teléfono", key: "telefono" as const },
          { label: "Email", key: "email" as const },
          { label: "Domicilio", key: "domicilio" as const },
          { label: "Colonia", key: "colonia" as const },
          { label: "Ciudad", key: "ciudad" as const },
          { label: "Estado / Provincia", key: "estado" as const },
          { label: "CP", key: "cp" as const },
        ].map(({ label, key, sel }) => (
          <div key={key}>
            <FieldLabel>{label}</FieldLabel>
            {edit ? (
              sel ? (
                <DarkSelect value={(form[key] as string) || ""} onChange={(v) => f(key, v)}
                  options={sel.map(([v, l]) => ({ value: v, label: l }))} />
              ) : (
                <DarkInput value={(form[key] as string) || ""} onChange={(v) => f(key, v)} />
              )
            ) : (
              <p className="text-sm text-white">{(socio[key] as string) || <span className="text-[#555]">—</span>}</p>
            )}
          </div>
        ))}

        {/* Split */}
        <div>
          <FieldLabel>% Socio</FieldLabel>
          {edit ? (
            <DarkInput type="number" value={String(form.pctSocio)}
              onChange={(v) => { f("pctSocio", parseFloat(v)); f("pctMainstage", 100 - parseFloat(v)); }} />
          ) : <p className="text-sm text-white font-semibold">{socio.pctSocio}%</p>}
        </div>
        <div>
          <FieldLabel>% Mainstage (fee)</FieldLabel>
          {edit ? (
            <DarkInput type="number" value={String(form.pctMainstage)}
              onChange={(v) => { f("pctMainstage", parseFloat(v)); f("pctSocio", 100 - parseFloat(v)); }} />
          ) : <p className="text-sm text-white font-semibold">{socio.pctMainstage}%</p>}
        </div>

        {/* Contrato */}
        <div>
          <FieldLabel>Inicio de contrato</FieldLabel>
          {edit ? (
            <DarkInput type="date" value={form.contratoInicio ? form.contratoInicio.split("T")[0] : ""}
              onChange={(v) => f("contratoInicio", v)} />
          ) : <p className="text-sm text-white">{socio.contratoInicio ? (() => { const iso = typeof socio.contratoInicio === "string" ? socio.contratoInicio : (socio.contratoInicio as Date).toISOString(); const [y, m, d] = iso.substring(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-MX"); })() : "—"}</p>}
        </div>
        <div>
          <FieldLabel>Vencimiento de contrato</FieldLabel>
          {edit ? (
            <DarkInput type="date" value={form.contratoFin ? form.contratoFin.split("T")[0] : ""}
              onChange={(v) => f("contratoFin", v)} />
          ) : (
            <p className={`text-sm font-medium ${
              socio.contratoFin && (new Date(socio.contratoFin).getTime() - Date.now()) / 86400000 < 30
                ? "text-red-400" : "text-white"
            }`}>
              {socio.contratoFin ? (() => { const iso = typeof socio.contratoFin === "string" ? socio.contratoFin : (socio.contratoFin as Date).toISOString(); const [y, m, d] = iso.substring(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-MX"); })() : "—"}
            </p>
          )}
        </div>

        <div className="col-span-2">
          <FieldLabel>Notas internas</FieldLabel>
          {edit ? (
            <textarea value={form.notas || ""} onChange={(e) => f("notas", e.target.value)} rows={3}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
          ) : <p className="text-sm text-[#6b7280]">{socio.notas || <span className="text-[#555]">Sin notas</span>}</p>}
        </div>
      </div>

      {/* Checklist */}
      <div>
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Requisitos de ingreso</p>
        <div className="space-y-2">
          {socio.checklist.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
              <input type="checkbox" checked={r.completado}
                onChange={async (e) => {
                  await fetch(`/api/socios/${socio.id}/requisitos`, {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: r.id, completado: e.target.checked }),
                  });
                  reload();
                }}
                className="w-4 h-4 accent-[#B3985B]" />
              <span className={`text-sm flex-1 ${r.completado ? "line-through text-[#555]" : "text-white"}`}>
                {r.requisito}
              </span>
              {r.completado && <span className="text-[10px] text-green-400 font-semibold">✓</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-[#6b7280]">
            {socio.checklist.filter((r) => r.completado).length} de {socio.checklist.length} completados
          </span>
          {socio.checklist.length > 0 && socio.checklist.every((r) => r.completado) && (
            <span className="text-[10px] text-green-400 font-semibold border border-green-700/40 bg-green-900/20 px-2 py-0.5 rounded">
              Listo para activar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Activos ─────────────────────────────────────────────────────────────
function TabActivos({ socio, activos, reload }: { socio: Socio; activos: Activo[]; reload: () => void }) {
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const EMPTY_A = { nombre: "", marca: "", modelo: "", serial: "", categoria: "AUDIO", condicion: "BUENO", valorDeclarado: "", precioDia: "", pctSocioOverride: "", pctMainstageOverride: "", notas: "" };
  const [form, setForm] = useState(EMPTY_A);
  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editId ? `/api/socios/${socio.id}/activos/${editId}` : `/api/socios/${socio.id}/activos`;
    await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm(EMPTY_A); setShowForm(false); setEditId(null); setSaving(false); reload();
  };

  const eliminar = async (id: string) => {
    if (!await confirm({ message: "¿Dar de baja este activo?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/socios/${socio.id}/activos/${id}`, { method: "DELETE" });
    reload();
  };

  const editar = (a: Activo) => {
    setForm({ nombre: a.nombre, marca: a.marca || "", modelo: a.modelo || "", serial: a.serial || "",
      categoria: a.categoria, condicion: a.condicion, valorDeclarado: String(a.valorDeclarado),
      precioDia: String(a.precioDia), notas: a.notas || "",
      pctSocioOverride: a.pctSocioOverride !== null ? String(a.pctSocioOverride) : "",
      pctMainstageOverride: a.pctMainstageOverride !== null ? String(a.pctMainstageOverride) : "",
    });
    setEditId(a.id); setShowForm(true);
  };

  const totalValor = activos.reduce((s, a) => s + a.valorDeclarado, 0);
  const totalDia = activos.reduce((s, a) => s + a.precioDia, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
          Equipos — {activos.length} registrados
        </p>
        {!showForm && (
          <button onClick={() => { setForm(EMPTY_A); setEditId(null); setShowForm(true); }}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors">
            + Agregar equipo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={guardar} className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <p className="col-span-3 text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
            {editId ? "Editar equipo" : "Nuevo equipo"}
          </p>
          {[
            { label: "Nombre *", key: "nombre", span: 2 },
            { label: "Categoría", key: "categoria", sel: ["AUDIO","ILUMINACION","VIDEO","ESTRUCTURAS","ACCESORIOS","OTRO"] },
            { label: "Marca", key: "marca" },
            { label: "Modelo", key: "modelo" },
            { label: "No. Serie", key: "serial" },
            { label: "Condición", key: "condicion", sel: ["NUEVO","EXCELENTE","BUENO","REGULAR","REQUIERE_MANTENIMIENTO"] },
            { label: "Valor declarado ($)", key: "valorDeclarado", type: "number" },
            { label: "Precio / día ($)", key: "precioDia", type: "number" },
            { label: "% Socio override", key: "pctSocioOverride", type: "number" },
            { label: "% Mainstage override", key: "pctMainstageOverride", type: "number" },
          ].map(({ label, key, sel, type, span }) => (
            <div key={key} className={span ? `col-span-${span}` : ""}>
              <FieldLabel>{label}</FieldLabel>
              {sel ? (
                <DarkSelect value={(form as Record<string,string>)[key]} onChange={(v) => f(key, v)}
                  options={sel.map((v) => ({ value: v, label: v }))} />
              ) : (
                <DarkInput value={(form as Record<string,string>)[key]} type={type || "text"}
                  onChange={(v) => f(key, v)}
                  placeholder={key.includes("Override") ? `Default: ${key === "pctSocioOverride" ? socio.pctSocio : socio.pctMainstage}%` : ""} />
              )}
            </div>
          ))}
          <div className="col-span-3">
            <FieldLabel>Notas</FieldLabel>
            <DarkInput value={form.notas} onChange={(v) => f("notas", v)} />
          </div>
          <div className="col-span-3 flex items-center gap-3">
            <button type="submit" disabled={saving || !form.nombre.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : editId ? "Actualizar" : "Agregar"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
              className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
          </div>
        </form>
      )}

      {activos.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-sm">No hay equipos registrados aún</div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Código","Equipo","Cat.","Condición","Valor declarado","Precio/día","Split","Rentas",""].map((h) => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {activos.map((a) => {
                const pS = a.pctSocioOverride ?? socio.pctSocio;
                const pM = a.pctMainstageOverride ?? socio.pctMainstage;
                return (
                  <tr key={a.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-[#555]">{a.codigoInventario}</td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{a.nombre}</p>
                      {(a.marca || a.modelo) && (
                        <p className="text-[#555] text-[10px]">{[a.marca, a.modelo].filter(Boolean).join(" · ")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${CAT_COLORS[a.categoria] || "text-gray-500 bg-gray-800/20 border-gray-700/40"}`}>
                        {a.categoria}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs font-semibold ${COND_COLORS[a.condicion]}`}>{a.condicion}</td>
                    <td className="px-4 py-3 text-[#6b7280] text-sm">{fmt(a.valorDeclarado)}</td>
                    <td className="px-4 py-3 text-white text-sm font-semibold">{fmt(a.precioDia)}</td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs">
                      {pS}% / {pM}%
                      {a.pctSocioOverride !== null && <span className="ml-1 text-[#B3985B]">*</span>}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-sm text-center">{a._count.rentas}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => editar(a)} className="text-[#B3985B] text-xs hover:underline">Editar</button>
                        <button onClick={() => eliminar(a.id)} className="text-gray-600 text-xs hover:text-red-400 transition-colors">Baja</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-[#2a2a2a]">
              <tr>
                <td colSpan={4} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#555] font-semibold">Totales</td>
                <td className="px-4 py-2.5 text-white font-bold text-sm">{fmt(totalValor)}</td>
                <td className="px-4 py-2.5 text-white font-bold text-sm">{fmt(totalDia)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Rentas ──────────────────────────────────────────────────────────────
function TabRentas({ socio, activos, reload }: { socio: Socio; activos: Activo[]; reload: () => void }) {
  const confirm = useConfirm();
  const [rentas, setRentas] = useState<Renta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filMes, setFilMes] = useState(now.getMonth() + 1);
  const [filAnio, setFilAnio] = useState(now.getFullYear());
  const EMPTY_R = { activoId: activos[0]?.id || "", descripcion: "", mes: now.getMonth() + 1, anio: now.getFullYear(), dias: 1, fechaInicio: "", fechaFin: "", notas: "" };
  const [form, setForm] = useState(EMPTY_R);

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/socios/${socio.id}/rentas?mes=${filMes}&anio=${filAnio}`, { cache: "no-store" });
    const d = await r.json();
    setRentas(d.rentas || []);
    setLoading(false);
  }, [socio.id, filMes, filAnio]);

  useEffect(() => { cargar(); }, [cargar]);

  const selActivo = activos.find((a) => a.id === form.activoId);
  const pctS = selActivo ? (selActivo.pctSocioOverride ?? socio.pctSocio) : socio.pctSocio;
  const pctM = selActivo ? (selActivo.pctMainstageOverride ?? socio.pctMainstage) : socio.pctMainstage;
  const preview = selActivo ? {
    subtotal: selActivo.precioDia * form.dias,
    socio: (selActivo.precioDia * form.dias * pctS) / 100,
    mainstage: (selActivo.precioDia * form.dias * pctM) / 100,
  } : null;

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/socios/${socio.id}/rentas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setSaving(false); cargar();
  };

  const eliminar = async (id: string) => {
    if (!await confirm({ message: "¿Eliminar este registro?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/socios/${socio.id}/rentas/${id}`, { method: "DELETE" });
    cargar();
  };

  const totales = rentas.reduce((s, r) => ({
    subtotal: s.subtotal + r.subtotal, socio: s.socio + r.montoSocio,
    mainstage: s.mainstage + r.montoMainstage, dias: s.dias + r.dias,
  }), { subtotal: 0, socio: 0, mainstage: 0, dias: 0 });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Rentas</p>
          <Combobox
            value={String(filMes)}
            onChange={v => setFilMes(parseInt(v))}
            options={MESES.slice(1).map((m, i) => ({ value: String(i + 1), label: m }))}
            className="bg-[#0d0d0d] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]"
          />
          <Combobox
            value={String(filAnio)}
            onChange={v => setFilAnio(parseInt(v))}
            options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))}
            className="bg-[#0d0d0d] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]"
          />
        </div>
        {!showForm && activos.length > 0 && (
          <button onClick={() => setShowForm(true)}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors">
            + Registrar renta
          </button>
        )}
      </div>

      {activos.length === 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-[#6b7280] mb-4">
          Primero registra equipos en la pestaña Activos.
        </div>
      )}

      {showForm && activos.length > 0 && (
        <form onSubmit={crear} className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <p className="col-span-3 text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nueva renta</p>
          <div className="col-span-2">
            <FieldLabel>Evento / descripción *</FieldLabel>
            <DarkInput value={form.descripcion} required onChange={(v) => setForm((p) => ({ ...p, descripcion: v }))}
              placeholder="Ej. Boda García — Hotel Camino Real" />
          </div>
          <div>
            <FieldLabel>Equipo *</FieldLabel>
            <DarkSelect value={form.activoId} onChange={(v) => setForm((p) => ({ ...p, activoId: v }))}
              options={activos.map(a => ({ value: a.id, label: `${a.codigoInventario} — ${a.nombre}` }))} />
          </div>
          <div>
            <FieldLabel>Días</FieldLabel>
            <DarkInput type="number" value={String(form.dias)}
              onChange={(v) => setForm((p) => ({ ...p, dias: parseInt(v) || 1 }))} />
          </div>
          <div>
            <FieldLabel>Mes</FieldLabel>
            <DarkSelect value={String(form.mes)} onChange={(v) => setForm((p) => ({ ...p, mes: parseInt(v) }))}
              options={MESES.slice(1).map((m, i) => ({ value: String(i + 1), label: m }))} />
          </div>
          <div>
            <FieldLabel>Año</FieldLabel>
            <DarkSelect value={String(form.anio)} onChange={(v) => setForm((p) => ({ ...p, anio: parseInt(v) }))}
              options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))} />
          </div>
          {preview && (
            <div className="col-span-3 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-3 flex gap-6 text-sm">
              <div><span className="text-[#555]">Subtotal: </span><span className="text-white font-semibold">{fmt(preview.subtotal)}</span></div>
              <div><span className="text-[#555]">Socio ({pctS}%): </span><span className="text-green-400 font-semibold">{fmt(preview.socio)}</span></div>
              <div><span className="text-[#555]">Mainstage ({pctM}%): </span><span className="text-[#B3985B] font-semibold">{fmt(preview.mainstage)}</span></div>
            </div>
          )}
          <div className="col-span-3 flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : "Registrar"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600 text-sm">Cargando...</div>
      ) : rentas.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-sm">Sin rentas en {MESES[filMes]} {filAnio}</div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Evento","Equipo","Días","Precio/día","Subtotal","Socio","Fee Mainstage",""].map((h) => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {rentas.map((r) => (
                <tr key={r.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3 text-white text-sm font-medium">{r.descripcion}</td>
                  <td className="px-4 py-3 text-[#6b7280] text-xs">{r.activo.codigoInventario}<br/>{r.activo.nombre}</td>
                  <td className="px-4 py-3 text-[#6b7280] text-sm text-center">{r.dias}</td>
                  <td className="px-4 py-3 text-[#6b7280] text-sm">{fmt(r.precioDia)}</td>
                  <td className="px-4 py-3 text-white text-sm font-semibold">{fmt(r.subtotal)}</td>
                  <td className="px-4 py-3 text-green-400 text-sm font-semibold">{fmt(r.montoSocio)}</td>
                  <td className="px-4 py-3 text-[#B3985B] text-sm font-semibold">{fmt(r.montoMainstage)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => eliminar(r.id)} className="text-gray-600 text-xs hover:text-red-400 transition-colors">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-[#2a2a2a]">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#555] font-semibold">
                  {MESES[filMes]} {filAnio} · {rentas.length} eventos · {totales.dias} días
                </td>
                <td></td>
                <td className="px-4 py-2.5 text-white font-bold text-sm">{fmt(totales.subtotal)}</td>
                <td className="px-4 py-2.5 text-green-400 font-bold text-sm">{fmt(totales.socio)}</td>
                <td className="px-4 py-2.5 text-[#B3985B] font-bold text-sm">{fmt(totales.mainstage)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Reportes ────────────────────────────────────────────────────────────
function TabReportes({ socio, reload }: { socio: Socio; reload: () => void }) {
  const [genMes, setGenMes] = useState(now.getMonth() + 1);
  const [genAnio, setGenAnio] = useState(now.getFullYear());
  const [generating, setGenerating] = useState(false);

  const generar = async () => {
    setGenerating(true);
    await fetch(`/api/socios/${socio.id}/reportes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes: genMes, anio: genAnio }),
    });
    setGenerating(false);
    reload();
  };

  const cambiarEstado = async (id: string, estado: string) => {
    await fetch(`/api/socios/${socio.id}/reportes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }),
    });
    reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Reportes mensuales</p>
        <div className="flex items-center gap-2">
          <Combobox
            value={String(genMes)}
            onChange={v => setGenMes(parseInt(v))}
            options={MESES.slice(1).map((m, i) => ({ value: String(i + 1), label: m }))}
            className="bg-[#0d0d0d] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]"
          />
          <Combobox
            value={String(genAnio)}
            onChange={v => setGenAnio(parseInt(v))}
            options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))}
            className="bg-[#0d0d0d] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#B3985B]"
          />
          <button onClick={generar} disabled={generating}
            className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors">
            {generating ? "Generando..." : "Generar / Actualizar"}
          </button>
        </div>
      </div>

      {socio.reportes.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-sm">No hay reportes generados aún</div>
      ) : (
        <div className="space-y-3">
          {socio.reportes.map((r) => (
            <div key={r.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <p className="text-white font-semibold">{MESES[r.mes]} {r.anio}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${RPT_COLORS[r.estado]}`}>
                    {r.estado}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {r.estado === "BORRADOR" && (
                    <button onClick={() => cambiarEstado(r.id, "ENVIADO")}
                      className="text-xs border border-[#2a2a2a] text-[#6b7280] hover:text-white hover:border-[#B3985B] px-3 py-1.5 rounded-lg transition-colors">
                      Marcar enviado
                    </button>
                  )}
                  {r.estado === "ENVIADO" && (
                    <button onClick={() => cambiarEstado(r.id, "PAGADO")}
                      className="text-xs bg-green-900/30 border border-green-700/40 text-green-400 hover:bg-green-900/50 px-3 py-1.5 rounded-lg transition-colors">
                      Marcar pagado
                    </button>
                  )}
                  {r.estado === "PAGADO" && r.pagadoEn && (
                    <span className="text-xs text-[#555]">
                      Pagado el {new Date(r.pagadoEn).toLocaleDateString("es-MX")}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Eventos", value: r.totalEventos, fmt: false },
                  { label: "Días", value: r.totalDias, fmt: false },
                  { label: "Total facturado", value: r.totalFacturado, fmt: true, color: "text-white" },
                  { label: "Para el socio", value: r.totalSocio, fmt: true, color: "text-green-400" },
                  { label: "Fee Mainstage", value: r.totalMainstage, fmt: true, color: "text-[#B3985B]" },
                ].map(({ label, value, fmt: useFmt, color }) => (
                  <div key={label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-[#555] mb-1">{label}</p>
                    <p className={`text-base font-bold ${color || "text-white"}`}>
                      {useFmt ? fmt(value as number) : value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Mantenimiento ───────────────────────────────────────────────────────
function TabMantenimiento({ socio, activos }: { socio: Socio; activos: Activo[] }) {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const EMPTY_M = { activoId: activos[0]?.id || "", tipo: "PREVENTIVO", descripcion: "", fechaEjecucion: "", costoTotal: "", costoSocio: "0", costoMainstage: "0", realizadoPor: "" };
  const [form, setForm] = useState(EMPTY_M);
  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/socios/${socio.id}/mantenimientos`, { cache: "no-store" });
    const d = await r.json();
    setMantenimientos(d.mantenimientos || []);
    setLoading(false);
  }, [socio.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/socios/${socio.id}/mantenimientos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm(EMPTY_M); setShowForm(false); setSaving(false); cargar();
  };

  const TIPO_COLORS: Record<string, string> = {
    PREVENTIVO: "text-blue-400 bg-blue-900/20 border-blue-700/40",
    CORRECTIVO: "text-red-400 bg-red-900/20 border-red-700/40",
    INSPECCION: "text-gray-400 bg-gray-800/20 border-gray-700/40",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Mantenimiento</p>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors">
            + Registrar
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={crear} className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 mb-5 grid grid-cols-2 gap-4">
          <p className="col-span-2 text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nuevo registro</p>
          <div>
            <FieldLabel>Equipo *</FieldLabel>
            <DarkSelect value={form.activoId} onChange={(v) => f("activoId", v)}
              options={activos.map(a => ({ value: a.id, label: `${a.codigoInventario} — ${a.nombre}` }))} />
          </div>
          <div>
            <FieldLabel>Tipo</FieldLabel>
            <DarkSelect value={form.tipo} onChange={(v) => f("tipo", v)}
              options={[{ value: "PREVENTIVO", label: "Preventivo" }, { value: "CORRECTIVO", label: "Correctivo" }, { value: "INSPECCION", label: "Inspección" }]} />
          </div>
          <div className="col-span-2">
            <FieldLabel>Descripción *</FieldLabel>
            <DarkInput value={form.descripcion} required onChange={(v) => f("descripcion", v)}
              placeholder="Ej. Limpieza de conectores, calibración de amplificador" />
          </div>
          <div>
            <FieldLabel>Fecha de ejecución</FieldLabel>
            <DarkInput type="date" value={form.fechaEjecucion} onChange={(v) => f("fechaEjecucion", v)} />
          </div>
          <div>
            <FieldLabel>Realizado por</FieldLabel>
            <DarkInput value={form.realizadoPor} onChange={(v) => f("realizadoPor", v)} placeholder="Técnico o taller" />
          </div>
          <div>
            <FieldLabel>Costo total ($)</FieldLabel>
            <DarkInput type="number" value={form.costoTotal}
              onChange={(v) => { f("costoTotal", v); f("costoMainstage", v); f("costoSocio", "0"); }} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <FieldLabel>Costo Mainstage</FieldLabel>
              <DarkInput type="number" value={form.costoMainstage} onChange={(v) => f("costoMainstage", v)} />
            </div>
            <div className="flex-1">
              <FieldLabel>Costo Socio</FieldLabel>
              <DarkInput type="number" value={form.costoSocio} onChange={(v) => f("costoSocio", v)} />
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {saving ? "Guardando..." : "Registrar"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600 text-sm">Cargando...</div>
      ) : mantenimientos.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-sm">Sin registros de mantenimiento</div>
      ) : (
        <div className="space-y-2">
          {mantenimientos.map((m) => (
            <div key={m.id} className="flex items-start gap-4 px-4 py-3 bg-[#111] border border-[#1e1e1e] rounded-xl">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${TIPO_COLORS[m.tipo]}`}>
                {m.tipo}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{m.descripcion}</p>
                <p className="text-[#555] text-xs mt-0.5">
                  {m.activo.codigoInventario} — {m.activo.nombre}
                  {m.realizadoPor && ` · ${m.realizadoPor}`}
                  {m.fechaEjecucion && ` · ${(() => { const iso = typeof m.fechaEjecucion === "string" ? m.fechaEjecucion : (m.fechaEjecucion as Date).toISOString(); const [y, mo, d] = iso.substring(0, 10).split("-").map(Number); return new Date(y, mo - 1, d).toLocaleDateString("es-MX"); })()}`}
                </p>
              </div>
              {m.costoTotal > 0 && (
                <div className="text-right shrink-0">
                  <p className="text-white text-sm font-semibold">{fmt(m.costoTotal)}</p>
                  <p className="text-[#555] text-[10px]">
                    Mainstage: {fmt(m.costoMainstage)} · Socio: {fmt(m.costoSocio)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tabs específicos del Socio Fundador (HERVAM) ─────────────────────────────

const MESES_H = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const CAT_HERVAM: Record<string, string> = {
  EQUIPO: "text-blue-400 bg-blue-900/20 border-blue-700/40",
  VEHICULO: "text-purple-400 bg-purple-900/20 border-purple-700/40",
  INMUEBLE: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
  INTANGIBLE: "text-teal-400 bg-teal-900/20 border-teal-700/40",
  OTRO: "text-gray-500 bg-gray-800/20 border-gray-700/40",
};
const PAGO_COLORS: Record<string, string> = {
  PENDIENTE: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
  PARCIAL: "text-blue-400 bg-blue-900/20 border-blue-700/40",
  PAGADO: "text-green-400 bg-green-900/20 border-green-700/40",
  DIFERIDO: "text-gray-400 bg-gray-800/20 border-gray-700/40",
};

function TabCapital({ config, valorEfectivo, montoFijoMensual, pisoAbsolutoPeso }: {
  config: HervamConfig; valorEfectivo: number; montoFijoMensual: number; pisoAbsolutoPeso: number;
}) {
  const creditoPct = config.creditoSaldoInicial > 0
    ? ((config.creditoSaldoInicial - config.creditoSaldoActual) / config.creditoSaldoInicial) * 100
    : 0;

  return (
    <div className="space-y-6">
      <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Estructura de Capital · HERVAM</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Valor de activos", value: fmt(valorEfectivo), sub: config.usarSumaActivos ? "Suma de activos" : "Declarado", color: "text-white" },
          { label: "Renta fija mensual", value: fmt(montoFijoMensual), sub: `${config.tasaAnualRendimiento}% anual`, color: "text-[#B3985B]" },
          { label: "Piso mínimo", value: fmt(pisoAbsolutoPeso), sub: `${config.pisoMinimoFijo}% del fijo`, color: "text-blue-400" },
          { label: "Crédito pagado", value: `${creditoPct.toFixed(0)}%`, sub: `${fmt(config.creditoSaldoInicial - config.creditoSaldoActual)} / ${fmt(config.creditoSaldoInicial)}`, color: "text-green-400" },
        ].map(m => (
          <div key={m.label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">{m.label}</p>
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[11px] text-[#6b7280] mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Modo de cálculo</p>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              config.modoActivo === "FIJO" ? "text-blue-400 bg-blue-900/20 border-blue-700/40"
              : config.modoActivo === "VARIABLE" ? "text-purple-400 bg-purple-900/20 border-purple-700/40"
              : "text-[#B3985B] bg-[#B3985B]/10 border-[#B3985B]/30"
            }`}>{config.modoActivo}</span>
          </div>
          {config.modoActivo !== "FIJO" && (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#555]">% variable sobre utilidad</span>
                <span className="text-white font-semibold">{config.porcentajeVariable}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#555]">Piso mínimo del fijo</span>
                <span className="text-white font-semibold">{config.pisoMinimoFijo}%</span>
              </div>
            </div>
          )}
          <div className="pt-2 border-t border-[#1e1e1e] space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#555]">Tasa anual de rendimiento</span>
              <span className="text-white font-semibold">{config.tasaAnualRendimiento}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555]">Base de valuación</span>
              <span className="text-white font-semibold">{config.usarSumaActivos ? "Suma de activos" : "Valor declarado"}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
          <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Crédito personal HERVAM</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#555]">Saldo inicial</span>
              <span className="text-white font-semibold">{fmt(config.creditoSaldoInicial)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555]">Saldo actual</span>
              <span className="text-green-400 font-semibold">{fmt(config.creditoSaldoActual)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555]">Cuota mensual</span>
              <span className="text-white font-semibold">{config.creditoCuotaMensual > 0 ? fmt(config.creditoCuotaMensual) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555]">Plazo</span>
              <span className="text-white font-semibold">{config.creditoPlazoMeses} meses</span>
            </div>
            {config.creditoFechaInicio && (
              <div className="flex justify-between">
                <span className="text-[#555]">Inicio</span>
                <span className="text-white font-semibold">{(() => { const iso = typeof config.creditoFechaInicio === "string" ? config.creditoFechaInicio : (config.creditoFechaInicio as Date).toISOString(); const [y, m, d] = iso.substring(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-MX"); })()}</span>
              </div>
            )}
          </div>
          <div className="pt-2">
            <div className="w-full h-1.5 bg-[#1e1e1e] rounded-full">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${creditoPct}%` }} />
            </div>
            <p className="text-[10px] text-[#555] mt-1">{creditoPct.toFixed(1)}% liquidado</p>
          </div>
        </div>
      </div>

      {config.notas && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-xs text-[#555] mb-1">Notas</p>
          <p className="text-sm text-[#6b7280]">{config.notas}</p>
        </div>
      )}
    </div>
  );
}

function TabActivosHervam({ activos }: { activos: HervamActivo[] }) {
  const totalValorActual = activos.reduce((s, a) => s + a.valorActual, 0);
  const totalValorAdq = activos.reduce((s, a) => s + a.valorAdquisicion, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Activos declarados HERVAM · {activos.length} registros</p>
        <a href="/finanzas/hervam" className="text-xs text-[#555] hover:text-[#B3985B] transition-colors">
          Administrar en Estructura de Capital →
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">Valor de adquisición</p>
          <p className="text-xl font-bold text-white">{fmt(totalValorAdq)}</p>
        </div>
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">Valor actual declarado</p>
          <p className="text-xl font-bold text-[#B3985B]">{fmt(totalValorActual)}</p>
        </div>
      </div>

      {activos.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-sm">
          Sin activos registrados.{" "}
          <a href="/finanzas/hervam" className="text-[#B3985B] hover:underline">Agregar en Estructura de Capital</a>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Activo","Categoría","V. Adquisición","V. Actual","Fecha",""].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {activos.map(a => (
                <tr key={a.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{a.nombre}</p>
                    {a.descripcion && <p className="text-[#555] text-xs mt-0.5">{a.descripcion}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${CAT_HERVAM[a.categoria] || CAT_HERVAM.OTRO}`}>
                      {a.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] text-sm">{fmt(a.valorAdquisicion)}</td>
                  <td className="px-4 py-3 text-white text-sm font-semibold">{fmt(a.valorActual)}</td>
                  <td className="px-4 py-3 text-[#555] text-xs">
                    {a.fechaAdquisicion ? (() => { const iso = typeof a.fechaAdquisicion === "string" ? a.fechaAdquisicion : (a.fechaAdquisicion as Date).toISOString(); const [y, m, d] = iso.substring(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-MX"); })() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-[10px] ${a.activo ? "text-green-400" : "text-gray-600"}`}>
                      {a.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-[#2a2a2a]">
              <tr>
                <td colSpan={2} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#555] font-semibold">Totales</td>
                <td className="px-4 py-2.5 text-white font-bold text-sm">{fmt(totalValorAdq)}</td>
                <td className="px-4 py-2.5 text-[#B3985B] font-bold text-sm">{fmt(totalValorActual)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function TabPagosHervam({ pagos }: { pagos: HervamPago[] }) {
  const pagados = pagos.filter(p => p.estado === "PAGADO");
  const totalPagado = pagados.reduce((s, p) => s + p.montoPagado, 0);
  const totalAcordado = pagados.reduce((s, p) => s + p.montoAcordado, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Historial de pagos · HERVAM</p>
        <a href="/finanzas/hervam" className="text-xs text-[#555] hover:text-[#B3985B] transition-colors">
          Registrar en Estructura de Capital →
        </a>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Meses registrados", value: pagos.length, color: "text-white" },
          { label: "Total acordado pagado", value: fmt(totalAcordado), color: "text-[#B3985B]" },
          { label: "Total pagado efectivo", value: fmt(totalPagado), color: "text-green-400" },
        ].map(m => (
          <div key={m.label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">{m.label}</p>
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {pagos.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-sm">Sin pagos registrados aún</div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Mes","Renta fija","Variable","Acordado","Pagado","Estado","Pagado en"].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-wider text-[#555] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {pagos.map(p => (
                <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3 text-white text-sm font-semibold">{MESES_H[p.mes]} {p.anio}</td>
                  <td className="px-4 py-3 text-[#6b7280] text-sm">{fmt(p.montoFijo)}</td>
                  <td className="px-4 py-3 text-[#6b7280] text-sm">{p.montoVariable != null ? fmt(p.montoVariable) : "—"}</td>
                  <td className="px-4 py-3 text-white text-sm font-semibold">{fmt(p.montoAcordado)}</td>
                  <td className="px-4 py-3 text-green-400 text-sm font-semibold">{fmt(p.montoPagado)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${PAGO_COLORS[p.estado] || PAGO_COLORS.PENDIENTE}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#555] text-xs">
                    {p.pagadoEn ? new Date(p.pagadoEn).toLocaleDateString("es-MX") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
const TABS_STD = ["perfil", "activos", "rentas", "reportes", "mantenimiento"] as const;
const TABS_FUNDADOR = ["perfil", "capital", "activos_hervam", "pagos_hervam"] as const;
type TabStd = (typeof TABS_STD)[number];
type TabFundador = (typeof TABS_FUNDADOR)[number];
const TAB_LABEL_STD: Record<TabStd, string> = {
  perfil: "Perfil", activos: "Activos", rentas: "Rentas",
  reportes: "Reportes", mantenimiento: "Mantenimiento",
};
const TAB_LABEL_FUNDADOR: Record<TabFundador, string> = {
  perfil: "Perfil", capital: "Capital · HERVAM",
  activos_hervam: "Activos declarados", pagos_hervam: "Historial de pagos",
};

export default function SocioDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [socio, setSocio] = useState<Socio | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("perfil");
  // HERVAM data (solo fundador)
  const [hervamConfig, setHervamConfig] = useState<{ config: HervamConfig; valorEfectivo: number; montoFijoMensual: number; pisoAbsolutoPeso: number } | null>(null);
  const [hervamActivos, setHervamActivos] = useState<HervamActivo[]>([]);
  const [hervamPagos, setHervamPagos] = useState<HervamPago[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/socios/${id}`, { cache: "no-store" });
    const d = await r.json();
    const s: Socio = d.socio;
    setSocio(s || null);
    if (s?.esFundador) {
      const [cfg, act, pag] = await Promise.all([
        fetch("/api/finanzas/hervam/config").then(r => r.json()),
        fetch("/api/finanzas/hervam/activos").then(r => r.json()),
        fetch("/api/finanzas/hervam/pagos").then(r => r.json()),
      ]);
      setHervamConfig(cfg);
      setHervamActivos(act.activos || []);
      setHervamPagos((pag.pagos || []).sort((a: HervamPago, b: HervamPago) => b.anio - a.anio || b.mes - a.mes));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <div className="p-8 text-center text-gray-600 text-sm">Cargando...</div>;
  if (!socio) return <div className="p-8 text-center text-red-400 text-sm">Socio no encontrado</div>;

  const completados = socio.checklist.filter((r) => r.completado).length;
  const pendientesReporte = socio.reportes.filter((r) => r.estado !== "PAGADO").length;
  const isFundador = socio.esFundador;
  const tabs = isFundador ? TABS_FUNDADOR : TABS_STD;
  const tabLabels = isFundador ? TAB_LABEL_FUNDADOR : TAB_LABEL_STD;

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
          isFundador
            ? "bg-gradient-to-br from-[#B3985B]/30 to-[#B3985B]/10 border border-[#B3985B]/40"
            : "bg-[#1e1e1e] border border-[#262626]"
        }`}>
          <span className="text-[#B3985B] text-base font-bold">
            {socio.nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-white">{socio.nombre}</h1>
            {isFundador && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-[#B3985B] bg-[#B3985B]/10 border-[#B3985B]/30">
                Socio Fundador
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_COLORS[socio.status]}`}>
              {STATUS_LABEL[socio.status]}
            </span>
          </div>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {socio.tipo === "FISICA" ? "Persona Física" : "Persona Moral"}
            {socio.ciudad && ` · ${socio.ciudad}`}
            {socio.telefono && ` · ${socio.telefono}`}
            {socio.email && ` · ${socio.email}`}
          </p>
          <p className="text-[#555] text-xs mt-1">
            {isFundador
              ? `Estructura de Capital · HERVAM${hervamConfig ? ` · Renta fija ${fmt(hervamConfig.montoFijoMensual)}/mes` : ""}`
              : `Split: ${socio.pctSocio}% socio / ${socio.pctMainstage}% Mainstage · ${socio.activos.length} equipos · Requisitos: ${completados}/${socio.checklist.length}`
            }
          </p>
        </div>
        {!isFundador && (
          <Link href={`/socios/${socio.id}/contrato`} target="_blank"
            className="shrink-0 text-xs border border-[#2a2a2a] text-[#6b7280] hover:text-white hover:border-[#B3985B] px-3 py-2 rounded-lg transition-colors">
            Ver contrato ↗
          </Link>
        )}
        {isFundador && (
          <Link href="/finanzas/hervam"
            className="shrink-0 text-xs border border-[#B3985B]/30 text-[#B3985B] hover:bg-[#B3985B]/10 px-3 py-2 rounded-lg transition-colors">
            Estructura de Capital ↗
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1e1e1e] mb-6">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-[#B3985B] text-[#B3985B]"
                  : "border-transparent text-[#555] hover:text-white"
              }`}>
              {(tabLabels as Record<string, string>)[t]}
              {t === "activos" && socio.activos.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-[#1e1e1e] text-[#6b7280] rounded-full px-1.5 py-0.5">
                  {socio.activos.length}
                </span>
              )}
              {t === "reportes" && pendientesReporte > 0 && (
                <span className="ml-1.5 text-[10px] bg-yellow-900/20 text-yellow-400 border border-yellow-700/40 rounded-full px-1.5 py-0.5">
                  {pendientesReporte}
                </span>
              )}
              {t === "activos_hervam" && hervamActivos.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-[#1e1e1e] text-[#6b7280] rounded-full px-1.5 py-0.5">
                  {hervamActivos.length}
                </span>
              )}
              {t === "pagos_hervam" && hervamPagos.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-[#1e1e1e] text-[#6b7280] rounded-full px-1.5 py-0.5">
                  {hervamPagos.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div>
        {tab === "perfil" && <TabPerfil socio={socio} reload={cargar} />}
        {/* Tabs estándar (socios convencionales) */}
        {!isFundador && tab === "activos" && <TabActivos socio={socio} activos={socio.activos} reload={cargar} />}
        {!isFundador && tab === "rentas" && <TabRentas socio={socio} activos={socio.activos} reload={cargar} />}
        {!isFundador && tab === "reportes" && <TabReportes socio={socio} reload={cargar} />}
        {!isFundador && tab === "mantenimiento" && <TabMantenimiento socio={socio} activos={socio.activos} />}
        {/* Tabs fundador (HERVAM) */}
        {isFundador && tab === "capital" && hervamConfig && (
          <TabCapital config={hervamConfig.config} valorEfectivo={hervamConfig.valorEfectivo}
            montoFijoMensual={hervamConfig.montoFijoMensual} pisoAbsolutoPeso={hervamConfig.pisoAbsolutoPeso} />
        )}
        {isFundador && tab === "activos_hervam" && <TabActivosHervam activos={hervamActivos} />}
        {isFundador && tab === "pagos_hervam" && <TabPagosHervam pagos={hervamPagos} />}
      </div>
    </div>
  );
}
