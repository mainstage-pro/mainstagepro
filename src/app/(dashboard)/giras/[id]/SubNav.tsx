"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavConfig } from "@/components/nav/NavConfigProvider";
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

function TabArrastrable({ enlace, activo }: { enlace: EnlaceSub; activo: boolean }) {
  const { ref, style, arrastre } = useTabArrastrable(llaveDe(enlace));

  return (
    <Link
      ref={ref}
      href={enlace.href}
      style={style}
      {...arrastre}
      draggable={false}
      onClick={(e) => {
        if (arrastreReciente()) e.preventDefault();
      }}
      className={`${claseTab(activo, true)} cursor-pointer select-none`}
    >
      {enlace.label}
    </Link>
  );
}

/// `scope` agrupa el orden por TIPO de pantalla ("gira", "show", "artista"…), no
/// por registro: lo que acomodas en una gira se ve igual en todas y en cualquier
/// dispositivo, porque vive en AppConfig.
export default function SubNav({ enlaces, scope }: { enlaces: EnlaceSub[]; scope: string }) {
  const pathname = usePathname();
  const { tabsOrder, isAdmin, saveTabsOrder } = useNavConfig();

  const ordenados = ordenarPorLlaves(enlaces, tabsOrder[scope], llaveDe);
  const esActivo = (e: EnlaceSub) =>
    e.exacto ? pathname === e.href : pathname === e.href || pathname.startsWith(`${e.href}/`);

  if (!isAdmin) {
    return (
      <nav className={BARRA}>
        {ordenados.map((e) => (
          <Link key={e.href} href={e.href} className={claseTab(esActivo(e), true)}>
            {e.label}
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
          <TabArrastrable key={e.href} enlace={e} activo={esActivo(e)} />
        ))}
      </ContextoArrastreTabs>
    </nav>
  );
}
