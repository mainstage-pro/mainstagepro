"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useNavConfig } from "@/components/nav/NavConfigProvider";
import { EditInput, useSingleDoubleClick } from "@/components/nav/editable";
import {
  ContextoArrastreTabs,
  arrastreReciente,
  claseTab,
  ordenarPorLlaves,
  useTabArrastrable,
} from "@/components/nav/tabs-ordenables";

export interface EnlaceSub {
  href: string;
  label: string;
  /// Identidad estable de la pestaña. El href carga el id del registro, así que el
  /// orden se guarda por esta llave y vale para todas las giras, no para una.
  llave?: string;
  /// El índice se marca solo con la ruta exacta; si no, quedaría activo siempre
  /// porque es prefijo de todos sus hermanos.
  exacto?: boolean;
}

const BARRA = "flex gap-1 overflow-x-auto ms-no-scrollbar";

function llaveDe(e: EnlaceSub) {
  return e.llave ?? e.href;
}

function TabArrastrable({
  enlace,
  etiqueta,
  activo,
  editando,
  onEditar,
  onGuardar,
  onCancelar,
}: {
  enlace: EnlaceSub;
  etiqueta: string;
  activo: boolean;
  editando: boolean;
  onEditar: () => void;
  onGuardar: (v: string) => void;
  onCancelar: () => void;
}) {
  const { ref, style, arrastre } = useTabArrastrable(llaveDe(enlace));
  const router = useRouter();
  const clic = useSingleDoubleClick(() => {
    if (!arrastreReciente()) router.push(enlace.href);
  }, onEditar);

  if (editando) {
    return (
      <span ref={ref} style={style} className="flex items-center px-2 py-1.5 shrink-0 w-40">
        <EditInput initial={etiqueta} onCommit={onGuardar} onCancel={onCancelar} />
      </span>
    );
  }

  return (
    <Link
      ref={ref}
      href={enlace.href}
      style={style}
      {...arrastre}
      draggable={false}
      onClick={(e) => {
        // Cmd/ctrl/medio: deja que el navegador abra en otra pestaña.
        if (e.metaKey || e.ctrlKey || e.button === 1) return;
        e.preventDefault();
        clic(e);
      }}
      className={`${claseTab(activo, true)} cursor-pointer select-none`}
    >
      {etiqueta}
    </Link>
  );
}

/// `scope` agrupa el orden por TIPO de pantalla ("gira", "show", "artista"…), no
/// por registro: lo que acomodas en una gira se ve igual en todas y en cualquier
/// dispositivo, porque vive en AppConfig.
export default function SubNav({ enlaces, scope }: { enlaces: EnlaceSub[]; scope: string }) {
  const pathname = usePathname();
  const { labels, tabsOrder, isAdmin, saveLabel, saveTabsOrder } = useNavConfig();
  const [editando, setEditando] = useState<string | null>(null);

  const ordenados = ordenarPorLlaves(enlaces, tabsOrder[scope], llaveDe);
  const esActivo = (e: EnlaceSub) =>
    e.exacto ? pathname === e.href : pathname === e.href || pathname.startsWith(`${e.href}/`);
  // El nombre se guarda por scope+llave, no por href: el href trae el id del
  // registro y el renombre debe valer para todas las giras, shows y artistas.
  const llaveLabel = (e: EnlaceSub) => `tab:${scope}:${llaveDe(e)}`;
  const etiquetaDe = (e: EnlaceSub) => labels[llaveLabel(e)] ?? e.label;

  if (!isAdmin) {
    return (
      <nav className={BARRA}>
        {ordenados.map((e) => (
          <Link key={e.href} href={e.href} className={claseTab(esActivo(e), true)}>
            {etiquetaDe(e)}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className={BARRA}>
      <ContextoArrastreTabs
        llaves={ordenados.map(llaveDe)}
        onReordenar={(llaves) => saveTabsOrder(scope, llaves)}
      >
        {ordenados.map((e) => (
          <TabArrastrable
            key={e.href}
            enlace={e}
            etiqueta={etiquetaDe(e)}
            activo={esActivo(e)}
            editando={editando === llaveDe(e)}
            onEditar={() => setEditando(llaveDe(e))}
            onGuardar={(v) => {
              saveLabel(llaveLabel(e), v);
              setEditando(null);
            }}
            onCancelar={() => setEditando(null)}
          />
        ))}
      </ContextoArrastreTabs>
    </nav>
  );
}
