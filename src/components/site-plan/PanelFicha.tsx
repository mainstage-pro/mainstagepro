"use client";

import { useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import {
  type ContextoSitePlan,
  type FichaElemento,
  type ObjetoPlano,
  type OpcionContexto,
  ESTADOS_ELEMENTO,
  GRUPOS_TIPO_ELEMENTO,
  SUPERFICIES,
  TIPOS_ELEMENTO,
  anchoLibreRequerido,
  areaPoligono,
  densidadDe,
  radioDe,
  tipoElementoDe,
} from "@/lib/site-plan";

/**
 * La ficha de un elemento: lo que el dibujo no puede decir. Qué es, qué lleva,
 * quién responde, cuándo se monta y cuánta corriente pide.
 *
 * Donde el show ya tiene el dato —crew, rider, proveedores, bloques de horario—
 * el campo se copia desde ahí con un desplegable, pero queda editable: el plano
 * se imprime y se reparte, y un nombre heredado que cambia después dejaría
 * mintiendo al papel que ya está pegado en la caseta.
 */

type Props = {
  objeto: ObjetoPlano;
  escala: number | null;
  contexto: ContextoSitePlan | null;
  onCambiar: (parcial: Partial<ObjetoPlano>) => void;
};

export default function PanelFicha({ objeto, escala, contexto, onCambiar }: Props) {
  const f = objeto.ficha ?? {};
  const set = (parcial: Partial<FichaElemento>) => onCambiar({ ficha: { ...f, ...parcial } });

  const tipo = tipoElementoDe(f.tipoElemento);
  const areaPx2 =
    objeto.tipo === "ZONA"
      ? areaPoligono(objeto.puntos)
      : objeto.tipo === "CIRCULO"
        ? Math.PI * radioDe(objeto.puntos) ** 2
        : 0;
  const densidad = densidadDe(areaPx2, escala, f.capacidad);

  return (
    <div className="flex flex-col gap-2">
      <Seccion titulo="Qué es" abiertaInicial>
        <div>
          <label className="ms-label">Tipo de elemento</label>
          <select
            className="ms-input"
            value={f.tipoElemento ?? ""}
            onChange={e => {
              const clave = e.target.value || undefined;
              const def = tipoElementoDe(clave);
              // El icono sugerido solo se pone si el punto todavía no tiene uno:
              // elegir el tipo no debe pisar una decisión visual ya tomada.
              const icono = objeto.tipo === "PIN" && !objeto.icono && def?.icono ? def.icono : undefined;
              onCambiar(icono ? { ficha: { ...f, tipoElemento: clave }, icono } : { ficha: { ...f, tipoElemento: clave } });
            }}
          >
            <option value="">Sin clasificar</option>
            {GRUPOS_TIPO_ELEMENTO.map(g => (
              <optgroup key={g} label={g}>
                {TIPOS_ELEMENTO.filter(t => t.grupo === g).map(t => (
                  <option key={t.clave} value={t.clave}>
                    {t.etiqueta}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {tipo && (tipo.electrico || tipo.emergencia) ? (
            <p className="ms-micro mt-1 text-[#B3985B]">
              Entra al croquis {[tipo.electrico ? "eléctrico" : null, tipo.emergencia ? "de emergencia" : null]
                .filter(Boolean)
                .join(" y ")}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="ms-label">Clave de plano</label>
            <input
              className="ms-input"
              value={f.clave ?? ""}
              onChange={e => set({ clave: e.target.value.toUpperCase() || undefined })}
              placeholder="A-01"
            />
          </div>
          <div>
            <label className="ms-label">Estado</label>
            <select
              className="ms-input"
              value={f.estado ?? ""}
              onChange={e => set({ estado: (e.target.value || undefined) as FichaElemento["estado"] })}
            >
              <option value="">—</option>
              {ESTADOS_ELEMENTO.map(e => (
                <option key={e.clave} value={e.clave}>
                  {e.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="ms-label">Cómo va</label>
          <textarea
            className="ms-textarea"
            rows={2}
            value={f.descripcion ?? ""}
            onChange={e => set({ descripcion: e.target.value || undefined })}
            placeholder="Orientación, anclaje, condiciones de montaje"
          />
        </div>

        <div>
          <label className="ms-label">Qué lleva</label>
          <textarea
            className="ms-textarea"
            rows={2}
            value={f.contiene ?? ""}
            onChange={e => set({ contiene: e.target.value || undefined })}
            placeholder="Equipo, mobiliario y personal que van dentro"
          />
        </div>

        <LineasRider ficha={f} contexto={contexto} onSet={set} />
      </Seccion>

      <Seccion titulo="Medidas y aforo">
        <div className="grid grid-cols-2 gap-2">
          <CampoNum
            label="Ancho libre (m)"
            valor={f.anchoLibreM}
            onCambiar={v => set({ anchoLibreM: v })}
            paso={0.1}
          />
          <CampoNum label="Altura (m)" valor={f.alturaM} onCambiar={v => set({ alturaM: v })} paso={0.1} />
          <CampoNum label="Aforo (personas)" valor={f.capacidad} onCambiar={v => set({ capacidad: v })} />
          <CampoNum
            label="Carga terreno (kN/m²)"
            valor={f.cargaTerrenoKnM2}
            onCambiar={v => set({ cargaTerrenoKnM2: v })}
            paso={0.5}
          />
        </div>
        <div>
          <label className="ms-label">Superficie</label>
          <select
            className="ms-input"
            value={f.superficie ?? ""}
            onChange={e => set({ superficie: (e.target.value || undefined) as FichaElemento["superficie"] })}
          >
            <option value="">—</option>
            {SUPERFICIES.map(s => (
              <option key={s.clave} value={s.clave}>
                {s.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {densidad ? (
          <p
            className="ms-micro"
            style={{
              color:
                densidad.nivel === "CRITICO" ? "#D9444F" : densidad.nivel === "DENSO" ? "#E8734A" : "#2DD4BF",
            }}
          >
            {densidad.personasPorM2.toFixed(2)} p/m² · {densidad.etiqueta}
            {densidad.nivel === "CRITICO" || densidad.nivel === "DENSO"
              ? ` · a densidad de planeación caben ${densidad.aforoSugerido.toLocaleString("es-MX")}`
              : ""}
          </p>
        ) : null}

        {f.capacidad ? (
          <p className="ms-micro text-[#777]">
            Para desalojar en 8 min pide {(anchoLibreRequerido(f.capacidad) ?? 0).toFixed(1)} m de ancho libre
            sumando salidas.
          </p>
        ) : null}
      </Seccion>

      <Seccion titulo="Quién responde">
        <CampoConFuente
          label="Responsable"
          valor={f.responsableNombre}
          opciones={contexto?.responsables ?? []}
          onEscribir={v => set({ responsableNombre: v, responsableRef: undefined })}
          onElegir={o =>
            set({ responsableNombre: o.nombre, responsableContacto: o.contacto ?? undefined, responsableRef: o.id })
          }
        />
        <div>
          <label className="ms-label">Contacto</label>
          <input
            className="ms-input"
            value={f.responsableContacto ?? ""}
            onChange={e => set({ responsableContacto: e.target.value || undefined })}
            placeholder="Teléfono o radio"
          />
        </div>
        <CampoConFuente
          label="Proveedor"
          valor={f.proveedorNombre}
          opciones={contexto?.proveedores ?? []}
          onEscribir={v => set({ proveedorNombre: v, proveedorRef: undefined })}
          onElegir={o => set({ proveedorNombre: o.nombre, proveedorRef: o.id })}
        />
      </Seccion>

      <Seccion titulo="Montaje y desmontaje">
        <Ventanas ficha={f} contexto={contexto} onSet={set} />
      </Seccion>

      <Seccion titulo="Eléctrico y seguridad">
        <div className="grid grid-cols-3 gap-2">
          <CampoNum label="Amperaje" valor={f.amperaje} onCambiar={v => set({ amperaje: v })} />
          <CampoNum label="Voltaje" valor={f.voltaje} onCambiar={v => set({ voltaje: v })} />
          <CampoNum label="Fases" valor={f.fases} onCambiar={v => set({ fases: v })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="ms-label">Cuelga del tablero</label>
            <input
              className="ms-input"
              value={f.tableroClave ?? ""}
              onChange={e => set({ tableroClave: e.target.value.toUpperCase() || undefined })}
              placeholder="Clave del tablero"
            />
          </div>
          <CampoNum label="Extintores" valor={f.extintores} onCambiar={v => set({ extintores: v })} />
        </div>
        {contexto?.venue?.amperajeTotal ? (
          <p className="ms-micro text-[#777]">
            El venue declara {contexto.venue.amperajeTotal} A
            {contexto.venue.voltajeDisponible ? ` a ${contexto.venue.voltajeDisponible}` : ""}.
          </p>
        ) : null}
      </Seccion>
    </div>
  );
}

// ─── Piezas ──────────────────────────────────────────────────────────────────

function Seccion({
  titulo,
  abiertaInicial,
  children,
}: {
  titulo: string;
  abiertaInicial?: boolean;
  children: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState(!!abiertaInicial);
  return (
    <div className="ms-card-inset p-2">
      <button
        type="button"
        onClick={() => setAbierta(v => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="ms-section-label">{titulo}</span>
        <ChevronDown size={13} className={`text-[#666] transition-transform ${abierta ? "rotate-180" : ""}`} />
      </button>
      {abierta ? <div className="flex flex-col gap-2 mt-2">{children}</div> : null}
    </div>
  );
}

function CampoNum({
  label,
  valor,
  onCambiar,
  paso = 1,
}: {
  label: string;
  valor: number | undefined;
  onCambiar: (v: number | undefined) => void;
  paso?: number;
}) {
  return (
    <div>
      <label className="ms-label">{label}</label>
      <input
        type="number"
        step={paso}
        min={0}
        className="ms-input"
        value={valor ?? ""}
        onChange={e => {
          const n = Number(e.target.value);
          onCambiar(e.target.value === "" || !Number.isFinite(n) ? undefined : n);
        }}
      />
    </div>
  );
}

/**
 * Un nombre que se escribe a mano o se copia del show. Copiar llena el campo y
 * deja el rastro de dónde salió; escribir encima borra ese rastro, porque ya
 * dejó de ser el mismo dato.
 */
function CampoConFuente({
  label,
  valor,
  opciones,
  onEscribir,
  onElegir,
}: {
  label: string;
  valor: string | undefined;
  opciones: OpcionContexto[];
  onEscribir: (v: string | undefined) => void;
  onElegir: (o: OpcionContexto) => void;
}) {
  return (
    <div>
      <label className="ms-label">{label}</label>
      <input
        className="ms-input"
        value={valor ?? ""}
        onChange={e => onEscribir(e.target.value || undefined)}
        placeholder="Nombre"
      />
      {opciones.length ? (
        <select
          className="ms-input mt-1 text-[11px]"
          value=""
          onChange={e => {
            const o = opciones.find(x => x.id === e.target.value);
            if (o) onElegir(o);
          }}
        >
          <option value="">Copiar del show…</option>
          {opciones.map(o => (
            <option key={o.id} value={o.id}>
              {o.nombre}
              {o.detalle ? ` — ${o.detalle}` : ""}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

function Ventanas({
  ficha,
  contexto,
  onSet,
}: {
  ficha: FichaElemento;
  contexto: ContextoSitePlan | null;
  onSet: (p: Partial<FichaElemento>) => void;
}) {
  const bloques = contexto?.ventanas ?? [];
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Hora label="Montaje desde" valor={ficha.montajeInicio} onCambiar={v => onSet({ montajeInicio: v })} />
        <Hora label="Montaje hasta" valor={ficha.montajeFin} onCambiar={v => onSet({ montajeFin: v })} />
        <Hora label="Desmontaje desde" valor={ficha.desmontajeInicio} onCambiar={v => onSet({ desmontajeInicio: v })} />
        <Hora label="Desmontaje hasta" valor={ficha.desmontajeFin} onCambiar={v => onSet({ desmontajeFin: v })} />
      </div>
      {bloques.length ? (
        <select
          className="ms-input text-[11px]"
          value=""
          onChange={e => {
            const b = bloques.find(x => x.id === e.target.value);
            if (!b) return;
            const esSalida = b.tipo === "DESMONTAJE";
            onSet(
              esSalida
                ? { desmontajeInicio: b.inicio ?? undefined, desmontajeFin: b.fin ?? undefined }
                : { montajeInicio: b.inicio ?? undefined, montajeFin: b.fin ?? undefined },
            );
          }}
        >
          <option value="">Copiar de un bloque del show…</option>
          {bloques.map(b => (
            <option key={b.id} value={b.id}>
              {[b.inicio, b.titulo].filter(Boolean).join(" ")}
            </option>
          ))}
        </select>
      ) : null}
    </>
  );
}

function Hora({
  label,
  valor,
  onCambiar,
}: {
  label: string;
  valor: string | undefined;
  onCambiar: (v: string | undefined) => void;
}) {
  return (
    <div>
      <label className="ms-label">{label}</label>
      <input
        type="time"
        className="ms-input"
        value={valor ?? ""}
        onChange={e => onCambiar(e.target.value || undefined)}
      />
    </div>
  );
}

/** Las líneas del rider que aterrizan en este elemento, de una en una. */
function LineasRider({
  ficha,
  contexto,
  onSet,
}: {
  ficha: FichaElemento;
  contexto: ContextoSitePlan | null;
  onSet: (p: Partial<FichaElemento>) => void;
}) {
  const [abriendo, setAbriendo] = useState(false);
  const rider = contexto?.rider ?? [];
  if (!rider.length) return null;

  const ligadas = ficha.riderLineaIds ?? [];
  const sueltas = rider.filter(r => !ligadas.includes(r.id));

  return (
    <div>
      <label className="ms-label">Líneas del rider</label>
      <div className="flex flex-col gap-1">
        {ligadas.map(id => {
          const r = rider.find(x => x.id === id);
          return (
            <div key={id} className="flex items-center gap-1.5 text-[11px] text-[#ccc]">
              <span className="flex-1 truncate">
                {r ? `${r.cantidad}× ${r.concepto}` : "Línea que ya no está en el rider"}
              </span>
              <button
                type="button"
                className="ms-btn-icon"
                title="Quitar"
                onClick={() => onSet({ riderLineaIds: ligadas.filter(x => x !== id) })}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      {abriendo ? (
        <select
          className="ms-input mt-1 text-[11px]"
          autoFocus
          value=""
          onChange={e => {
            if (e.target.value) onSet({ riderLineaIds: [...ligadas, e.target.value] });
            setAbriendo(false);
          }}
          onBlur={() => setAbriendo(false)}
        >
          <option value="">Elegir línea…</option>
          {sueltas.map(r => (
            <option key={r.id} value={r.id}>
              {r.cantidad}× {r.concepto}
              {r.detalle ? ` — ${r.detalle}` : ""}
            </option>
          ))}
        </select>
      ) : sueltas.length ? (
        <button
          type="button"
          onClick={() => setAbriendo(true)}
          className="ms-btn-ghost mt-1 text-[11px] flex items-center gap-1"
        >
          <Plus size={11} /> Ligar línea del rider
        </button>
      ) : null}
    </div>
  );
}
