"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import Link from "next/link";
import { Combobox } from "@/components/Combobox";

export default function NuevoGastoRecurrentePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    tipoMonto: "FIJO",
    montoBase: "",
    frecuencia: "MENSUAL",
    fechaInicio: new Date().toISOString().split("T")[0],
    fechaFin: "",
    diaVencimiento: "",
    proveedorId: "",
    empresaId: "",
    acreedorLibre: "",
    categoriaId: "",
    estado: "ACTIVO"
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/proveedores").then(r => r.json()),
      fetch("/api/empresas").then(r => r.json()),
      fetch("/api/categorias-financieras?tipo=GASTO").then(r => r.json())
    ]).then(([provs, emps, cats]) => {
      if(provs?.proveedores) setProveedores(provs.proveedores);
      if(emps?.empresas) setEmpresas(emps.empresas);
      if(cats?.categorias) setCategorias(cats.categorias);
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = { ...form };
      if (!payload.proveedorId) delete payload.proveedorId;
      if (!payload.empresaId) delete payload.empresaId;
      if (!payload.categoriaId) delete payload.categoriaId;
      if (!payload.fechaFin) delete payload.fechaFin;
      if (!payload.diaVencimiento) delete payload.diaVencimiento;
      if (!payload.descripcion) delete payload.descripcion;
      if (!payload.acreedorLibre) delete payload.acreedorLibre;

      const res = await fetch("/api/gastos-recurrentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear");
      }

      const data = await res.json();
      toast("Gasto recurrente creado", "success");
      router.push(`/finanzas/gastos-recurrentes/${data.id}`);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 text-white">
      <div className="flex items-center gap-4">
        <Link href="/finanzas/gastos-recurrentes" className="text-[#9ca3af] hover:text-[#B3985B] transition-colors">
          &larr; Volver
        </Link>
        <h1 className="text-2xl font-bold text-white">Nuevo Gasto Recurrente</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#111] rounded-xl shadow border border-[#222] p-6 space-y-8">
        
        {/* Info General */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider border-b border-[#222] text-[#9ca3af] pb-2 mb-4">Información General</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">Concepto <span className="text-red-500">*</span></label>
              <input required type="text" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white focus:border-[#B3985B] focus:ring-1 focus:ring-[#B3985B] outline-none" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Renta Bodega, CFE" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">Proveedor (Catálogo)</label>
              <Combobox 
                options={proveedores.map(p => ({ label: p.nombre, value: p.id }))}
                value={form.proveedorId}
                onChange={(val) => setForm({...form, proveedorId: val, empresaId: "", acreedorLibre: ""})}
                placeholder="Seleccionar..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">O Empresa (Catálogo)</label>
              <Combobox 
                options={empresas.map(e => ({ label: e.nombre, value: e.id }))}
                value={form.empresaId}
                onChange={(val) => setForm({...form, empresaId: val, proveedorId: "", acreedorLibre: ""})}
                placeholder="Seleccionar..."
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">O Acreedor Libre (Si no existe en catálogo)</label>
              <input type="text" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white focus:border-[#B3985B] focus:ring-1 focus:ring-[#B3985B] outline-none" value={form.acreedorLibre} onChange={e => setForm({...form, acreedorLibre: e.target.value, proveedorId: "", empresaId: ""})} placeholder="Nombre del acreedor" />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">Descripción / Notas</label>
              <textarea className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white focus:border-[#B3985B] focus:ring-1 focus:ring-[#B3985B] outline-none" rows={2} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}></textarea>
            </div>
          </div>
        </section>

        {/* Configuración */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider border-b border-[#222] text-[#9ca3af] pb-2 mb-4">Configuración del Gasto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">Tipo de Monto <span className="text-red-500">*</span></label>
              <select className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white focus:border-[#B3985B] outline-none" value={form.tipoMonto} onChange={e => setForm({...form, tipoMonto: e.target.value})}>
                <option value="FIJO">Fijo (Ej. Renta)</option>
                <option value="VARIABLE">Variable (Ej. CFE)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">
                {form.tipoMonto === "FIJO" ? "Monto Fijo *" : "Monto Estimado / Base"}
              </label>
              <input type="number" step="0.01" required={form.tipoMonto === "FIJO"} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white focus:border-[#B3985B] outline-none" value={form.montoBase} onChange={e => setForm({...form, montoBase: e.target.value})} placeholder="0.00" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">Frecuencia <span className="text-red-500">*</span></label>
              <select className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white focus:border-[#B3985B] outline-none" value={form.frecuencia} onChange={e => setForm({...form, frecuencia: e.target.value})}>
                <option value="MENSUAL">Mensual</option>
                <option value="BIMESTRAL">Bimestral</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="SEMESTRAL">Semestral</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">Día de Vencimiento</label>
              <input type="number" min="1" max="31" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white focus:border-[#B3985B] outline-none" value={form.diaVencimiento} onChange={e => setForm({...form, diaVencimiento: e.target.value})} placeholder="Ej. 15" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">Fecha de Inicio <span className="text-red-500">*</span></label>
              <input type="date" required className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white focus:border-[#B3985B] outline-none [color-scheme:dark]" value={form.fechaInicio} onChange={e => setForm({...form, fechaInicio: e.target.value})} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">Fecha de Fin (Opcional)</label>
              <input type="date" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white focus:border-[#B3985B] outline-none [color-scheme:dark]" value={form.fechaFin} onChange={e => setForm({...form, fechaFin: e.target.value})} />
            </div>
          </div>
        </section>

        {/* Clasificación */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider border-b border-[#222] text-[#9ca3af] pb-2 mb-4">Clasificación Automática</h2>
          <p className="text-xs text-[#9ca3af] mb-4">Los movimientos generados heredarán esta categorización.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-[#d1d5db]">Categoría Financiera</label>
              <Combobox 
                options={categorias.map(c => ({ label: c.nombre, value: c.id }))}
                value={form.categoriaId}
                onChange={(val) => setForm({...form, categoriaId: val})}
                placeholder="Seleccionar categoría..."
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-6 border-t border-[#222]">
          <Link href="/finanzas/gastos-recurrentes" className="px-5 py-2 text-sm font-medium border border-[#333] text-gray-300 rounded-lg hover:bg-[#1a1a1a] transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-semibold text-black bg-[#B3985B] rounded-lg hover:bg-[#c9a96a] disabled:opacity-50 transition-colors">
            {loading ? "Guardando..." : "Crear Gasto Recurrente"}
          </button>
        </div>
      </form>
    </div>
  );
}
