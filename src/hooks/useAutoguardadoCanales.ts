"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export type EstadoAutoguardado = "limpio" | "pendiente" | "guardando" | "guardado" | "error";

/// Una fila de la tabla: `clave` es la identidad en pantalla (sobrevive al guardado)
/// y `id` es la fila en la BD, que no existe hasta el primer guardado.
export interface FilaCanal {
  id: string | null;
  clave: string;
  nombre: string;
}

interface Opciones<F extends FilaCanal> {
  riderId: string;
  tipo: "INPUT" | "OUTPUT";
  filas: F[];
  setFilas: (actualizar: (prev: F[]) => F[]) => void;
  /// Cada entrada lleva la clave de la fila que la originó para poder devolverle el
  /// id que asignó el servidor; el orden tiene que ser el mismo que el del PUT.
  aPayload: (filas: F[]) => { clave: string; canal: Record<string, unknown> }[];
}

const DEBOUNCE_MS = 900;

/// El id se excluye a propósito: cuando el servidor devuelve los ids de las filas
/// recién creadas eso no debe contar como un cambio nuevo por guardar.
function firma(filas: FilaCanal[]): string {
  return JSON.stringify(filas.map((f) => ({ ...f, id: null })));
}

export function useAutoguardadoCanales<F extends FilaCanal>({
  riderId,
  tipo,
  filas,
  setFilas,
  aPayload,
}: Opciones<F>): { estado: EstadoAutoguardado; guardarYa: () => void } {
  const router = useRouter();
  const toast = useToast();

  const [estado, setEstado] = useState<EstadoAutoguardado>("limpio");

  const filasRef = useRef(filas);
  const aPayloadRef = useRef(aPayload);
  const enviarRef = useRef<() => void>(() => {});

  const firmaGuardada = useRef(firma(filas));
  const contadoRef = useRef(filas.filter((f) => f.nombre.trim()).length);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enVuelo = useRef(false);

  const programar = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      enviarRef.current();
    }, ms);
  }, []);

  const cuerpo = useCallback(
    (base: F[]) => {
      const items = aPayloadRef.current(base);
      return { items, body: JSON.stringify({ tipo, canales: items.map((i) => i.canal) }) };
    },
    [tipo],
  );

  const enviar = useCallback(async () => {
    const base = filasRef.current;
    const sig = firma(base);
    if (sig === firmaGuardada.current) {
      setEstado((e) => (e === "pendiente" ? "limpio" : e));
      return;
    }
    // Un solo PUT a la vez: dos en paralelo se pisan los ids recién creados.
    if (enVuelo.current) {
      programar(300);
      return;
    }

    const { items, body } = cuerpo(base);
    enVuelo.current = true;
    setEstado("guardando");
    try {
      const res = await fetch(`/api/artista-riders/${riderId}/canales`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEstado("error");
        toast.error(d.error ?? "No se pudo guardar la lista");
        return;
      }

      firmaGuardada.current = sig;
      const guardados = (d.canales as { id: string }[]) ?? [];
      const porClave = new Map(items.map((it, i) => [it.clave, guardados[i]?.id ?? null]));
      // Los ids del cliente tienen que reflejar lo que quedó en la BD: la fila a la
      // que le borraron el nombre no se guardó, así que su id dejó de existir.
      setFilas((prev) =>
        prev.map((f) => {
          const id = porClave.get(f.clave) ?? null;
          return f.id === id ? f : { ...f, id };
        }),
      );
      setEstado(firma(filasRef.current) === sig ? "guardado" : "pendiente");

      if (guardados.length !== contadoRef.current) {
        contadoRef.current = guardados.length;
        router.refresh();
      }
    } catch {
      setEstado("error");
      toast.error("Error de red al guardar la lista");
    } finally {
      enVuelo.current = false;
    }
  }, [riderId, cuerpo, setFilas, programar, router, toast]);

  useEffect(() => {
    filasRef.current = filas;
    aPayloadRef.current = aPayload;
    enviarRef.current = () => void enviar();
  });

  useEffect(() => {
    if (firma(filas) === firmaGuardada.current) return;
    setEstado("pendiente");
    programar(DEBOUNCE_MS);
  }, [filas, programar]);

  // Último disparo al salir de la página: keepalive para que el PUT sobreviva a la
  // navegación y no se pierdan los cambios de los últimos segundos.
  useEffect(() => {
    const vaciar = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      const base = filasRef.current;
      if (firma(base) === firmaGuardada.current) return;
      firmaGuardada.current = firma(base);
      fetch(`/api/artista-riders/${riderId}/canales`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: cuerpo(base).body,
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("pagehide", vaciar);
    return () => {
      window.removeEventListener("pagehide", vaciar);
      vaciar();
    };
  }, [riderId, cuerpo]);

  return { estado, guardarYa: () => programar(0) };
}
