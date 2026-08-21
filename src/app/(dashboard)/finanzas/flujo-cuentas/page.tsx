"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/cotizador";
import { Calendar, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// -- Tipos --
interface CuentaBase {
  id: string;
  concepto: string;
  monto: number;
  fechaCompromiso: string;
  estado: string;
  proyecto: { id: string; nombre: string; numeroProyecto: string } | null;
}

interface CuentaCobrar extends CuentaBase {
  montoCobrado: number;
  cliente: { id: string; nombre: string } | null;
  empresa: { id: string; nombre: string } | null;
}

interface CuentaPagar extends CuentaBase {
  montoPagado: number;
  tipoAcreedor: string;
  categoria?: { id: string; nombre: string } | null;
  proveedor: { id: string; nombre: string } | null;
  tecnico: { id: string; nombre: string } | null;
  empresa: { id: string; nombre: string } | null;
  socio: { id: string; nombre: string } | null;
}

interface FlujoItem {
  id: string;
  tipo: "ENTRADA" | "SALIDA";
  fecha: string | null;
  montoPendiente: number;
  concepto: string;
  entidad: string;
  proyectoNombre: string | null;
  categoriaClasificada: string;
  estado: string;
  originalPath: string;
}

interface GrupoFlujo {
  etiqueta: string;
  fechaInicio: string; // ISO
  entradas: number;
  salidas: number;
  neto: number;
  saldoAcumulado: number;
  items: FlujoItem[];
}

export default function FlujoCuentasPage() {
  const [cxc, setCxc] = useState<CuentaCobrar[]>([]);
  const [cxp, setCxp] = useState<CuentaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [saldoInicial, setSaldoInicial] = useState<number>(0);
  const [periodo, setPeriodo] = useState<string>("30d");
  const [agrupacion, setAgrupacion] = useState<string>("dia");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("Todas");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [rCxc, rCxp] = await Promise.all([
          fetch("/api/cuentas-cobrar", { cache: "no-store" }),
          fetch("/api/cuentas-pagar", { cache: "no-store" })
        ]);
        if (rCxc.ok) setCxc(await rCxc.json());
        if (rCxp.ok) setCxp(await rCxp.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // -- Procesamiento --
  const items = useMemo(() => {
    const list: FlujoItem[] = [];
    
    function clasificarCxP(c: CuentaPagar): string {
      if (c.categoria?.nombre) return c.categoria.nombre;
      if (c.tipoAcreedor === "TECNICO") return "Freelance";
      if (c.tipoAcreedor === "PROVEEDOR") return "Proveedores";
      if (c.tipoAcreedor === "PERSONAL_INTERNO") return "Nómina";
      if (c.tipoAcreedor === "SOCIO") return "Socios";
      return "Sin categoría";
    }

    // Entradas
    for (const c of cxc) {
      if (c.estado === "LIQUIDADO" || c.estado === "CANCELADO") continue;
      const pendiente = c.monto - (c.montoCobrado || 0);
      if (pendiente <= 0) continue;
      
      const entidad = c.empresa?.nombre || c.cliente?.nombre || "Sin entidad";
      list.push({
        id: c.id,
        tipo: "ENTRADA",
        fecha: c.fechaCompromiso ? c.fechaCompromiso.substring(0,10) : null,
        montoPendiente: pendiente,
        concepto: c.concepto,
        entidad,
        proyectoNombre: c.proyecto?.nombre || null,
        categoriaClasificada: "Cobros",
        estado: c.estado,
        originalPath: `/finanzas/cobros-pagos?cxc=${c.id}`
      });
    }

    // Salidas
    for (const c of cxp) {
      if (c.estado === "LIQUIDADO" || c.estado === "CANCELADO") continue;
      const pendiente = c.monto - (c.montoPagado || 0);
      if (pendiente <= 0) continue;
      
      const entidad = c.empresa?.nombre || c.proveedor?.nombre || c.tecnico?.nombre || c.socio?.nombre || "Sin entidad";
      list.push({
        id: c.id,
        tipo: "SALIDA",
        fecha: c.fechaCompromiso ? c.fechaCompromiso.substring(0,10) : null,
        montoPendiente: pendiente,
        concepto: c.concepto,
        entidad,
        proyectoNombre: c.proyecto?.nombre || null,
        categoriaClasificada: clasificarCxP(c),
        estado: c.estado,
        originalPath: `/finanzas/cobros-pagos?cxp=${c.id}`
      });
    }

    return list;
  }, [cxc, cxp]);

  const sinFecha = items.filter(i => !i.fecha);
  const conFecha = items.filter(i => !!i.fecha).sort((a,b) => a.fecha!.localeCompare(b.fecha!));

  // -- Filtro de periodo --
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  
  const itemsPeriodo = useMemo(() => {
    let endDate = new Date(hoy);
    
    if (periodo === "7d") endDate.setDate(hoy.getDate() + 7);
    else if (periodo === "15d") endDate.setDate(hoy.getDate() + 15);
    else if (periodo === "30d") endDate.setDate(hoy.getDate() + 30);
    else if (periodo === "60d") endDate.setDate(hoy.getDate() + 60);
    else if (periodo === "90d") endDate.setDate(hoy.getDate() + 90);
    else if (periodo === "mes") {
      endDate = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0); // fin de mes actual
    }
    else if (periodo === "mes_sig") {
      endDate = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0); // fin del mes sig
    } else {
      endDate.setFullYear(2099); // Todo
    }
    
    const endIso = endDate.toISOString().substring(0,10);
    const startIso = hoy.toISOString().substring(0,10);
    
    // Si queremos incluir vencidos, su fecha es menor a startIso. Los incluiremos siempre.
    return conFecha.filter(i => {
      return i.fecha! <= endIso;
    });
  }, [conFecha, periodo, hoy]);

  const categoriasDisponibles = useMemo(() => {
    const cats = new Set(itemsPeriodo.filter(i => i.tipo === "SALIDA").map(i => i.categoriaClasificada));
    return ["Todas", ...Array.from(cats).sort()];
  }, [itemsPeriodo]);

  const itemsFiltrados = useMemo(() => {
    if (filtroCategoria === "Todas") return itemsPeriodo;
    return itemsPeriodo.filter(i => i.tipo === "ENTRADA" || i.categoriaClasificada === filtroCategoria);
  }, [itemsPeriodo, filtroCategoria]);

  const distribucionPagos = useMemo(() => {
    const salidas = itemsFiltrados.filter(i => i.tipo === "SALIDA");
    const dist: Record<string, number> = {};
    for (const s of salidas) {
      dist[s.categoriaClasificada] = (dist[s.categoriaClasificada] || 0) + s.montoPendiente;
    }
    return Object.entries(dist).sort((a,b) => b[1] - a[1]);
  }, [itemsFiltrados]);

  // -- Agrupación y acumulado --
  const grupos = useMemo(() => {
    const map = new Map<string, GrupoFlujo>();
    
    for (const item of itemsFiltrados) {
      let key = item.fecha!;
      let etiqueta = item.fecha!;
      const d = new Date(item.fecha! + "T12:00:00Z");
      
      if (agrupacion === "semana") {
        // Lunes de esa semana
        const day = d.getUTCDay() || 7; 
        d.setUTCDate(d.getUTCDate() - day + 1);
        key = d.toISOString().substring(0,10);
        etiqueta = `Semana del ${d.getUTCDate()}/${d.getUTCMonth()+1}`;
      } else if (agrupacion === "mes") {
        key = item.fecha!.substring(0,7);
        etiqueta = d.toLocaleString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      }

      if (!map.has(key)) {
        map.set(key, { etiqueta, fechaInicio: key, entradas: 0, salidas: 0, neto: 0, saldoAcumulado: 0, items: [] });
      }
      const g = map.get(key)!;
      g.items.push(item);
      if (item.tipo === "ENTRADA") g.entradas += item.montoPendiente;
      if (item.tipo === "SALIDA") g.salidas += item.montoPendiente;
    }

    const arr = Array.from(map.values()).sort((a,b) => a.fechaInicio.localeCompare(b.fechaInicio));
    
    let saldo = saldoInicial;
    for (const g of arr) {
      g.neto = g.entradas - g.salidas;
      saldo += g.neto;
      g.saldoAcumulado = saldo;
    }
    return arr;
  }, [itemsFiltrados, agrupacion, saldoInicial]);

  // -- Totales KPI --
  const totalEntradas = itemsFiltrados.reduce((acc, i) => acc + (i.tipo === "ENTRADA" ? i.montoPendiente : 0), 0);
  const totalSalidas = itemsFiltrados.reduce((acc, i) => acc + (i.tipo === "SALIDA" ? i.montoPendiente : 0), 0);
  const flujoNeto = totalEntradas - totalSalidas;
  const saldoProyectado = saldoInicial + flujoNeto;

  const chartData = grupos.map(g => ({
    etiqueta: g.etiqueta,
    Entradas: g.entradas,
    Salidas: g.salidas,
    Saldo: g.saldoAcumulado
  }));

  // -- Detalle expandido --
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  if (loading) return <div className="p-8 text-white">Cargando cuentas...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Flujo de Cuentas</h1>
          <p className="text-gray-400 mt-1">Proyección de liquidez basada en cuentas por cobrar y pagar vigentes.</p>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-[#151515] p-4 rounded-xl border border-gray-800 flex flex-wrap gap-6 mb-8">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Saldo Inicial (Bancos/Caja)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input 
              type="number" 
              value={saldoInicial || ""}
              onChange={e => setSaldoInicial(parseFloat(e.target.value) || 0)}
              className="bg-[#202020] border border-gray-800 text-white pl-8 pr-4 py-2 rounded-lg focus:outline-none focus:border-[#B3985B] w-48"
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Periodo</label>
          <select 
            value={periodo} 
            onChange={e => setPeriodo(e.target.value)}
            className="bg-[#202020] border border-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-[#B3985B] min-w-[160px]"
          >
            <option value="7d">Próximos 7 días</option>
            <option value="15d">Próximos 15 días</option>
            <option value="30d">Próximos 30 días</option>
            <option value="60d">Próximos 60 días</option>
            <option value="90d">Próximos 90 días</option>
            <option value="mes">Mes actual</option>
            <option value="mes_sig">Mes siguiente</option>
            <option value="todo">Todo programado</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Agrupación</label>
          <select 
            value={agrupacion} 
            onChange={e => setAgrupacion(e.target.value)}
            className="bg-[#202020] border border-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-[#B3985B]"
          >
            <option value="dia">Por Día</option>
            <option value="semana">Por Semana</option>
            <option value="mes">Por Mes</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipo de cuenta (pagos)</label>
          <select 
            value={filtroCategoria} 
            onChange={e => setFiltroCategoria(e.target.value)}
            className="bg-[#202020] border border-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-[#B3985B] min-w-[160px]"
          >
            {categoriasDisponibles.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alertas */}
      {saldoProyectado < 0 && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-800/50 rounded-xl flex gap-3 text-red-200 items-center">
          <Info className="w-5 h-5 text-red-400 shrink-0" />
          <p><strong>Riesgo de Liquidez:</strong> El saldo proyectado al final del periodo seleccionado es negativo ({formatCurrency(saldoProyectado)}).</p>
            </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-[#B3985B]/20 to-transparent border border-[#B3985B]/30 rounded-xl p-6 md:col-span-2 flex flex-col justify-center">
          <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-1">Disponible para mover (Saldo Proyectado)</p>
          <p className="text-4xl font-bold text-white">{formatCurrency(saldoProyectado)}</p>
          <p className="text-gray-400 text-xs mt-2">Saldo inicial ({formatCurrency(saldoInicial)}) + Flujo neto ({formatCurrency(flujoNeto)})</p>
        </div>
        <div className="bg-[#151515] border border-gray-800 rounded-xl p-5 flex flex-col justify-center">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Cobros Proyectados</p>
          <p className="text-2xl font-bold text-green-400">+{formatCurrency(totalEntradas)}</p>
        </div>
        <div className="bg-[#151515] border border-gray-800 rounded-xl p-5 flex flex-col justify-center">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Pagos Proyectados</p>
          <p className="text-2xl font-bold text-red-400">-{formatCurrency(totalSalidas)}</p>
        </div>
      </div>

      {/* Distribución de Pagos */}
      {distribucionPagos.length > 0 && (
        <div className="bg-[#151515] border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Distribución de Pagos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {distribucionPagos.map(([cat, amount]) => (
              <div key={cat} className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-800/80">
                <p className="text-gray-400 text-[11px] uppercase truncate">{cat}</p>
                <p className="text-white font-medium text-lg mt-0.5">{formatCurrency(amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico */} {/* Gráfica */}
      {grupos.length > 0 && (
        <div className="bg-[#151515] border border-gray-800 rounded-xl p-6 mb-8 h-80">
          <h2 className="text-lg font-medium text-white mb-6">Evolución de Saldo</h2>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="etiqueta" stroke="#666" fontSize={12} tickMargin={10} />
              <YAxis yAxisId="left" stroke="#666" fontSize={12} tickFormatter={(val) => `$${val/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#151515', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                formatter={(value: any) => formatCurrency(Number(value))}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="Saldo" stroke="#B3985B" strokeWidth={3} dot={{r:4, fill:"#B3985B", strokeWidth:0}} />
              <Line yAxisId="left" type="monotone" dataKey="Entradas" stroke="#4ade80" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              <Line yAxisId="left" type="monotone" dataKey="Salidas" stroke="#f87171" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla Cronológica */}
      <div className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-[#1a1a1a]">
          <h2 className="text-lg font-medium text-white">Detalle de Flujo</h2>
        </div>
        {grupos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay movimientos proyectados en este periodo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#111] text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">Fecha / Periodo</th>
                  <th className="px-6 py-3 font-semibold text-right">Entradas</th>
                  <th className="px-6 py-3 font-semibold text-right">Salidas</th>
                  <th className="px-6 py-3 font-semibold text-right">Flujo Neto</th>
                  <th className="px-6 py-3 font-semibold text-right">Saldo Proy.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50 text-sm">
                {grupos.map((g) => (
                  <Fragment key={g.fechaInicio}>
                    <tr 
                      className="hover:bg-[#1f1f1f] cursor-pointer transition-colors"
                      onClick={() => setExpandedDate(expandedDate === g.fechaInicio ? null : g.fechaInicio)}
                    >
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        {g.etiqueta}
                      </td>
                      <td className="px-6 py-4 text-right text-green-400">{g.entradas > 0 ? formatCurrency(g.entradas) : "—"}</td>
                      <td className="px-6 py-4 text-right text-red-400">{g.salidas > 0 ? formatCurrency(g.salidas) : "—"}</td>
                      <td className={`px-6 py-4 text-right font-medium ${g.neto >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {g.neto > 0 ? "+" : ""}{formatCurrency(g.neto)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">{formatCurrency(g.saldoAcumulado)}</td>
                    </tr>
                    {expandedDate === g.fechaInicio && (
                      <tr className="bg-[#0f0f0f]">
                        <td colSpan={5} className="p-0 border-t border-gray-800/50 border-b border-gray-800/50">
                          <div className="p-6">
                            <h3 className="text-white font-medium mb-4">Movimientos del periodo</h3>
                            
                            {g.entradas > 0 && (
                              <div className="mb-6">
                                <h4 className="text-green-400 text-xs uppercase tracking-wider font-semibold mb-3">Cuentas por Cobrar</h4>
                                <div className="space-y-2">
                                  {g.items.filter(i => i.tipo === "ENTRADA").map(i => (
                                    <Link key={i.id} href={i.originalPath} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-lg hover:bg-[#222] transition-colors border border-gray-800/50">
                                      <div>
                                        <p className="text-white text-sm font-medium">{i.entidad}</p>
                                        <p className="text-gray-400 text-xs">{i.concepto} {i.proyectoNombre ? `• ${i.proyectoNombre}` : ""}</p>
                                      </div>
                                      <p className="text-green-400 font-medium">+{formatCurrency(i.montoPendiente)}</p>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}

                            {g.salidas > 0 && (
                              <div>
                                <h4 className="text-red-400 text-xs uppercase tracking-wider font-semibold mb-3">Cuentas por Pagar</h4>
                                <div className="space-y-2">
                                  {g.items.filter(i => i.tipo === "SALIDA").map(i => (
                                    <Link key={i.id} href={i.originalPath} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-lg hover:bg-[#222] transition-colors border border-gray-800/50">
                                      <div>
                                        <p className="text-white text-sm font-medium">{i.entidad}</p>
                                        <p className="text-gray-400 text-xs">{i.concepto} {i.proyectoNombre ? `• ${i.proyectoNombre}` : ""}</p>
                                      </div>
                                      <p className="text-red-400 font-medium">-{formatCurrency(i.montoPendiente)}</p>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cuentas sin fecha */}
      {sinFecha.length > 0 && (
        <div className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-800 bg-[#1a1a1a]">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-gray-400" />
              Sin fecha programada
            </h2>
            <p className="text-xs text-gray-500 mt-1">Estas cuentas no se incluyen en el flujo proyectado porque no tienen una fecha de compromiso asignada.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#1a1a1a] border border-gray-800/80 rounded-lg p-4">
                <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Por Cobrar</p>
                <p className="text-xl font-bold text-green-400">
                  {formatCurrency(sinFecha.reduce((acc, i) => acc + (i.tipo === "ENTRADA" ? i.montoPendiente : 0), 0))}
                </p>
              </div>
              <div className="bg-[#1a1a1a] border border-gray-800/80 rounded-lg p-4">
                <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Por Pagar</p>
                <p className="text-xl font-bold text-red-400">
                  {formatCurrency(sinFecha.reduce((acc, i) => acc + (i.tipo === "SALIDA" ? i.montoPendiente : 0), 0))}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              {sinFecha.slice(0, 10).map(i => (
                <Link key={i.id} href={i.originalPath} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-lg hover:bg-[#222] transition-colors border border-gray-800/50">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${i.tipo === 'ENTRADA' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {i.tipo === 'ENTRADA' ? 'Cobro' : 'Pago'}
                    </span>
                    <p className="text-white text-sm font-medium">{i.entidad}</p>
                    <p className="text-gray-400 text-xs">{i.concepto} {i.proyectoNombre ? `• ${i.proyectoNombre}` : ""}</p>
                  </div>
                  <p className={`font-medium ${i.tipo === "ENTRADA" ? "text-green-400" : "text-red-400"}`}>
                    {i.tipo === "ENTRADA" ? "+" : "-"}{formatCurrency(i.montoPendiente)}
                  </p>
                </Link>
              ))}
              {sinFecha.length > 10 && (
                <p className="text-center text-gray-500 text-sm mt-4">... y {sinFecha.length - 10} más</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
