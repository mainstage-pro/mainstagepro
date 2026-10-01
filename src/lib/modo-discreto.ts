"use client";

import { useCallback, useEffect, useState } from "react";

// Preferencia del navegador, no del proyecto: se prende una vez antes de sentarse
// con los técnicos y aplica a todos los proyectos que se abran en esa sesión.
const LLAVE = "ms-vista-discreta";

export function useModoDiscreto() {
  // null mientras no se lee localStorage: la página no debe pedir datos antes,
  // o alcanzaría a pintar los montos un instante.
  const [valor, setValor] = useState<boolean | null>(null);

  useEffect(() => {
    try { setValor(localStorage.getItem(LLAVE) === "1"); } catch { setValor(false); }
    const sync = (e: StorageEvent) => { if (e.key === LLAVE) setValor(e.newValue === "1"); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const cambiar = useCallback((v: boolean) => {
    try {
      if (v) localStorage.setItem(LLAVE, "1");
      else localStorage.removeItem(LLAVE);
    } catch { /* modo privado */ }
    setValor(v);
  }, []);

  return { discreto: valor === true, listo: valor !== null, setDiscreto: cambiar };
}
