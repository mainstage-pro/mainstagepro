"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CatItem  { nombre: string; total: number; count: number }
interface AgingBucket { total: number; items: { id: string; nombre: string; monto: number; fecha: string }[] }
interface AgingData {
  corriente: AgingBucket; dias30: AgingBucket; dias60: AgingBucket; dias90: AgingBucket;
  totalPendiente: number;
}

interface Devengado {
  periodo: string;
  ingresos: number;
  ingresosDetalle: { id: string; cliente: string; concepto: string; monto: number; montoCobrado: number; estado: string; proyecto: string | null }[];
  costosDirectos: {
    total: number; tecnicosFreelance: number; otrosCostos: number; gastosEvento: number;
    detalleTecnicos: { nombre: string; monto: number; estado: string; proyecto: string | null }[];
    detalleOtros: { concepto: string; monto: number; tipoAcreedor: string; estado: string; proyecto: string | null }[];
    detalleEventos: { concepto: string; tipo: string; monto: number; entregado: boolean; proyecto: string | null }[];
  };
  nomina:            { total: number; detalle: { nombre: string; puesto: string; monto: number; tipoPeriodo: string; estado: string }[] };
  gastosOperativos:  { total: number; detalle: { concepto: string; monto: number; tipoAcreedor: string; estado: string }[] };
  impuestos:         { total: number; detalle: { concepto: string; monto: number; tipoAcreedor: string }[] };
  utilidadBruta: number; utilidadNeta: number;
  agingCxC: AgingData; agingCxP: AgingData;
  margenProyectos: { id: string; titulo: string; fecha: string | null; cobrado: number; costo: number; utilidad: number; margen: number }[];
}

interface Efectivo {
  periodo: string;
  ingresos: {
    total: number; conciliado: number; orphan: number;
    porCategoria: CatItem[];
    detalle: { id: string; fecha: string; concepto: string; monto: number; metodoPago: string; categoria: string; cuenta: string | null }[];
    abonosOrfanos: { monto: number; concepto: string; cliente: string; fecha: string }[];
  };
  gastos: {
    total: number; conciliado: number; orphan: number;
    porCategoria: CatItem[];
    detalle: { id: string; fecha: string; concepto: string; monto: number; metodoPago: string; categoria: string; cuenta: string | null }[];
    abonosPagoOrfanos: { monto: number; concepto: string; tipo: string; fecha: string }[];
    nominaOrfana: { monto: number; nombre: string; fecha: string | null }[];
    gastosEventoOrfanos: { concepto: string; monto: number; tipo: string; proyecto: string | null; fecha: string | null }[];
  };
  transferencias: { total: number; detalle: { concepto: string; monto: number; fecha: string; origen: string | null; destino: string | null }[] };
  otrasOperaciones: { total: number; detalle: { tipo: string; concepto: string; monto: number; fecha: string; categoria: string }[] };
  flujoNeto: number;
  tieneOrfanos: boolean; orphanCount: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX",{ style:"currency", currency:"MXN", minimumFractionDigits:0, maximumFractionDigits:0 }).format(n);
const pct = (n: number, t: number) => t === 0 ? "—" : `${((n/t)*100).toFixed(1)}%`;
const utilColor = (n: number) => n >= 0 ? "text-green-400" : "text-red-400";
const margenColor = (m: number) => m >= 30 ? "text-green-400" : m >= 15 ? "text-yellow-400" : m >= 0 ? "text-orange-400" : "text-red-400";

function parseMes(mes: string) { const [y,m]=mes.split("-").map(Number); return {year:y,month:m}; }
function navMes(mes: string, delta: number) {
  const {year,month}=parseMes(mes);
  const d=new Date(year,month-1+delta,1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function mesLabel(mes: string) {
  const {year,month}=parseMes(mes);
  return `${MESES[month-1]} ${year}`;
}
function defaultMes() {
  const d=new Date(), p=new Date(d.getFullYear(),d.getMonth()-1,1);
  return `${p.getFullYear()}-${String(p.getMonth()+1).padStart(2,"0")}`;
}

// ── Reusable UI ───────────────────────────────────────────────────────────────
function Collapsible({ title, badge, badgeColor="text-white", open, onToggle, children }: {
  title:string; badge?:string; badgeColor?:string; open:boolean; onToggle:()=>void; children:React.ReactNode;
}) {
  return (
    <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#0d0d0d] transition-colors print:pointer-events-none">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500">{title}</span>
        <div className="flex items-center gap-3">
          {badge && <span className={`text-sm font-bold ${badgeColor}`}>{badge}</span>}
          <span className={`text-gray-600 text-xs transition-transform ${open?"rotate-180":""}`}>▾</span>
        </div>
      </button>
      {open && <div className="border-t border-[#1a1a1a]">{children}</div>}
    </div>
  );
}

function CatBar({ items, total, color="#B3985B" }: { items:CatItem[]; total:number; color?:string }) {
  if (!items.length) return <p className="text-gray-600 text-xs text-center py-6">Sin datos en este período</p>;
  const max = Math.max(...items.map(i=>i.total),1);
  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.nombre}>
          <div className="flex justify-between mb-1.5">
            <span className="text-xs text-gray-400">{item.nombre}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600">{pct(item.total,total)}</span>
              <span className="text-xs font-semibold text-white">{fmt(item.total)}</span>
            </div>
          </div>
          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{width:`${(item.total/max)*100}%`,backgroundColor:color}} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AgingPanel({ data, label }: { data:AgingData; label:string }) {
  const buckets = [
    {key:"corriente",label:"Al corriente",color:"text-green-400",bg:"border-green-500/20 bg-green-950/10"},
    {key:"dias30",label:"1–30 días",color:"text-yellow-400",bg:"border-yellow-500/20 bg-yellow-950/10"},
    {key:"dias60",label:"31–60 días",color:"text-orange-400",bg:"border-orange-500/20 bg-orange-950/10"},
    {key:"dias90",label:"60+ días",color:"text-red-400",bg:"border-red-500/20 bg-red-950/10"},
  ] as const;
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {buckets.map(b => {
          const bucket = data[b.key];
          return (
            <div key={b.key} className={`border rounded-xl p-4 ${b.bg}`}>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{b.label}</p>
              <p className={`text-xl font-bold ${b.color}`}>{fmt(bucket.total)}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{bucket.items.length} {label}</p>
            </div>
          );
        })}
      </div>
      {data.totalPendiente > 0 && (
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {[...data.dias90.items,...data.dias60.items,...data.dias30.items,...data.corriente.items].map((item,i)=>{
            const dias = Math.floor((new Date().getTime()-new Date(item.fecha).getTime())/86_400_000);
            const c = dias>60?"text-red-400":dias>30?"text-orange-400":dias>0?"text-yellow-400":"text-green-400";
            return (
              <div key={item.id+i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-[#111] transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white truncate">{item.nombre}</p>
                  <p className={`text-[10px] ${c}`}>{dias<=0?"Vigente":`${dias}d vencido`}</p>
                </div>
                <span className="text-sm font-semibold text-white shrink-0 ml-3">{fmt(item.monto)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── P&L Row ────────────────────────────────────────────────────────────────────
function PLRow({ dot, label, sub, value, sign="-", large=false, highlight, children }: {
  dot:string; label:string; sub?:string; value:number; sign?:string; large?:boolean;
  highlight?:"bruta"|"neta"; children?:React.ReactNode;
}) {
  const [open,setOpen]=useState(false);
  const bg = highlight==="neta"
    ? (value>=0?"bg-green-950/30 border-t border-[#1e1e1e]":"bg-red-950/30 border-t border-[#1e1e1e]")
    : highlight==="bruta"
    ? (value>=0?"bg-green-950/20 border-t border-[#1a1a1a] border-b border-b-[#1a1a1a]":"bg-red-950/20 border-t border-[#1a1a1a]")
    : "border-b border-[#0f0f0f]";
  const valColor = sign==="+" ? "text-green-400" : (value<0?"text-red-400":"text-red-400");
  const displayColor = highlight ? utilColor(value) : valColor;
  return (
    <div className={bg}>
      <div
        className={`flex items-center justify-between px-5 py-4 ${children?"cursor-pointer hover:bg-black/10":""} transition-colors`}
        onClick={()=>children&&setOpen(v=>!v)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-1 rounded-full shrink-0 ${large?"h-12":"h-8"} ${dot}`} />
          <div className="min-w-0">
            <p className={`${large?"text-[10px] font-bold uppercase tracking-wider text-gray-300":"text-[11px] text-gray-500 uppercase tracking-wide"}`}>{label}</p>
            {sub && <p className="text-[10px] text-gray-700 mt-0.5 truncate">{sub}</p>}
          </div>
          {children && <span className={`text-gray-700 text-[10px] ml-2 transition-transform ${open?"rotate-180":""}`}>▾</span>}
        </div>
        <p className={`${large?"text-2xl":"text-lg"} font-bold tabular-nums shrink-0 ml-4 ${displayColor}`}>
          {highlight ? fmt(value) : (value===0?"—":`(${fmt(value)})`)}
        </p>
      </div>
      {open && children && <div className="px-5 pb-4 border-t border-[#1a1a1a]">{children}</div>}
    </div>
  );
}

// ── Tab: Estado de Resultados (Devengado) ─────────────────────────────────────
function TabDevengado({ mes }: { mes:string }) {
  const [data,setData]=useState<Devengado|null>(null);
  const [loading,setLoading]=useState(true);
  const [sections,setSections]=useState({ ing:false,cost:false,nom:false,gop:false,imp:false,cxc:false,cxp:false,marg:false });
  const tog = (k:keyof typeof sections)=>setSections(s=>({...s,[k]:!s[k]}));

  useEffect(()=>{
    setLoading(true); setData(null);
    fetch(`/api/finanzas/estado-resultados-devengado?mes=${mes}`)
      .then(r=>r.ok?r.json():null).then(d=>{setData(d);setLoading(false);});
  },[mes]);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin"/></div>;
  if (!data)   return <div className="text-center py-16 text-gray-600">Error al cargar datos</div>;

  return (
    <div className="space-y-4">
      {/* P&L Cascade */}
      <div className="bg-[#080808] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        {/* Ingresos */}
        <PLRow dot="bg-green-500" label="Ingresos reconocidos" sign="+"
          sub={`${data.ingresosDetalle.length} CxC con fecha compromiso en ${mesLabel(mes)}`}
          value={data.ingresos} highlight={undefined}
        >
          {data.ingresosDetalle.length>0 && (
            <div className="space-y-1 mt-3 max-h-56 overflow-y-auto">
              {data.ingresosDetalle.map(i=>(
                <div key={i.id} className="flex items-center justify-between py-1.5 hover:bg-[#111] px-2 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white truncate">{i.cliente}</p>
                    <p className="text-[10px] text-gray-600 truncate">{i.concepto}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-semibold text-white">{fmt(i.monto)}</p>
                    <p className={`text-[10px] ${i.montoCobrado>=i.monto?"text-green-400":i.montoCobrado>0?"text-yellow-400":"text-gray-600"}`}>
                      Cobrado: {fmt(i.montoCobrado)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.ingresosDetalle.length===0 && <p className="text-gray-600 text-xs mt-3 text-center py-4">Sin CxC en este período</p>}
        </PLRow>

        {/* Costos Directos */}
        <PLRow dot="bg-red-500/60" label="− Costos directos de proyectos"
          sub={`Técnicos ${fmt(data.costosDirectos.tecnicosFreelance)} · Otros ${fmt(data.costosDirectos.otrosCostos)} · Gastos de evento ${fmt(data.costosDirectos.gastosEvento)}`}
          value={data.costosDirectos.total}
        >
          <div className="space-y-4 mt-3">
            {data.costosDirectos.detalleTecnicos.length>0&&(
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Técnicos freelance</p>
                {data.costosDirectos.detalleTecnicos.map((t,i)=>(
                  <div key={i} className="flex justify-between py-1.5 px-2 hover:bg-[#111] rounded-lg">
                    <span className="text-xs text-gray-300">{t.nombre} {t.proyecto&&<span className="text-gray-600">{t.proyecto}</span>}</span>
                    <span className="text-xs font-semibold text-white">{fmt(t.monto)}</span>
                  </div>
                ))}
              </div>
            )}
            {data.costosDirectos.detalleOtros.length>0&&(
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Otros costos de proyecto</p>
                {data.costosDirectos.detalleOtros.map((o,i)=>(
                  <div key={i} className="flex justify-between py-1.5 px-2 hover:bg-[#111] rounded-lg">
                    <span className="text-xs text-gray-300 truncate">{o.concepto}</span>
                    <span className="text-xs font-semibold text-white">{fmt(o.monto)}</span>
                  </div>
                ))}
              </div>
            )}
            {data.costosDirectos.detalleEventos.length>0&&(
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Gastos operativos de evento</p>
                {data.costosDirectos.detalleEventos.map((g,i)=>(
                  <div key={i} className="flex justify-between py-1.5 px-2 hover:bg-[#111] rounded-lg">
                    <span className="text-xs text-gray-300 truncate">{g.concepto} {g.proyecto&&<span className="text-gray-600 ml-1">{g.proyecto}</span>}</span>
                    <span className="text-xs font-semibold text-white">{fmt(g.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PLRow>

        {/* Utilidad Bruta */}
        <PLRow dot={data.utilidadBruta>=0?"bg-green-400":"bg-red-400"} label="= UTILIDAD BRUTA" large
          sub={`Margen: ${pct(data.utilidadBruta,data.ingresos)} · Ingresos menos costos directos`}
          value={data.utilidadBruta} highlight="bruta" />

        {/* Nómina */}
        <PLRow dot="bg-orange-500/60" label="− Nómina"
          sub={data.nomina.detalle.length>0?`${data.nomina.detalle.length} empleado${data.nomina.detalle.length!==1?"s":""} · período ${mes}`:"Sin pagos de nómina en este período"}
          value={data.nomina.total}
        >
          {data.nomina.detalle.length>0&&(
            <div className="space-y-1 mt-3">
              {data.nomina.detalle.map((p,i)=>(
                <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-[#111] rounded-lg">
                  <div>
                    <p className="text-xs text-white">{p.nombre}</p>
                    {p.puesto&&<p className="text-[10px] text-gray-600">{p.puesto} · {p.tipoPeriodo}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-white">{fmt(p.monto)}</p>
                    <p className={`text-[10px] ${p.estado==="PAGADO"?"text-green-400":"text-yellow-400"}`}>{p.estado}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.nomina.detalle.length===0&&<p className="text-gray-700 text-xs mt-3 text-center py-4">Registra nómina en RRHH → Pagos → período {mes}</p>}
        </PLRow>

        {/* Gastos Operativos */}
        <PLRow dot="bg-yellow-500/60" label="− Gastos operativos"
          sub={`${data.gastosOperativos.detalle.length} compromiso${data.gastosOperativos.detalle.length!==1?"s":""} sin proyecto`}
          value={data.gastosOperativos.total}
        >
          {data.gastosOperativos.detalle.length>0&&(
            <div className="space-y-1 mt-3 max-h-48 overflow-y-auto">
              {data.gastosOperativos.detalle.map((g,i)=>(
                <div key={i} className="flex justify-between py-1.5 px-2 hover:bg-[#111] rounded-lg">
                  <span className="text-xs text-gray-300 truncate">{g.concepto}</span>
                  <span className="text-xs font-semibold text-white">{fmt(g.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </PLRow>

        {/* Impuestos */}
        <PLRow dot="bg-purple-500/60" label="− Impuestos"
          sub='CxP con concepto que contiene "impuesto", ISR, IVA'
          value={data.impuestos.total}
        >
          {data.impuestos.detalle.length>0&&(
            <div className="space-y-1 mt-3">
              {data.impuestos.detalle.map((t,i)=>(
                <div key={i} className="flex justify-between py-1.5 px-2 hover:bg-[#111] rounded-lg">
                  <span className="text-xs text-gray-300">{t.concepto}</span>
                  <span className="text-xs font-semibold text-white">{fmt(t.monto)}</span>
                </div>
              ))}
            </div>
          )}
          {data.impuestos.detalle.length===0&&(
            <p className="text-gray-700 text-xs mt-3 text-center py-4">Registra impuestos como CxP con concepto &quot;Impuestos&quot;</p>
          )}
        </PLRow>

        {/* Utilidad Neta */}
        <PLRow dot={data.utilidadNeta>=0?"bg-green-400 w-2":"bg-red-400 w-2"} label="= UTILIDAD NETA" large
          sub={`Margen neto: ${pct(data.utilidadNeta,data.ingresos)}`}
          value={data.utilidadNeta} highlight="neta" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {label:"CxC pendiente",  value:fmt(data.agingCxC.totalPendiente), color:"border-blue-500/30"},
          {label:"CxP pendiente",  value:fmt(data.agingCxP.totalPendiente), color:"border-red-500/30"},
          {label:"Posición neta",  value:fmt(data.agingCxC.totalPendiente-data.agingCxP.totalPendiente), color:"border-[#B3985B]/30"},
          {label:"Margen bruto",   value:pct(data.utilidadBruta,data.ingresos), color:"border-green-500/30"},
        ].map(k=>(
          <div key={k.label} className={`bg-[#080808] border ${k.color} rounded-xl p-4`}>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{k.label}</p>
            <p className="text-lg font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Detail collapsibles */}
      <div className="space-y-2">
        <Collapsible title="Aging — Cuentas por cobrar" badge={fmt(data.agingCxC.totalPendiente)} badgeColor="text-blue-400" open={sections.cxc} onToggle={()=>tog("cxc")}>
          <AgingPanel data={data.agingCxC} label="facturas" />
        </Collapsible>
        <Collapsible title="Aging — Cuentas por pagar" badge={fmt(data.agingCxP.totalPendiente)} badgeColor="text-red-400" open={sections.cxp} onToggle={()=>tog("cxp")}>
          <AgingPanel data={data.agingCxP} label="compromisos" />
        </Collapsible>
        <Collapsible title="Margen por proyecto (cierres)" badge={`${data.margenProyectos.length} proyectos`} open={sections.marg} onToggle={()=>tog("marg")}>
          <div className="overflow-x-auto">
            {data.margenProyectos.length===0
              ? <p className="text-gray-600 text-sm text-center py-8">Sin cierres financieros</p>
              : (
                <table className="w-full">
                  <thead className="bg-[#080808]">
                    <tr>{["Proyecto","Cobrado","Costo","Utilidad","Margen"].map(h=>(
                      <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-600 ${h==="Proyecto"?"text-left":"text-right"}`}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-[#111]">
                    {data.margenProyectos.map(p=>(
                      <tr key={p.id} className="hover:bg-[#0d0d0d] transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs text-white truncate max-w-[200px]">{p.titulo}</p>
                          {p.fecha&&<p className="text-[10px] text-gray-600">{new Date(p.fecha).toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"})}</p>}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-white tabular-nums">{fmt(p.cobrado)}</td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500 tabular-nums">{fmt(p.costo)}</td>
                        <td className={`px-4 py-3 text-right text-xs font-semibold tabular-nums ${utilColor(p.utilidad)}`}>{fmt(p.utilidad)}</td>
                        <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${margenColor(p.margen)}`}>{p.margen!==null?`${p.margen.toFixed(1)}%`:"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </Collapsible>
      </div>
    </div>
  );
}

// ── Tab: Flujo de Efectivo ────────────────────────────────────────────────────
function TabEfectivo({ mes }: { mes:string }) {
  const [data,setData]=useState<Efectivo|null>(null);
  const [loading,setLoading]=useState(true);
  const [sections,setSections]=useState({ ingDet:false,gastDet:false,trans:false,otras:false });
  const tog=(k:keyof typeof sections)=>setSections(s=>({...s,[k]:!s[k]}));

  useEffect(()=>{
    setLoading(true); setData(null);
    fetch(`/api/finanzas/flujo-efectivo?mes=${mes}`)
      .then(r=>r.ok?r.json():null).then(d=>{setData(d);setLoading(false);});
  },[mes]);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin"/></div>;
  if (!data)   return <div className="text-center py-16 text-gray-600">Error al cargar datos</div>;

  return (
    <div className="space-y-4">
      {/* Orphan warning */}
      {data.tieneOrfanos && (
        <div className="flex items-start gap-3 bg-yellow-950/30 border border-yellow-500/30 rounded-xl p-4">
          <span className="text-yellow-400 text-lg shrink-0">⚠</span>
          <div>
            <p className="text-yellow-300 text-sm font-semibold">
              {data.orphanCount} registro{data.orphanCount!==1?"s":""} sin conciliar
            </p>
            <p className="text-yellow-600/80 text-xs mt-0.5">
              Estos movimientos existen en la plataforma pero no tienen un MovimientoFinanciero asociado. Están incluidos en los totales y marcados con ⚠ en el detalle.
            </p>
          </div>
        </div>
      )}

      {/* Cash flow summary card */}
      <div className="bg-[#080808] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        {/* Entradas */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#111]">
          <div className="flex items-center gap-3">
            <div className="w-1 h-9 rounded-full bg-green-500 shrink-0" />
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">+ Entradas de efectivo</p>
              <p className="text-[10px] text-gray-700 mt-0.5">
                MovimientoFinanciero INGRESO {fmt(data.ingresos.conciliado)}
                {data.ingresos.orphan>0&&<span className="text-yellow-600"> + ⚠ {fmt(data.ingresos.orphan)}</span>}
              </p>
            </div>
          </div>
          <p className="text-xl font-bold text-green-400 tabular-nums">{fmt(data.ingresos.total)}</p>
        </div>

        {/* Salidas */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#111]">
          <div className="flex items-center gap-3">
            <div className="w-1 h-9 rounded-full bg-red-500/60 shrink-0" />
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">− Salidas de efectivo</p>
              <p className="text-[10px] text-gray-700 mt-0.5">
                MovimientoFinanciero GASTO {fmt(data.gastos.conciliado)}
                {data.gastos.orphan>0&&<span className="text-yellow-600"> + ⚠ {fmt(data.gastos.orphan)}</span>}
              </p>
            </div>
          </div>
          <p className="text-xl font-bold text-red-400 tabular-nums">({fmt(data.gastos.total)})</p>
        </div>

        {/* Transferencias */}
        {data.transferencias.total>0&&(
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#111]">
            <div className="flex items-center gap-3">
              <div className="w-1 h-9 rounded-full bg-blue-500/60 shrink-0" />
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">↔ Transferencias entre cuentas</p>
                <p className="text-[10px] text-gray-700 mt-0.5">Neutral — movimientos internos</p>
              </div>
            </div>
            <p className="text-lg font-semibold text-blue-400 tabular-nums">{fmt(data.transferencias.total)}</p>
          </div>
        )}

        {/* Flujo neto */}
        <div className={`flex items-center justify-between px-5 py-5 ${data.flujoNeto>=0?"bg-green-950/25":"bg-red-950/25"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-11 rounded-full shrink-0 ${data.flujoNeto>=0?"bg-green-400":"bg-red-400"}`} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-300">= FLUJO NETO DEL MES</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Entradas − Salidas (sin contar transferencias)</p>
            </div>
          </div>
          <p className={`text-3xl font-bold tabular-nums ${utilColor(data.flujoNeto)}`}>{fmt(data.flujoNeto)}</p>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[#080808] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-4">Entradas por categoría</p>
          <CatBar items={data.ingresos.porCategoria} total={data.ingresos.conciliado} color="#4ade80" />
        </div>
        <div className="bg-[#080808] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-4">Salidas por categoría</p>
          <CatBar items={data.gastos.porCategoria} total={data.gastos.conciliado} color="#f87171" />
        </div>
      </div>

      {/* Detail collapsibles */}
      <div className="space-y-2">
        <Collapsible title="Detalle de entradas" badge={fmt(data.ingresos.total)} badgeColor="text-green-400" open={sections.ingDet} onToggle={()=>tog("ingDet")}>
          <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
            {data.ingresos.detalle.map(m=>(
              <div key={m.id} className="flex items-center justify-between py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white truncate">{m.concepto}</p>
                  <p className="text-[10px] text-gray-600">{m.categoria} · {m.metodoPago} · {new Date(m.fecha).toLocaleDateString("es-MX",{day:"numeric",month:"short"})}</p>
                </div>
                <span className="text-sm font-semibold text-green-400 ml-3 shrink-0">{fmt(m.monto)}</span>
              </div>
            ))}
            {data.ingresos.abonosOrfanos.map((a,i)=>(
              <div key={i} className="flex items-center justify-between py-1.5 border-l-2 border-yellow-500/50 pl-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-yellow-300 truncate">⚠ {a.cliente} — {a.concepto}</p>
                  <p className="text-[10px] text-yellow-700">Abono no conciliado</p>
                </div>
                <span className="text-sm font-semibold text-yellow-400 ml-3 shrink-0">{fmt(a.monto)}</span>
              </div>
            ))}
            {data.ingresos.detalle.length===0&&data.ingresos.abonosOrfanos.length===0&&(
              <p className="text-gray-600 text-xs text-center py-4">Sin entradas registradas</p>
            )}
          </div>
        </Collapsible>

        <Collapsible title="Detalle de salidas" badge={fmt(data.gastos.total)} badgeColor="text-red-400" open={sections.gastDet} onToggle={()=>tog("gastDet")}>
          <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
            {data.gastos.detalle.map(m=>(
              <div key={m.id} className="flex items-center justify-between py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white truncate">{m.concepto}</p>
                  <p className="text-[10px] text-gray-600">{m.categoria} · {m.metodoPago} · {new Date(m.fecha).toLocaleDateString("es-MX",{day:"numeric",month:"short"})}</p>
                </div>
                <span className="text-sm font-semibold text-red-400 ml-3 shrink-0">({fmt(m.monto)})</span>
              </div>
            ))}
            {[...data.gastos.abonosPagoOrfanos.map((a,i)=>({key:`ap${i}`,label:`⚠ ${a.concepto}`,sub:"Abono de pago no conciliado",monto:a.monto})),
               ...data.gastos.nominaOrfana.map((n,i)=>({key:`nom${i}`,label:`⚠ ${n.nombre}`,sub:"Pago nómina no conciliado",monto:n.monto})),
               ...data.gastos.gastosEventoOrfanos.map((g,i)=>({key:`gev${i}`,label:`⚠ ${g.concepto}${g.proyecto?` (${g.proyecto})`:""}`,sub:`GastoEvento ${g.tipo}`,monto:g.monto}))
            ].map(o=>(
              <div key={o.key} className="flex items-center justify-between py-1.5 border-l-2 border-yellow-500/50 pl-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-yellow-300 truncate">{o.label}</p>
                  <p className="text-[10px] text-yellow-700">{o.sub}</p>
                </div>
                <span className="text-sm font-semibold text-yellow-400 ml-3 shrink-0">({fmt(o.monto)})</span>
              </div>
            ))}
          </div>
        </Collapsible>

        {data.transferencias.detalle.length>0&&(
          <Collapsible title="Transferencias entre cuentas" badge={fmt(data.transferencias.total)} badgeColor="text-blue-400" open={sections.trans} onToggle={()=>tog("trans")}>
            <div className="p-5 space-y-2">
              {data.transferencias.detalle.map((t,i)=>(
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-xs text-white">{t.concepto}</p>
                    <p className="text-[10px] text-gray-600">{t.origen??""} → {t.destino??""}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-400">{fmt(t.monto)}</span>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {data.otrasOperaciones.detalle.length>0&&(
          <Collapsible title="Inversiones y retiros" badge={fmt(data.otrasOperaciones.total)} open={sections.otras} onToggle={()=>tog("otras")}>
            <div className="p-5 space-y-2">
              {data.otrasOperaciones.detalle.map((o,i)=>(
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-xs text-white">{o.concepto}</p>
                    <p className="text-[10px] text-gray-600">{o.tipo} · {o.categoria}</p>
                  </div>
                  <span className="text-sm font-semibold text-white">{fmt(o.monto)}</span>
                </div>
              ))}
            </div>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function FinanzasReportePage() {
  const [mes, setMes] = useState(defaultMes);
  const [tab, setTab] = useState<"devengado"|"efectivo">("devengado");

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
  const canNext = mes < mesActual;

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          aside, nav, header { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5 pb-16">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-[#B3985B] uppercase tracking-[0.2em] font-bold mb-1">Finanzas</p>
            <h1 className="ms-h1">
              {tab==="devengado" ? "Estado de Resultados" : "Flujo de Efectivo"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{mesLabel(mes)}</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Month nav */}
            <div className="flex items-center gap-1 bg-[#080808] border border-[#1e1e1e] rounded-xl p-1">
              <button onClick={()=>setMes(m=>navMes(m,-1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-colors text-sm">←</button>
              <span className="text-white text-sm font-medium px-3 min-w-[140px] text-center">{mesLabel(mes)}</span>
              <button onClick={()=>canNext&&setMes(m=>navMes(m,1))} disabled={!canNext}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed">→</button>
            </div>
            {/* PDF */}
            <button onClick={()=>window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm rounded-xl transition-all active:scale-95 print:hidden">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              PDF
            </button>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 bg-[#080808] border border-[#1e1e1e] rounded-xl p-1 w-fit">
          {([
            {key:"devengado",label:"Estado de Resultados"},
            {key:"efectivo", label:"Flujo de Efectivo"},
          ] as const).map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab===t.key
                  ? "bg-[#B3985B] text-black shadow"
                  : "text-gray-500 hover:text-white"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <p className="text-xs text-gray-600 -mt-2">
          {tab==="devengado"
            ? "Base devengada: ingresos y gastos reconocidos en el período, independiente de si se cobraron o pagaron."
            : "Base efectivo: dinero que realmente entró y salió de las cuentas en el período."}
        </p>

        {/* Tab content */}
        {tab==="devengado" ? <TabDevengado mes={mes} /> : <TabEfectivo mes={mes} />}
      </div>
    </>
  );
}
