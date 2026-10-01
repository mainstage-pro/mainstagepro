"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Orden de pestañas: preferencia del navegador, no del proyecto ni del usuario en BD.
// Cada quien acomoda las pestañas como las trabaja y se queda así en su equipo.
export function useOrdenPestanas(llave: string, ids: readonly string[]) {
  const [guardado, setGuardado] = useState<string[] | null>(null);
  const firma = ids.join(",");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(llave);
      const arr = raw ? JSON.parse(raw) : [];
      setGuardado(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
    } catch {
      setGuardado([]);
    }
  }, [llave]);

  // Una pestaña que aún no está en el orden guardado (nueva en el código, o
  // Finanzas que aparece según permisos) entra en su posición por defecto.
  const orden = useMemo(() => {
    const base = firma.split(",").filter(Boolean);
    if (!guardado?.length) return base;
    const resultado = guardado.filter(id => base.includes(id));
    base.forEach((id, i) => {
      if (!resultado.includes(id)) resultado.splice(Math.min(i, resultado.length), 0, id);
    });
    return resultado;
  }, [guardado, firma]);

  const mover = useCallback((desde: string, hasta: string) => {
    if (desde === hasta) return;
    const arr = [...orden];
    const i = arr.indexOf(desde);
    const j = arr.indexOf(hasta);
    if (i < 0 || j < 0) return;
    arr.splice(j, 0, ...arr.splice(i, 1));
    setGuardado(arr);
    try { localStorage.setItem(llave, JSON.stringify(arr)); } catch { /* modo privado */ }
  }, [orden, llave]);

  return { orden, mover };
}
