"use client";

import { useState } from "react";
import { EditInput, useSingleDoubleClick } from "@/components/nav/editable";
import { useNavConfig } from "@/components/nav/NavConfigProvider";
import {
  ContextoArrastreTabs,
  arrastreReciente,
  ordenarPorLlaves,
  useTabArrastrable,
} from "@/components/nav/tabs-ordenables";

export interface Pestana {
  /// Identidad estable de la pestaña: con esto se guardan el orden y el nombre.
  llave: string;
  label: string;
  /// Adornos que NO se renombran, porque son datos: el ícono a la izquierda y
  /// el contador a la derecha. Solo `label` es editable.
  icono?: React.ReactNode;
  sufijo?: React.ReactNode;
}

type Variante = "linea" | "pastilla";

const CONTENEDOR: Record<Variante, string> = {
  linea: "flex gap-1 border-b border-[#1a1a1a] overflow-x-auto ms-no-scrollbar",
  pastilla: "ms-tabs w-fit flex-wrap",
};

function claseDe(variante: Variante, activa: boolean) {
  if (variante === "pastilla") {
    return `${activa ? "ms-tab-active" : "ms-tab"} shrink-0 whitespace-nowrap`;
  }
  return `shrink-0 whitespace-nowrap px-4 py-2.5 -mb-px text-sm font-medium border-b-2 transition-colors ${
    activa ? "border-[#B3985B] text-white" : "border-transparent text-[#6b7280] hover:text-white"
  }`;
}

function Boton({
  pestana,
  etiqueta,
  activa,
  variante,
  editando,
  onSelect,
  onEditar,
  onGuardar,
  onCancelar,
}: {
  pestana: Pestana;
  etiqueta: string;
  activa: boolean;
  variante: Variante;
  editando: boolean;
  onSelect: () => void;
  onEditar: () => void;
  onGuardar: (v: string) => void;
  onCancelar: () => void;
}) {
  const { ref, style, arrastre } = useTabArrastrable(pestana.llave);
  const clic = useSingleDoubleClick(() => {
    if (!arrastreReciente()) onSelect();
  }, onEditar);

  if (editando) {
    return (
      <span ref={ref} style={style} className="flex items-center px-2 py-1.5 shrink-0 w-40">
        <EditInput initial={etiqueta} onCommit={onGuardar} onCancel={onCancelar} />
      </span>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      style={style}
      {...arrastre}
      onClick={clic}
      className={`${claseDe(variante, activa)} inline-flex items-center gap-1.5 select-none`}
    >
      {pestana.icono}
      {etiqueta}
      {pestana.sufijo}
    </button>
  );
}

/// Barra de pestañas de sección dentro de una página: el admin las arrastra para
/// reacomodarlas y les cambia el nombre con doble clic. `scope` agrupa esa
/// configuración por TIPO de pantalla, no por registro, así lo que acomodas en
/// un proyecto se ve igual en todos.
export default function PestanasEditables({
  scope,
  pestanas,
  activa,
  onSelect,
  variante = "linea",
  className,
}: {
  scope: string;
  pestanas: Pestana[];
  activa: string;
  onSelect: (llave: string) => void;
  variante?: Variante;
  className?: string;
}) {
  const { labels, tabsOrder, isAdmin, saveLabel, saveTabsOrder } = useNavConfig();
  const [editando, setEditando] = useState<string | null>(null);

  const ordenadas = ordenarPorLlaves(pestanas, tabsOrder[scope], (p) => p.llave);
  const llaveLabel = (p: Pestana) => `tab:${scope}:${p.llave}`;
  const etiquetaDe = (p: Pestana) => labels[llaveLabel(p)] ?? p.label;
  const barra = className ?? CONTENEDOR[variante];

  if (!isAdmin) {
    return (
      <div className={barra}>
        {ordenadas.map((p) => (
          <button
            key={p.llave}
            type="button"
            onClick={() => onSelect(p.llave)}
            className={`${claseDe(variante, activa === p.llave)} inline-flex items-center gap-1.5`}
          >
            {p.icono}
            {etiquetaDe(p)}
            {p.sufijo}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={barra}>
      <ContextoArrastreTabs
        llaves={ordenadas.map((p) => p.llave)}
        onReordenar={(llaves) => saveTabsOrder(scope, llaves)}
      >
        {ordenadas.map((p) => (
          <Boton
            key={p.llave}
            pestana={p}
            etiqueta={etiquetaDe(p)}
            activa={activa === p.llave}
            variante={variante}
            editando={editando === p.llave}
            onSelect={() => onSelect(p.llave)}
            onEditar={() => setEditando(p.llave)}
            onGuardar={(v) => {
              saveLabel(llaveLabel(p), v);
              setEditando(null);
            }}
            onCancelar={() => setEditando(null)}
          />
        ))}
      </ContextoArrastreTabs>
    </div>
  );
}
