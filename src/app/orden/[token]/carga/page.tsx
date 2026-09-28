"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOrden } from "../OrdenContext";
import { Cargando } from "../ui";
import { RUTA_PASE, siguientePase } from "@/lib/control-carga";

/**
 * "Control de carga" dejó de ser una pantalla para volverse dos lugares: la
 * salida y el retorno. Esta dirección sobrevive como desvío —la usan los enlaces
 * ya compartidos— y manda a la pasada que toca, que es la pregunta que venía a
 * responder.
 */
export default function CargaPage() {
  const { orden, token } = useOrden();
  const router = useRouter();

  // Una sola vez. La orden se vuelve a pedir sola (al recuperar el foco, cada
  // minuto), y cada refresco trae un objeto nuevo: sin este seguro el desvío se
  // relanzaría encima de sí mismo y la navegación en curso se cancelaría sola.
  const yaFue = useRef(false);

  useEffect(() => {
    if (!orden || yaFue.current) return;
    yaFue.current = true;
    const s = siguientePase(orden.pases);
    const tipo = s.accion === "COMPLETO" ? "RETORNO" : s.tipo;
    router.replace(`/orden/${token}/carga/${RUTA_PASE[tipo]}`);
  }, [orden, token, router]);

  return <Cargando />;
}
