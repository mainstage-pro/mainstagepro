"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Requisito = { id: string; requisito: string; completado: boolean; notas: string | null; orden: number };
type Activo = {
  id: string; codigoInventario: string; nombre: string; marca: string | null; modelo: string | null;
  serial: string | null; categoria: string; condicion: string; valorDeclarado: number;
  precioDia: number; pctSocioOverride: number | null; pctMainstageOverride: number | null;
  activo: boolean; notas: string | null;
  _count: { rentas: number; mantenimientos: number };
  mantenimientos: { createdAt: string; tipo: string }[];
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
  notas: string | null; createdAt: string;
  activo: { nombre: string; codigoInventario: string };
};
type Reporte = {
  id: string; mes: number; anio: number; totalEventos: number; totalDias: number;
  totalFacturado: number; totalSocio: number; totalMainstage: number;
  estado: string; pagadoEn: string | null; notas: string | null;
};
type Socio = {
  id: string; nombre: string; tipo: string; rfc: string | null; curp: string | null;
  telefono: string | null; email: string | null; domicilio: string | null; colonia: string | null;
  ciudad: string | null; estado: string | null; cp: string | null;
  status: string; notas: string | null; pctSocio: number; pctMainstage: number;
  contratoInicio: string | null; contratoFin: string | null;
  checklist: Requisito[];
  activos: Activo[];
  reportes: Reporte[];
};

// ─── Utils ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const STATUS_COLOR: Record<string, string> = {
  EN_REVISION: "bg-yellow-100 text-yellow-800",
  ACTIVO: "bg-green-100 text-green-800",
  SUSPENDIDO: "bg-orange-100 text-orange-800",
  INACTIVO: "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  EN_REVISION: "En revisión", ACTIVO: "Activo", SUSPENDIDO: "Suspendido", INACTIVO: "Inactivo",
};

const CAT_COLOR: Record<string, string> = {
  AUDIO: "bg-blue-100 text-blue-800", ILUMINACION: "bg-yellow-100 text-yellow-800",
  VIDEO: "bg-purple-100 text-purple-800", ESTRUCTURAS: "bg-orange-100 text-orange-800",
  ACCESORIOS: "bg-gray-100 text-gray-700", OTRO: "bg-gray-100 text-gray-500",
};

const COND_COLOR: Record<string, string> = {
  NUEVO: "text-green-700", EXCELENTE: "text-green-600", BUENO: "text-blue-600",
  REGULAR: "text-yellow-600", REQUIERE_MANTENIMIENTO: "text-red-600",
};

const RPT_COLOR: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-600", ENVIADO: "bg-blue-100 text-blue-700", PAGADO: "bg-green-100 text-green-700",
};

const now = new Date();

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────

function TabPerfil({ socio, reload }: { socio: Socio; reload: () => void }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ ...socio });
  const [saving, setSaving] = useState(false);

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

  const f = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Información del Socio</h3>
        {edit ? (
          <div className="flex gap-2">
            <button onClick={() => { setEdit(false); setForm({ ...socio }); }}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        ) : (
          <button onClick={() => setEdit(true)}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Editar</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Estado */}
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 block mb-1">Estado</label>
          {edit ? (
            <select value={form.status} onChange={(e) => f("status", e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white w-48">
              <option value="EN_REVISION">En revisión</option>
              <option value="ACTIVO">Activo</option>
              <option value="SUSPENDIDO">Suspendido</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          ) : (
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLOR[socio.status]}`}>
              {STATUS_LABEL[socio.status]}
            </span>
          )}
        </div>

        {[
          { label: "Nombre completo", key: "nombre" as const },
          { label: "Tipo", key: "tipo" as const, sel: [["FISICA","Persona Física"],["MORAL","Persona Moral"]] },
          { label: "RFC", key: "rfc" as const },
          { label: "CURP", key: "curp" as const },
          { label: "Teléfono", key: "telefono" as const },
          { label: "Email", key: "email" as const },
          { label: "Domicilio", key: "domicilio" as const },
          { label: "Colonia", key: "colonia" as const },
          { label: "Ciudad", key: "ciudad" as const },
          { label: "Estado/Prov.", key: "estado" as const },
          { label: "CP", key: "cp" as const },
        ].map(({ label, key, sel }) => (
          <div key={key}>
            <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
            {edit ? (
              sel ? (
                <select value={(form[key] as string) || ""} onChange={(e) => f(key, e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                  {sel.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <input value={(form[key] as string) || ""} onChange={(e) => f(key, e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              )
            ) : (
              <p className="text-sm text-gray-900">{(socio[key] as string) || <span className="text-gray-400">—</span>}</p>
            )}
          </div>
        ))}

        {/* Split */}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">% Socio</label>
          {edit ? (
            <input type="number" min="0" max="100" value={form.pctSocio}
              onChange={(e) => { f("pctSocio", parseFloat(e.target.value)); f("pctMainstage", 100 - parseFloat(e.target.value)); }}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          ) : <p className="text-sm text-gray-900 font-semibold">{socio.pctSocio}%</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">% Mainstage (fee)</label>
          {edit ? (
            <input type="number" min="0" max="100" value={form.pctMainstage}
              onChange={(e) => { f("pctMainstage", parseFloat(e.target.value)); f("pctSocio", 100 - parseFloat(e.target.value)); }}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          ) : <p className="text-sm text-gray-900 font-semibold">{socio.pctMainstage}%</p>}
        </div>

        {/* Contrato */}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Inicio de contrato</label>
          {edit ? (
            <input type="date" value={form.contratoInicio ? form.contratoInicio.split("T")[0] : ""}
              onChange={(e) => f("contratoInicio", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          ) : <p className="text-sm text-gray-900">{socio.contratoInicio ? new Date(socio.contratoInicio).toLocaleDateString("es-MX") : "—"}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Vencimiento de contrato</label>
          {edit ? (
            <input type="date" value={form.contratoFin ? form.contratoFin.split("T")[0] : ""}
              onChange={(e) => f("contratoFin", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          ) : (
            <p className={`text-sm font-medium ${
              socio.contratoFin && (new Date(socio.contratoFin).getTime() - Date.now()) / 86400000 < 30
                ? "text-red-600" : "text-gray-900"
            }`}>
              {socio.contratoFin ? new Date(socio.contratoFin).toLocaleDateString("es-MX") : "—"}
            </p>
          )}
        </div>

        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 block mb-1">Notas internas</label>
          {edit ? (
            <textarea value={form.notas || ""} onChange={(e) => f("notas", e.target.value)} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          ) : <p className="text-sm text-gray-700">{socio.notas || <span className="text-gray-400">Sin notas</span>}</p>}
        </div>
      </div>

      {/* Checklist de requisitos */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Requisitos de ingreso</h3>
        <div className="space-y-2">
          {socio.checklist.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input type="checkbox" checked={r.completado} onChange={async (e) => {
                await fetch(`/api/socios/${socio.id}/requisitos`, {
                  method: "PATCH", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: r.id, completado: e.target.checked }),
                });
                reload();
              }} className="w-4 h-4 accent-indigo-600" />
              <span className={`text-sm flex-1 ${r.completado ? "line-through text-gray-400" : "text-gray-800"}`}>
                {r.requisito}
              </span>
              {r.completado && <span className="text-xs text-green-600 font-medium">✓ Completado</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {socio.checklist.filter((r) => r.completado).length} de {socio.checklist.length} requisitos completados
          </span>
          {socio.checklist.every((r) => r.completado) && socio.checklist.length > 0 && (
            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
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
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "", marca: "", modelo: "", serial: "", categoria: "AUDIO",
    condicion: "BUENO", valorDeclarado: "", precioDia: "", notas: "",
    pctSocioOverride: "", pctMainstageOverride: "",
  });

  const resetForm = () => setForm({
    nombre: "", marca: "", modelo: "", serial: "", categoria: "AUDIO",
    condicion: "BUENO", valorDeclarado: "", precioDia: "", notas: "",
    pctSocioOverride: "", pctMainstageOverride: "",
  });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editId) {
      await fetch(`/api/socios/${socio.id}/activos/${editId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      setEditId(null);
    } else {
      await fetch(`/api/socios/${socio.id}/activos`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
    }
    resetForm();
    setShowForm(false);
    setSaving(false);
    reload();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Dar de baja este activo?")) return;
    await fetch(`/api/socios/${socio.id}/activos/${id}`, { method: "DELETE" });
    reload();
  };

  const editarActivo = (a: Activo) => {
    setForm({
      nombre: a.nombre, marca: a.marca || "", modelo: a.modelo || "", serial: a.serial || "",
      categoria: a.categoria, condicion: a.condicion, valorDeclarado: String(a.valorDeclarado),
      precioDia: String(a.precioDia), notas: a.notas || "",
      pctSocioOverride: a.pctSocioOverride !== null ? String(a.pctSocioOverride) : "",
      pctMainstageOverride: a.pctMainstageOverride !== null ? String(a.pctMainstageOverride) : "",
    });
    setEditId(a.id);
    setShowForm(true);
  };

  const totalValor = activos.reduce((s, a) => s + a.valorDeclarado, 0);
  const totalPrecioDia = activos.reduce((s, a) => s + a.precioDia, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Equipos del socio</h3>
          {activos.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {activos.length} equipos · Valor total declarado: {fmt(totalValor)} · Precio/día total: {fmt(totalPrecioDia)}
            </p>
          )}
        </div>
        <button onClick={() => { resetForm(); setEditId(null); setShowForm(!showForm); }}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700">
          + Agregar Equipo
        </button>
      </div>

      {showForm && (
        <form onSubmit={guardar} className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <h4 className="font-medium text-indigo-900 text-sm mb-2">{editId ? "Editar equipo" : "Nuevo equipo"}</h4>
          </div>
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
              <label className="text-xs font-medium text-gray-700 block mb-1">{label}</label>
              {sel ? (
                <select value={(form as Record<string,string>)[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                  {sel.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : (
                <input value={(form as Record<string,string>)[key]} type={type || "text"}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder={key.includes("Override") ? `Default: ${key === "pctSocioOverride" ? socio.pctSocio : socio.pctMainstage}%` : ""} />
              )}
            </div>
          ))}
          <div className="col-span-3">
            <label className="text-xs font-medium text-gray-700 block mb-1">Notas</label>
            <input value={form.notas} onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="col-span-3 flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving || !form.nombre.trim()}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Guardando..." : editId ? "Actualizar" : "Agregar"}
            </button>
          </div>
        </form>
      )}

      {activos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay equipos registrados aún</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="text-left py-2 pr-3">Código</th>
                <th className="text-left py-2 pr-3">Equipo</th>
                <th className="text-left py-2 pr-3">Categoría</th>
                <th className="text-left py-2 pr-3">Condición</th>
                <th className="text-right py-2 pr-3">Valor declarado</th>
                <th className="text-right py-2 pr-3">Precio/día</th>
                <th className="text-center py-2 pr-3">Split efectivo</th>
                <th className="text-center py-2 pr-3">Rentas</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {activos.map((a) => {
                const pS = a.pctSocioOverride ?? socio.pctSocio;
                const pM = a.pctMainstageOverride ?? socio.pctMainstage;
                return (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 pr-3 font-mono text-xs text-gray-500">{a.codigoInventario}</td>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-gray-900">{a.nombre}</p>
                      {(a.marca || a.modelo) && (
                        <p className="text-xs text-gray-400">{[a.marca, a.modelo].filter(Boolean).join(" · ")}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLOR[a.categoria] || "bg-gray-100 text-gray-600"}`}>
                        {a.categoria}
                      </span>
                    </td>
                    <td className={`py-2.5 pr-3 text-xs font-medium ${COND_COLOR[a.condicion]}`}>{a.condicion}</td>
                    <td className="py-2.5 pr-3 text-right text-gray-700">{fmt(a.valorDeclarado)}</td>
                    <td className="py-2.5 pr-3 text-right font-medium text-gray-900">{fmt(a.precioDia)}</td>
                    <td className="py-2.5 pr-3 text-center text-xs text-gray-600">
                      {pS}% / {pM}%
                      {(a.pctSocioOverride !== null) && (
                        <span className="ml-1 text-indigo-500 text-xs">(custom)</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-center text-gray-600">{a._count.rentas}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => editarActivo(a)}
                          className="text-xs text-indigo-600 hover:underline">Editar</button>
                        <button onClick={() => eliminar(a.id)}
                          className="text-xs text-red-500 hover:underline">Baja</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr>
                <td colSpan={4} className="py-2 text-xs font-semibold text-gray-600">Totales</td>
                <td className="py-2 text-right font-bold text-gray-900">{fmt(totalValor)}</td>
                <td className="py-2 text-right font-bold text-gray-900">{fmt(totalPrecioDia)}</td>
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
  const [rentas, setRentas] = useState<Renta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filMes, setFilMes] = useState(now.getMonth() + 1);
  const [filAnio, setFilAnio] = useState(now.getFullYear());
  const [form, setForm] = useState({
    activoId: activos[0]?.id || "", descripcion: "", mes: now.getMonth() + 1,
    anio: now.getFullYear(), dias: 1, fechaInicio: "", fechaFin: "", notas: "",
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/socios/${socio.id}/rentas?mes=${filMes}&anio=${filAnio}`);
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
    await fetch(`/api/socios/${socio.id}/rentas`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setShowForm(false);
    setSaving(false);
    cargar();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este registro de renta?")) return;
    await fetch(`/api/socios/${socio.id}/rentas/${id}`, { method: "DELETE" });
    cargar();
  };

  const totales = rentas.reduce((s, r) => ({
    subtotal: s.subtotal + r.subtotal,
    socio: s.socio + r.montoSocio,
    mainstage: s.mainstage + r.montoMainstage,
    dias: s.dias + r.dias,
  }), { subtotal: 0, socio: 0, mainstage: 0, dias: 0 });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">Registro de rentas</h3>
          <select value={filMes} onChange={(e) => setFilMes(parseInt(e.target.value))}
            className="border rounded-lg px-2 py-1 text-sm bg-white">
            {MESES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={filAnio} onChange={(e) => setFilAnio(parseInt(e.target.value))}
            className="border rounded-lg px-2 py-1 text-sm bg-white">
            {[2024,2025,2026,2027].map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700">
          + Registrar Renta
        </button>
      </div>

      {showForm && activos.length > 0 && (
        <form onSubmit={crear} className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 grid grid-cols-3 gap-3">
          <div className="col-span-3 font-medium text-indigo-900 text-sm">Nueva renta</div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-700 block mb-1">Evento / descripción *</label>
            <input value={form.descripcion} required onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ej. Boda García - Hotel Camino Real" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Equipo *</label>
            <select value={form.activoId} onChange={(e) => setForm((p) => ({ ...p, activoId: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
              {activos.map((a) => <option key={a.id} value={a.id}>{a.codigoInventario} — {a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Días</label>
            <input type="number" min="1" value={form.dias} onChange={(e) => setForm((p) => ({ ...p, dias: parseInt(e.target.value) || 1 }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Mes</label>
            <select value={form.mes} onChange={(e) => setForm((p) => ({ ...p, mes: parseInt(e.target.value) }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
              {MESES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Año</label>
            <select value={form.anio} onChange={(e) => setForm((p) => ({ ...p, anio: parseInt(e.target.value) }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
              {[2024,2025,2026,2027].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Fecha inicio</label>
            <input type="date" value={form.fechaInicio} onChange={(e) => setForm((p) => ({ ...p, fechaInicio: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Fecha fin</label>
            <input type="date" value={form.fechaFin} onChange={(e) => setForm((p) => ({ ...p, fechaFin: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          {preview && (
            <div className="col-span-3 bg-white rounded-lg p-3 border flex gap-6 text-sm">
              <div><span className="text-gray-500">Subtotal: </span><strong>{fmt(preview.subtotal)}</strong></div>
              <div><span className="text-gray-500">Socio ({pctS}%): </span><strong className="text-green-700">{fmt(preview.socio)}</strong></div>
              <div><span className="text-gray-500">Mainstage ({pctM}%): </span><strong className="text-indigo-700">{fmt(preview.mainstage)}</strong></div>
            </div>
          )}
          <div className="col-span-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50">
              {saving ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      )}

      {activos.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-4">
          Primero registra equipos en la pestaña &quot;Activos&quot;
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : rentas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Sin rentas en {MESES[filMes]} {filAnio}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="text-left py-2 pr-3">Evento</th>
                <th className="text-left py-2 pr-3">Equipo</th>
                <th className="text-center py-2 pr-3">Días</th>
                <th className="text-right py-2 pr-3">Precio/día</th>
                <th className="text-right py-2 pr-3">Subtotal</th>
                <th className="text-right py-2 pr-3">Monto socio</th>
                <th className="text-right py-2 pr-3">Fee Mainstage</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rentas.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 pr-3 font-medium text-gray-900">{r.descripcion}</td>
                  <td className="py-2.5 pr-3 text-gray-600 text-xs">{r.activo.codigoInventario} — {r.activo.nombre}</td>
                  <td className="py-2.5 pr-3 text-center text-gray-700">{r.dias}</td>
                  <td className="py-2.5 pr-3 text-right text-gray-700">{fmt(r.precioDia)}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">{fmt(r.subtotal)}</td>
                  <td className="py-2.5 pr-3 text-right text-green-700 font-semibold">{fmt(r.montoSocio)}</td>
                  <td className="py-2.5 pr-3 text-right text-indigo-700 font-semibold">{fmt(r.montoMainstage)}</td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => eliminar(r.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr>
                <td colSpan={3} className="py-2 text-xs font-semibold text-gray-600">
                  Total {MESES[filMes]} {filAnio} · {rentas.length} eventos · {totales.dias} días
                </td>
                <td></td>
                <td className="py-2 text-right font-bold text-gray-900">{fmt(totales.subtotal)}</td>
                <td className="py-2 text-right font-bold text-green-700">{fmt(totales.socio)}</td>
                <td className="py-2 text-right font-bold text-indigo-700">{fmt(totales.mainstage)}</td>
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Reportes mensuales</h3>
        <div className="flex items-center gap-2">
          <select value={genMes} onChange={(e) => setGenMes(parseInt(e.target.value))}
            className="border rounded-lg px-2 py-1.5 text-sm bg-white">
            {MESES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={genAnio} onChange={(e) => setGenAnio(parseInt(e.target.value))}
            className="border rounded-lg px-2 py-1.5 text-sm bg-white">
            {[2024,2025,2026,2027].map((y) => <option key={y}>{y}</option>)}
          </select>
          <button onClick={generar} disabled={generating}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
            {generating ? "Generando..." : "Generar / Actualizar Reporte"}
          </button>
        </div>
      </div>

      {socio.reportes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay reportes generados aún</div>
      ) : (
        <div className="grid gap-3">
          {socio.reportes.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-gray-900">{MESES[r.mes]} {r.anio}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RPT_COLOR[r.estado]}`}>
                    {r.estado}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {r.estado === "BORRADOR" && (
                    <button onClick={() => cambiarEstado(r.id, "ENVIADO")}
                      className="text-xs px-3 py-1.5 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50">
                      Marcar enviado
                    </button>
                  )}
                  {r.estado === "ENVIADO" && (
                    <button onClick={() => cambiarEstado(r.id, "PAGADO")}
                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Marcar pagado
                    </button>
                  )}
                  {r.estado === "PAGADO" && r.pagadoEn && (
                    <span className="text-xs text-gray-500">
                      Pagado el {new Date(r.pagadoEn).toLocaleDateString("es-MX")}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-4 text-center">
                {[
                  { label: "Eventos", value: r.totalEventos, type: "count" },
                  { label: "Días rentados", value: r.totalDias, type: "count" },
                  { label: "Total facturado", value: r.totalFacturado, type: "money" },
                  { label: "Para el socio", value: r.totalSocio, type: "money", color: "text-green-700" },
                  { label: "Fee Mainstage", value: r.totalMainstage, type: "money", color: "text-indigo-700" },
                ].map(({ label, value, type, color }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-lg font-bold ${color || "text-gray-900"}`}>
                      {type === "money" ? fmt(value as number) : value}
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
  const [form, setForm] = useState({
    activoId: activos[0]?.id || "", tipo: "PREVENTIVO", descripcion: "",
    fechaEjecucion: "", costoTotal: "", costoSocio: "0", costoMainstage: "0", realizadoPor: "", notas: "",
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/socios/${socio.id}/mantenimientos`);
    const d = await r.json();
    setMantenimientos(d.mantenimientos || []);
    setLoading(false);
  }, [socio.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/socios/${socio.id}/mantenimientos`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setShowForm(false);
    setSaving(false);
    cargar();
  };

  const TIPO_COLOR: Record<string, string> = {
    PREVENTIVO: "bg-blue-100 text-blue-700",
    CORRECTIVO: "bg-red-100 text-red-700",
    INSPECCION: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Historial de mantenimiento</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700">
          + Registrar
        </button>
      </div>

      {showForm && (
        <form onSubmit={crear} className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          <div className="col-span-2 font-medium text-indigo-900 text-sm">Nuevo registro de mantenimiento</div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Equipo *</label>
            <select value={form.activoId} onChange={(e) => setForm((p) => ({ ...p, activoId: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
              {activos.map((a) => <option key={a.id} value={a.id}>{a.codigoInventario} — {a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
              <option value="PREVENTIVO">Preventivo</option>
              <option value="CORRECTIVO">Correctivo</option>
              <option value="INSPECCION">Inspección</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-700 block mb-1">Descripción *</label>
            <input required value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ej. Limpieza de conectores, calibración de amplificador" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Fecha de ejecución</label>
            <input type="date" value={form.fechaEjecucion} onChange={(e) => setForm((p) => ({ ...p, fechaEjecucion: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Realizado por</label>
            <input value={form.realizadoPor} onChange={(e) => setForm((p) => ({ ...p, realizadoPor: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Técnico o taller" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Costo total ($)</label>
            <input type="number" value={form.costoTotal} onChange={(e) => setForm((p) => ({ ...p, costoTotal: e.target.value, costoMainstage: e.target.value, costoSocio: "0" }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700 block mb-1">Costo Mainstage</label>
              <input type="number" value={form.costoMainstage} onChange={(e) => setForm((p) => ({ ...p, costoMainstage: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700 block mb-1">Costo Socio</label>
              <input type="number" value={form.costoSocio} onChange={(e) => setForm((p) => ({ ...p, costoSocio: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50">
              {saving ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Cargando...</div>
      ) : mantenimientos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Sin registros de mantenimiento</div>
      ) : (
        <div className="space-y-2">
          {mantenimientos.map((m) => (
            <div key={m.id} className="border border-gray-200 rounded-lg p-3 flex items-start gap-4">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TIPO_COLOR[m.tipo]}`}>
                {m.tipo}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{m.descripcion}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {m.activo.codigoInventario} — {m.activo.nombre}
                  {m.realizadoPor && ` · ${m.realizadoPor}`}
                  {m.fechaEjecucion && ` · ${new Date(m.fechaEjecucion).toLocaleDateString("es-MX")}`}
                </p>
              </div>
              {m.costoTotal > 0 && (
                <div className="text-right text-sm flex-shrink-0">
                  <p className="font-semibold text-gray-900">{fmt(m.costoTotal)}</p>
                  <p className="text-xs text-gray-500">
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

// ─── Página principal ─────────────────────────────────────────────────────────

const TABS = ["perfil", "activos", "rentas", "reportes", "mantenimiento", "contrato"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  perfil: "Perfil", activos: "Activos", rentas: "Rentas",
  reportes: "Reportes", mantenimiento: "Mantenimiento", contrato: "Contrato",
};

export default function SocioDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [socio, setSocio] = useState<Socio | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("perfil");

  const cargar = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/socios/${id}`);
    const d = await r.json();
    setSocio(d.socio || null);
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando socio...</div>;
  if (!socio) return <div className="p-8 text-center text-red-500">Socio no encontrado</div>;

  const completados = socio.checklist.filter((r) => r.completado).length;
  const totalReq = socio.checklist.length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-2xl flex-shrink-0">
          {socio.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{socio.nombre}</h1>
            <span className={`text-sm px-3 py-0.5 rounded-full font-medium ${STATUS_COLOR[socio.status]}`}>
              {STATUS_LABEL[socio.status]}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            {socio.tipo === "FISICA" ? "Persona Física" : "Persona Moral"}
            {socio.ciudad && <span>· {socio.ciudad}</span>}
            {socio.email && <span>· {socio.email}</span>}
            {socio.telefono && <span>· {socio.telefono}</span>}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
            <span>Split: {socio.pctSocio}% socio / {socio.pctMainstage}% Mainstage</span>
            <span>{socio.activos.length} equipos registrados</span>
            <span>Requisitos: {completados}/{totalReq}</span>
          </div>
        </div>
        <Link href={`/socios/${socio.id}/contrato`} target="_blank"
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
          Ver contrato
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}>
              {TAB_LABEL[t]}
              {t === "activos" && socio.activos.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5">{socio.activos.length}</span>
              )}
              {t === "reportes" && socio.reportes.filter((r) => r.estado !== "PAGADO").length > 0 && (
                <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-700 rounded-full px-1.5">
                  {socio.reportes.filter((r) => r.estado !== "PAGADO").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {tab === "perfil" && <TabPerfil socio={socio} reload={cargar} />}
        {tab === "activos" && <TabActivos socio={socio} activos={socio.activos} reload={cargar} />}
        {tab === "rentas" && <TabRentas socio={socio} activos={socio.activos} reload={cargar} />}
        {tab === "reportes" && <TabReportes socio={socio} reload={cargar} />}
        {tab === "mantenimiento" && <TabMantenimiento socio={socio} activos={socio.activos} />}
        {tab === "contrato" && (
          <div className="text-center py-10">
            <p className="text-gray-600 mb-4">El contrato se abre en una página dedicada para impresión.</p>
            <Link href={`/socios/${socio.id}/contrato`} target="_blank"
              className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700">
              Abrir contrato para imprimir
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
