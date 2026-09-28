"use client";

import { useState } from "react";
import {
  REGLA_CASA,
  type ClaveMando,
  type EslabonMando,
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
 * Lo único que sí es de este panel son las reglas reescritas: la doctrina de la
 * casa aplica salvo que el evento pida otra cosa.
 */

export type OpcionTecnico = { personalId: string; nombre: string; celular: string | null };
export type OpcionUsuario = { id: string; nombre: string };

export function PanelCadenaMando({
  eslabones,
  tecnicos,
  usuarios,
  encargadoId,
  coordinadorPersonalId,
  onCoordinador,
  onCampo,
  onReglas,
}: {
  /** Ya resueltos por `cadenaDeMando`: el panel no vuelve a deducirlos. */
  eslabones: EslabonMando[];
  /** Personal del proyecto con técnico asignado. */
  tecnicos: OpcionTecnico[];
  /** Usuarios internos que pueden autorizar cambios. */
  usuarios: OpcionUsuario[];
  encargadoId: string;
  coordinadorPersonalId: string;
  onCoordinador: (personalId: string) => void;
  onCampo: (field: string, valor: string) => void;
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
            tecnicos={tecnicos}
            usuarios={usuarios}
            encargadoId={encargadoId}
            coordinadorPersonalId={coordinadorPersonalId}
            onCoordinador={onCoordinador}
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
  tecnicos,
  usuarios,
  encargadoId,
  coordinadorPersonalId,
  onCoordinador,
  onCampo,
  onRegla,
}: {
  eslabon: EslabonMando;
  tecnicos: OpcionTecnico[];
  usuarios: OpcionUsuario[];
  encargadoId: string;
  coordinadorPersonalId: string;
  onCoordinador: (personalId: string) => void;
  onCampo: (field: string, valor: string) => void;
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

        {/* Quién: cada eslabón escribe en el campo que ya era dueño del dato. */}
        {e.clave === "SITIO" ? (
          <select value={coordinadorPersonalId} onChange={(ev) => onCoordinador(ev.target.value)} className={inputCls}>
            <option value="">— Sin asignar —</option>
            {tecnicos.map((t) => (
              <option key={t.personalId} value={t.personalId}>{t.nombre}</option>
            ))}
          </select>
        ) : e.clave === "CAMBIOS" ? (
          <select value={encargadoId} onChange={(ev) => onCampo("encargadoId", ev.target.value)} className={inputCls}>
            <option value="">— Sin asignar —</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        ) : (
          <CampoTexto
            valor={e.nombre}
            placeholder={e.clave === "CLIENTE" ? "Nombre del contacto del cliente" : "Nombre del encargado del venue"}
            onGuardar={(v) => onCampo(e.clave === "CLIENTE" ? "encargadoCliente" : "encargadoLugar", v)}
          />
        )}

        {/* Contacto: el del técnico viene de su expediente y no se edita aquí. */}
        {e.clave === "SITIO" ? (
          <p className="text-gray-500 text-xs truncate">{e.contacto ?? "—"}</p>
        ) : e.clave === "CAMBIOS" ? (
          <p className="text-gray-700 text-xs">interno</p>
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
  onGuardar,
}: {
  valor: string | null;
  placeholder: string;
  onGuardar: (v: string) => void;
}) {
  const [v, setV] = useState(valor ?? "");
  const [valorPrevio, setValorPrevio] = useState(valor);
  if (valorPrevio !== valor) {
    setValorPrevio(valor);
    setV(valor ?? "");
  }
  return (
    <input
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== (valor ?? "")) onGuardar(v); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className={inputCls}
    />
  );
}
