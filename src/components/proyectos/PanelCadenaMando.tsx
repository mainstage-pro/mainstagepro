"use client";

import { useId, useState } from "react";
import {
  REGLA_CASA,
  type ClaveMando,
  type ClaveOcupable,
  type EslabonMando,
  type OcupanteMando,
  type OcupantesMando,
  type ReglasMando,
} from "@/lib/cadena-mando";

/**
 * PanelCadenaMando — la tabla de "quién manda" dentro del proyecto.
 *
 * Es el mismo bloque que sale en la Ficha Operativa, la Ficha de Técnicos y la
 * orden en sitio, pero editable. No guarda datos propios: cada renglón escribe
 * en el campo que ya era dueño del dato (el coordinador marcado en el personal,
 * el encargado del proyecto, los contactos del cliente y del venue), así que lo
 * que se ve aquí es exactamente lo que se va a imprimir.
 *
 * Lo que sí es de este panel: las reglas reescritas y, cuando hace falta, la
 * persona puesta a mano en "Manda en sitio" o "Autoriza cambios" — alguien del
 * equipo interno, cualquier técnico registrado (esté o no en el evento) o una
 * persona de fuera escrita a mano.
 */

export type OpcionTecnico = { personalId: string; tecnicoId: string; nombre: string; celular: string | null };
export type OpcionTecnicoRegistrado = { id: string; nombre: string; celular: string | null };
export type OpcionUsuario = { id: string; nombre: string; telefono: string | null };

type Directorio = {
  /** Personal del proyecto con técnico asignado. */
  tecnicos: OpcionTecnico[];
  /** Todos los técnicos registrados (los del evento incluidos). */
  tecnicosRegistrados: OpcionTecnicoRegistrado[];
  /** Equipo interno activo. */
  usuarios: OpcionUsuario[];
  encargadoId: string;
  encargadoNombre: string | null;
  coordinadorPersonalId: string;
  ocupantes: OcupantesMando;
};

export function PanelCadenaMando({
  eslabones,
  onCoordinador,
  onOcupante,
  onCampo,
  onReglas,
  ...dir
}: Directorio & {
  /** Ya resueltos por `cadenaDeMando`: el panel no vuelve a deducirlos. */
  eslabones: EslabonMando[];
  /** Marca a un técnico del evento como coordinador; "" quita al actual. */
  onCoordinador: (personalId: string) => void;
  /** Pone (o quita, con null) a una persona a mano en un eslabón. */
  onOcupante: (clave: ClaveOcupable, ocupante: OcupanteMando | null) => void;
  onCampo: (field: string, valor: string, extra?: Record<string, unknown>) => void;
  onReglas: (reglas: ReglasMando) => void;
}) {
  const huecos = eslabones.filter((e) => !e.nombre).length;
  const criticos = eslabones.filter((e) => e.critico).length;

  return (
    <div className="ms-card p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <p className="text-[10.5px] text-gray-600 font-semibold uppercase tracking-[0.09em]">
          Quién manda en este evento
        </p>
        <span className={`text-[10px] font-semibold ${criticos > 0 ? "text-amber-500" : huecos > 0 ? "text-gray-600" : "text-green-500"}`}>
          {criticos > 0
            ? `${criticos} sin asignar`
            : huecos > 0
              ? `${eslabones.length - huecos} de ${eslabones.length}`
              : "Completa"}
        </span>
      </div>
      <p className="text-[11px] text-gray-600 mb-4">
        Se arma sola con lo que ya capturaste y sale igual en la orden de producción, las fichas y la
        app en sitio. Cambia aquí lo que no aplique a este evento.
      </p>

      {/* Encabezados: en móvil estorban, cada renglón ya se explica solo. */}
      <div className="hidden sm:grid grid-cols-[150px_1fr_130px] gap-3 px-1 pb-2 border-b border-[#1e1e1e]">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Rol</p>
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Quién</p>
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Contacto</p>
      </div>

      <div className="divide-y divide-[#1a1a1a]">
        {eslabones.map((e) => (
          <Renglon
            key={e.clave}
            eslabon={e}
            dir={dir}
            onCoordinador={onCoordinador}
            onOcupante={onOcupante}
            onCampo={onCampo}
            onRegla={(clave, texto) => {
              // Se manda el mapa completo: el PATCH reemplaza el JSON entero.
              const siguiente: ReglasMando = {};
              for (const x of eslabones) if (x.reglaPropia) siguiente[x.clave] = x.regla;
              if (texto) siguiente[clave] = texto;
              else delete siguiente[clave];
              onReglas(siguiente);
            }}
          />
        ))}
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B] hover:border-[#444] transition-colors";

function Renglon({
  eslabon: e,
  dir,
  onCoordinador,
  onOcupante,
  onCampo,
  onRegla,
}: {
  eslabon: EslabonMando;
  dir: Directorio;
  onCoordinador: (personalId: string) => void;
  onOcupante: (clave: ClaveOcupable, ocupante: OcupanteMando | null) => void;
  onCampo: (field: string, valor: string, extra?: Record<string, unknown>) => void;
  onRegla: (clave: ClaveMando, texto: string | null) => void;
}) {
  const [editandoRegla, setEditandoRegla] = useState(false);
  const [borrador, setBorrador] = useState(e.regla);

  // Si la regla cambia por fuera (otro guardado), el borrador se resincroniza
  // durante el render: con useEffect el linter marca render en cascada.
  const [reglaPrevia, setReglaPrevia] = useState(e.regla);
  if (reglaPrevia !== e.regla) {
    setReglaPrevia(e.regla);
    setBorrador(e.regla);
  }

  function guardarRegla() {
    const limpio = borrador.trim();
    // Volver a escribir la regla de la casa es lo mismo que no tener override.
    onRegla(e.clave, !limpio || limpio === REGLA_CASA[e.clave] ? null : limpio);
    setEditandoRegla(false);
  }

  return (
    <div className="py-3">
      <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr_130px] gap-2 sm:gap-3 sm:items-center">
        <p className={`text-xs font-medium ${e.critico ? "text-amber-400" : "text-gray-400"}`}>{e.rol}</p>

        {/* Quién: de casa se elige de la lista; cliente y venue se escriben (con sugerencias). */}
        {e.clave === "SITIO" || e.clave === "CAMBIOS" ? (
          <SelectorPersona
            clave={e.clave}
            dir={dir}
            onCoordinador={onCoordinador}
            onOcupante={onOcupante}
          />
        ) : (
          <CampoTexto
            valor={e.nombre}
            placeholder={e.clave === "CLIENTE" ? "Nombre del contacto del cliente" : "Nombre del encargado del venue"}
            sugerencias={nombresDirectorio(dir)}
            onGuardar={(v) => {
              const campoNombre = e.clave === "CLIENTE" ? "encargadoCliente" : "encargadoLugar";
              const campoTel = e.clave === "CLIENTE" ? "encargadoClienteContacto" : "encargadoLugarContacto";
              // Si es alguien del directorio y aún no hay teléfono, se trae el suyo.
              const tel = !e.contacto ? telefonoDe(dir, v) : null;
              onCampo(campoNombre, v, tel ? { [campoTel]: tel } : undefined);
            }}
          />
        )}

        {/* Deducidos: el teléfono sale del expediente. Puestos a mano: se corrige aquí. */}
        {(e.clave === "SITIO" || e.clave === "CAMBIOS") && !dir.ocupantes[e.clave] ? (
          <p
            className={`text-xs truncate ${e.contacto ? "text-gray-500" : "text-gray-700"}`}
            title={e.contacto ? "Sale de su expediente de personal" : "No tiene teléfono en su expediente de personal"}
          >
            {e.contacto ?? "sin teléfono"}
          </p>
        ) : e.clave === "SITIO" || e.clave === "CAMBIOS" ? (
          <CampoTexto
            valor={e.contacto}
            placeholder="Teléfono"
            onGuardar={(v) => {
              const actual = dir.ocupantes[e.clave as ClaveOcupable]!;
              onOcupante(e.clave as ClaveOcupable, { ...actual, contacto: v.trim() || null });
            }}
          />
        ) : (
          <CampoTexto
            valor={e.contacto}
            placeholder="Teléfono"
            onGuardar={(v) => onCampo(e.clave === "CLIENTE" ? "encargadoClienteContacto" : "encargadoLugarContacto", v)}
          />
        )}
      </div>

      {/* La regla: doctrina de la casa, reescribible donde no aplique. */}
      <div className="mt-1.5 sm:pl-0">
        {editandoRegla ? (
          <div className="space-y-1.5">
            <textarea
              value={borrador}
              onChange={(ev) => setBorrador(ev.target.value)}
              rows={2}
              autoFocus
              className="w-full bg-[#0a0a0a] border border-[#B3985B]/40 rounded-lg px-2.5 py-1.5 text-gray-300 text-[11px] leading-relaxed focus:outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <button onClick={guardarRegla} className="text-[10px] px-2 py-0.5 rounded border border-[#B3985B]/50 text-[#B3985B] hover:border-[#B3985B] transition-colors">
                Guardar
              </button>
              <button onClick={() => { setBorrador(e.regla); setEditandoRegla(false); }} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
                Cancelar
              </button>
              {e.reglaPropia && (
                <button
                  onClick={() => { onRegla(e.clave, null); setEditandoRegla(false); }}
                  className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors ml-auto"
                  title={REGLA_CASA[e.clave]}
                >
                  Volver a la regla de la casa
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditandoRegla(true)}
            className="group text-left w-full"
            title="Click para reescribir esta regla en este evento"
          >
            <span className="text-[11px] text-gray-600 leading-relaxed group-hover:text-gray-400 transition-colors">
              {e.regla}
            </span>
            {e.reglaPropia && (
              <span className="ml-1.5 text-[9px] text-[#B3985B]/70 uppercase tracking-wider">· propia de este evento</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/** Input que solo avisa al soltar el foco: guardar en cada tecla satura la red. */
function CampoTexto({
  valor,
  placeholder,
  sugerencias,
  autoFocus,
  onGuardar,
}: {
  valor: string | null;
  placeholder: string;
  /** Nombres del directorio que se ofrecen mientras se escribe. */
  sugerencias?: string[];
  autoFocus?: boolean;
  onGuardar: (v: string) => void;
}) {
  const listaId = useId();
  const [v, setV] = useState(valor ?? "");
  const [valorPrevio, setValorPrevio] = useState(valor);
  if (valorPrevio !== valor) {
    setValorPrevio(valor);
    setV(valor ?? "");
  }
  return (
    <>
      <input
        value={v}
        placeholder={placeholder}
        autoFocus={autoFocus}
        list={sugerencias?.length ? listaId : undefined}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v !== (valor ?? "")) onGuardar(v); }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className={inputCls}
      />
      {sugerencias?.length ? (
        <datalist id={listaId}>
          {sugerencias.map((n) => <option key={n} value={n} />)}
        </datalist>
      ) : null}
    </>
  );
}

/** Equipo interno + técnicos registrados, sin repetir nombres. */
function nombresDirectorio(dir: Directorio): string[] {
  const set = new Set<string>();
  for (const u of dir.usuarios) set.add(u.nombre.replace(/ \([^)]*\)$/, ""));
  for (const t of dir.tecnicosRegistrados) set.add(t.nombre);
  return [...set].sort((a, b) => a.localeCompare(b));
}

function telefonoDe(dir: Directorio, nombre: string): string | null {
  const n = nombre.trim().toLowerCase();
  if (!n) return null;
  const u = dir.usuarios.find((x) => x.nombre.replace(/ \([^)]*\)$/, "").toLowerCase() === n);
  if (u?.telefono) return u.telefono;
  const t = dir.tecnicosRegistrados.find((x) => x.nombre.toLowerCase() === n);
  return t?.celular ?? null;
}

/**
 * Selector de "Manda en sitio" / "Autoriza cambios". Ofrece a todos: el equipo
 * interno, los técnicos del evento, el resto de técnicos registrados y una
 * persona escrita a mano.
 *
 * Valores: "" = lo deducido · p:<personalId> = coordinador del evento ·
 * u:<userId> · t:<tecnicoId> · libre.
 */
function SelectorPersona({
  clave,
  dir,
  onCoordinador,
  onOcupante,
}: {
  clave: ClaveOcupable;
  dir: Directorio;
  onCoordinador: (personalId: string) => void;
  onOcupante: (clave: ClaveOcupable, ocupante: OcupanteMando | null) => void;
}) {
  const manual = dir.ocupantes[clave];
  const [libre, setLibre] = useState(false);

  let valor = "";
  if (manual) {
    valor = manual.origen === "USUARIO" ? `u:${manual.refId}` : manual.origen === "TECNICO" ? `t:${manual.refId}` : "libre";
  } else if (libre) {
    valor = "libre";
  } else if (clave === "SITIO" && dir.coordinadorPersonalId) {
    valor = `p:${dir.coordinadorPersonalId}`;
  }

  const enEvento = new Set(dir.tecnicos.map((t) => t.tecnicoId));
  const otrosTecnicos = dir.tecnicosRegistrados.filter((t) => !enEvento.has(t.id));
  // En "Autoriza cambios" lo deducido es el encargado: el renglón vacío lo nombra.
  const etiquetaVacio =
    clave === "CAMBIOS" && dir.encargadoNombre ? `Encargado del proyecto (${dir.encargadoNombre})` : "— Sin asignar —";

  function elegir(v: string) {
    setLibre(false);
    if (v === "libre") {
      setLibre(true);
      return;
    }
    if (v === "") {
      if (manual) onOcupante(clave, null);
      if (clave === "SITIO" && dir.coordinadorPersonalId) onCoordinador("");
      return;
    }
    const [tipo, ref] = [v.slice(0, 1), v.slice(2)];
    if (tipo === "p") {
      // Técnico del evento en "Manda en sitio": es el coordinador de siempre.
      if (manual) onOcupante(clave, null);
      onCoordinador(ref);
      return;
    }
    if (tipo === "u") {
      if (clave === "CAMBIOS" && ref === dir.encargadoId) {
        if (manual) onOcupante(clave, null);
        return;
      }
      const u = dir.usuarios.find((x) => x.id === ref);
      if (!u) return;
      onOcupante(clave, { origen: "USUARIO", refId: u.id, nombre: u.nombre.replace(/ \([^)]*\)$/, ""), contacto: u.telefono });
    } else {
      const t = dir.tecnicosRegistrados.find((x) => x.id === ref) ?? dir.tecnicos.find((x) => x.tecnicoId === ref);
      if (!t) return;
      onOcupante(clave, { origen: "TECNICO", refId: ref, nombre: t.nombre, contacto: t.celular });
    }
    // Manda alguien de fuera del personal: ningún técnico queda marcado como coordinador.
    if (clave === "SITIO" && dir.coordinadorPersonalId) onCoordinador("");
  }

  return (
    <div className="space-y-1.5">
      <select value={valor} onChange={(ev) => elegir(ev.target.value)} className={inputCls}>
        <option value="">{etiquetaVacio}</option>
        {dir.usuarios.length > 0 && (
          <optgroup label="Equipo interno">
            {dir.usuarios.map((u) => (
              <option key={u.id} value={`u:${u.id}`}>{u.nombre}</option>
            ))}
          </optgroup>
        )}
        {dir.tecnicos.length > 0 && (
          <optgroup label="Técnicos de este evento">
            {dir.tecnicos.map((t) => (
              <option key={t.personalId} value={clave === "SITIO" ? `p:${t.personalId}` : `t:${t.tecnicoId}`}>{t.nombre}</option>
            ))}
          </optgroup>
        )}
        {otrosTecnicos.length > 0 && (
          <optgroup label="Otros técnicos registrados">
            {otrosTecnicos.map((t) => (
              <option key={t.id} value={`t:${t.id}`}>{t.nombre}</option>
            ))}
          </optgroup>
        )}
        <option value="libre">Otra persona (escribir nombre)…</option>
      </select>
      {valor === "libre" && (
        <CampoTexto
          valor={manual?.origen === "LIBRE" ? manual.nombre : null}
          placeholder="Nombre de la persona"
          autoFocus={!manual}
          onGuardar={(v) => {
            const nombre = v.trim();
            if (!nombre) {
              if (manual) onOcupante(clave, null);
              setLibre(false);
              return;
            }
            onOcupante(clave, { origen: "LIBRE", refId: null, nombre, contacto: manual?.contacto ?? null });
            if (clave === "SITIO" && dir.coordinadorPersonalId) onCoordinador("");
          }}
        />
      )}
    </div>
  );
}
