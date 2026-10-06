"use client";

import { useState } from "react";
import { Eye, EyeOff, FileDown, Plus, Send, Trash2 } from "lucide-react";
import {
  type EstadoVariante,
  ESTADOS_VARIANTE,
  MEDIOS_EMISION,
  VARIANTES_CATALOGO,
  capasDeVariante,
} from "@/lib/site-plan";

/**
 * Los documentos que salen de un plano. El dibujo es uno; lo que se entrega son
 * varios, y lo que hace que un plano entregado sea confiable no es el trazo sino
 * saber qué revisión es y quién la tiene en la mano.
 */

type Revision = { id: string; numero: number; descripcion: string; autor: string | null; fecha: string };
type Emision = {
  id: string;
  revision: number;
  destinatario: string;
  organizacion: string | null;
  medio: string | null;
  fecha: string;
};
type Variante = {
  id: string;
  nombre: string;
  clave: string;
  estado: string;
  revision: number;
  capasIds: string | null;
  soloElectrico: boolean;
  soloEmergencia: boolean;
  notas: string | null;
  revisiones: Revision[];
  emisiones: Emision[];
};
type Cuadro = {
  direccionSitio: string;
  norteGrados: number | null;
  dibujadoPor: string;
  responsableSitio: string;
  clienteOPromotor: string;
  capacidadSitio: number | null;
  capacidadEvacuacion: number | null;
};

export default function DocumentosDelPlano({
  planId,
  token,
  capas,
  cuadro: cuadroInicial,
  variantes: variantesIniciales,
}: {
  planId: string;
  token: string;
  capas: { id: string; nombre: string; cuantos: number }[];
  cuadro: Cuadro;
  variantes: Variante[];
}) {
  const [cuadro, setCuadro] = useState(cuadroInicial);
  const [variantes, setVariantes] = useState(variantesIniciales);
  const [creando, setCreando] = useState(false);

  async function guardarCuadro(parcial: Partial<Cuadro>) {
    setCuadro(c => ({ ...c, ...parcial }));
    await fetch(`/api/site-planes/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parcial),
    });
  }

  async function crear(clave: string) {
    setCreando(true);
    try {
      const r = await fetch(`/api/site-planes/${planId}/variantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave }),
      });
      if (r.ok) {
        const v = (await r.json()) as Variante;
        setVariantes(prev => [...prev, { ...v, revisiones: [], emisiones: [] }]);
      }
    } finally {
      setCreando(false);
    }
  }

  async function mutar(varianteId: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/site-planes/${planId}/variantes/${varianteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return;
    const fresca = (await r.json()) as Variante;
    setVariantes(prev => prev.map(v => (v.id === varianteId ? fresca : v)));
  }

  async function borrar(varianteId: string) {
    if (!confirm("¿Quitar este documento? El dibujo del plano no se toca.")) return;
    await fetch(`/api/site-planes/${planId}/variantes/${varianteId}`, { method: "DELETE" });
    setVariantes(prev => prev.filter(v => v.id !== varianteId));
  }

  const aforoQueManda =
    cuadro.capacidadSitio && cuadro.capacidadEvacuacion
      ? Math.min(cuadro.capacidadSitio, cuadro.capacidadEvacuacion)
      : (cuadro.capacidadEvacuacion ?? cuadro.capacidadSitio);

  const sinUsar = VARIANTES_CATALOGO.filter(c => !variantes.some(v => v.clave === c.clave));

  return (
    <div className="flex flex-col gap-4">
      <section className="ms-card p-4 flex flex-col gap-3">
        <div>
          <p className="ms-section-label">Cuadro de datos</p>
          <p className="ms-meta">Lo que se imprime en la esquina de cada plano que salga de aquí.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Campo
            label="Dirección del sitio"
            valor={cuadro.direccionSitio}
            onGuardar={v => guardarCuadro({ direccionSitio: v })}
          />
          <Campo
            label="Cliente o promotor"
            valor={cuadro.clienteOPromotor}
            onGuardar={v => guardarCuadro({ clienteOPromotor: v })}
          />
          <Campo
            label="Responsable del sitio"
            valor={cuadro.responsableSitio}
            onGuardar={v => guardarCuadro({ responsableSitio: v })}
            ayuda="Quién responde ante la autoridad"
          />
          <Campo label="Dibujó" valor={cuadro.dibujadoPor} onGuardar={v => guardarCuadro({ dibujadoPor: v })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CampoNum
            label="Aforo de permanencia"
            valor={cuadro.capacidadSitio}
            onGuardar={v => guardarCuadro({ capacidadSitio: v })}
          />
          <CampoNum
            label="Aforo por salidas"
            valor={cuadro.capacidadEvacuacion}
            onGuardar={v => guardarCuadro({ capacidadEvacuacion: v })}
            ayuda="Lo que admite el ancho libre de salidas"
          />
          <CampoNum
            label="Giro del norte (°)"
            valor={cuadro.norteGrados}
            onGuardar={v => guardarCuadro({ norteGrados: v })}
            ayuda="0 = norte hacia arriba del plano"
          />
        </div>

        {aforoQueManda ? (
          <p className="ms-micro text-[#B3985B]">
            El aforo que manda es {aforoQueManda.toLocaleString("es-MX")} personas: entre permanencia y salidas,
            gobierna el menor.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ms-section-label">Documentos emitidos</p>
            <p className="ms-meta">
              Todos salen del mismo dibujo, prendiendo y apagando capas. Cada uno lleva su revisión y su lista de
              a quién se le entregó.
            </p>
          </div>
        </div>

        {variantes.map(v => (
          <FilaVariante
            key={v.id}
            v={v}
            planId={planId}
            token={token}
            capas={capas}
            onMutar={body => mutar(v.id, body)}
            onBorrar={() => borrar(v.id)}
          />
        ))}

        {sinUsar.length ? (
          <div className="ms-card p-3 flex flex-col gap-2">
            <p className="ms-section-label">Agregar documento</p>
            {sinUsar.map(c => (
              <div key={c.clave} className="flex items-center gap-3 py-1">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#ddd]">{c.nombre}</p>
                  <p className="ms-micro text-[#666]">{c.descripcion}</p>
                </div>
                <button
                  type="button"
                  disabled={creando}
                  onClick={() => void crear(c.clave)}
                  className="ms-btn-secondary text-[11px] flex items-center gap-1 shrink-0"
                >
                  <Plus size={11} /> Agregar
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {!variantes.length ? (
          <p className="ms-meta">
            Mientras no agregues ninguno, el PDF del plano sale completo, con todas las capas.
          </p>
        ) : null}
      </section>
    </div>
  );
}

// ─── Variante ────────────────────────────────────────────────────────────────

function FilaVariante({
  v,
  planId,
  token,
  capas,
  onMutar,
  onBorrar,
}: {
  v: Variante;
  planId: string;
  token: string;
  capas: { id: string; nombre: string; cuantos: number }[];
  onMutar: (body: Record<string, unknown>) => Promise<void>;
  onBorrar: () => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [cambio, setCambio] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [organizacion, setOrganizacion] = useState("");
  const [medio, setMedio] = useState<string>("CORREO");

  const elegidas = capasDeVariante(v.capasIds);
  const estado = ESTADOS_VARIANTE.find(e => e.clave === v.estado);

  function alternarCapa(capaId: string) {
    const base = elegidas ?? capas.map(c => c.id);
    const nuevas = base.includes(capaId) ? base.filter(x => x !== capaId) : [...base, capaId];
    // Si quedan todas, se guarda null: así una capa nueva entra sola al documento
    // en vez de quedarse fuera sin que nadie se dé cuenta.
    void onMutar({ capasIds: nuevas.length === capas.length ? null : nuevas });
  }

  return (
    <div className="ms-card p-3 flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => setAbierta(a => !a)} className="flex-1 min-w-0 text-left">
          <p className="text-[14px] text-[#eee]">{v.nombre}</p>
          <p className="ms-micro text-[#666]">
            Rev. {v.revision} · {estado?.etiqueta ?? v.estado}
            {v.emisiones.length ? ` · entregado a ${v.emisiones.length}` : " · sin entregar"}
            {elegidas ? ` · ${elegidas.length} de ${capas.length} capas` : " · todas las capas"}
          </p>
        </button>
        <span
          className="ms-badge shrink-0"
          style={{ color: estado?.color, borderColor: `${estado?.color}55` }}
        >
          Rev. {v.revision}
        </span>
        <a
          href={`/api/site-planes/${planId}/pdf?variante=${v.id}&token=${token}&preview=1`}
          target="_blank"
          rel="noreferrer"
          className="ms-btn-icon shrink-0"
          title="Ver el PDF de este documento"
        >
          <FileDown size={14} />
        </a>
        <button type="button" onClick={onBorrar} className="ms-btn-icon hover:text-[#D9444F] shrink-0" title="Quitar">
          <Trash2 size={14} />
        </button>
      </div>

      {abierta ? (
        <div className="flex flex-col gap-3 pt-2 border-t border-[#1a1a1a]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="ms-label">Nombre del documento</label>
              <input
                className="ms-input"
                defaultValue={v.nombre}
                onBlur={e => {
                  if (e.target.value.trim() && e.target.value !== v.nombre) void onMutar({ nombre: e.target.value });
                }}
              />
            </div>
            <div>
              <label className="ms-label">Estado</label>
              <select
                className="ms-input"
                value={v.estado}
                onChange={e => void onMutar({ estado: e.target.value as EstadoVariante })}
              >
                {ESTADOS_VARIANTE.map(e => (
                  <option key={e.clave} value={e.clave}>
                    {e.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="ms-label">Capas que imprime</label>
            <div className="flex flex-col">
              {capas.map(c => {
                const dentro = !elegidas || elegidas.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => alternarCapa(c.id)}
                    className="flex items-center gap-2 py-1 text-left"
                  >
                    {dentro ? (
                      <Eye size={13} className="text-[#B3985B]" />
                    ) : (
                      <EyeOff size={13} className="text-[#555]" />
                    )}
                    <span className={`text-[12px] flex-1 ${dentro ? "text-[#ddd]" : "text-[#555]"}`}>
                      {c.nombre}
                    </span>
                    <span className="ms-micro text-[#555]">{c.cuantos}</span>
                  </button>
                );
              })}
            </div>
            {v.soloElectrico || v.soloEmergencia ? (
              <p className="ms-micro mt-1 text-[#B3985B]">
                Además recorta a los elementos del croquis {v.soloElectrico ? "eléctrico" : "de emergencia"}: un
                elemento sin tipo clasificado en su ficha no sale.
              </p>
            ) : null}
          </div>

          <div>
            <label className="ms-label">Subir de revisión</label>
            <div className="flex gap-2">
              <input
                className="ms-input flex-1"
                value={cambio}
                onChange={e => setCambio(e.target.value)}
                placeholder="Qué cambió respecto a la revisión anterior"
              />
              <button
                type="button"
                disabled={!cambio.trim()}
                onClick={async () => {
                  await onMutar({ revisionNueva: { descripcion: cambio } });
                  setCambio("");
                }}
                className="ms-btn-primary text-[11px] shrink-0"
              >
                Rev. {v.revision + 1}
              </button>
            </div>
          </div>

          {v.revisiones.length ? (
            <div>
              <label className="ms-label">Historial</label>
              <div className="flex flex-col gap-1">
                {v.revisiones.map(r => (
                  <p key={r.id} className="ms-micro text-[#888]">
                    <span className="text-[#B3985B]">Rev. {r.numero}</span> · {r.descripcion}
                    {r.autor ? ` · ${r.autor}` : ""} · {new Date(r.fecha).toLocaleDateString("es-MX")}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <label className="ms-label">A quién se le entregó</label>
            <div className="flex flex-col gap-1 mb-2">
              {v.emisiones.map(e => (
                <div key={e.id} className="flex items-center gap-2">
                  <span className="text-[12px] text-[#ccc] flex-1 min-w-0 truncate">
                    {e.destinatario}
                    {e.organizacion ? ` · ${e.organizacion}` : ""}
                  </span>
                  <span className="ms-micro text-[#666] shrink-0">
                    Rev. {e.revision}
                    {e.medio ? ` · ${e.medio.toLowerCase()}` : ""} · {new Date(e.fecha).toLocaleDateString("es-MX")}
                  </span>
                  <button
                    type="button"
                    onClick={() => void onMutar({ emisionBorrar: e.id })}
                    className="ms-btn-icon shrink-0"
                    title="Quitar del registro"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {!v.emisiones.length ? <p className="ms-micro text-[#555]">Todavía no se entrega a nadie.</p> : null}
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                className="ms-input md:flex-1"
                value={destinatario}
                onChange={e => setDestinatario(e.target.value)}
                placeholder="Nombre de quien lo recibe"
              />
              <input
                className="ms-input md:flex-1"
                value={organizacion}
                onChange={e => setOrganizacion(e.target.value)}
                placeholder="Organización"
              />
              <select className="ms-input md:w-32" value={medio} onChange={e => setMedio(e.target.value)}>
                {MEDIOS_EMISION.map(m => (
                  <option key={m} value={m}>
                    {m.charAt(0) + m.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!destinatario.trim()}
                onClick={async () => {
                  await onMutar({ emisionNueva: { destinatario, organizacion, medio } });
                  setDestinatario("");
                  setOrganizacion("");
                }}
                className="ms-btn-secondary text-[11px] flex items-center justify-center gap-1 shrink-0"
              >
                <Send size={11} /> Registrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Campos ──────────────────────────────────────────────────────────────────

function Campo({
  label,
  valor,
  onGuardar,
  ayuda,
}: {
  label: string;
  valor: string;
  onGuardar: (v: string) => void;
  ayuda?: string;
}) {
  return (
    <div>
      <label className="ms-label">{label}</label>
      <input
        className="ms-input"
        defaultValue={valor}
        onBlur={e => {
          if (e.target.value !== valor) onGuardar(e.target.value);
        }}
      />
      {ayuda ? <p className="ms-micro text-[#555] mt-0.5">{ayuda}</p> : null}
    </div>
  );
}

function CampoNum({
  label,
  valor,
  onGuardar,
  ayuda,
}: {
  label: string;
  valor: number | null;
  onGuardar: (v: number | null) => void;
  ayuda?: string;
}) {
  return (
    <div>
      <label className="ms-label">{label}</label>
      <input
        type="number"
        min={0}
        className="ms-input"
        defaultValue={valor ?? ""}
        onBlur={e => {
          const n = Number(e.target.value);
          const limpio = e.target.value === "" || !Number.isFinite(n) ? null : n;
          if (limpio !== valor) onGuardar(limpio);
        }}
      />
      {ayuda ? <p className="ms-micro text-[#555] mt-0.5">{ayuda}</p> : null}
    </div>
  );
}
