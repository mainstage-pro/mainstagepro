"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoAutoguardado = "limpio" | "guardando" | "guardado" | "error";

interface Opciones<T> {
  url: string;
  /// El borrador completo. Cambiar de objeto es lo que dispara el guardado.
  valor: T;
  /// Lo que viaja en el cuerpo. Sin esto viaja `valor` tal cual.
  cuerpo?: (valor: T) => Record<string, unknown>;
  /// En modo lectura no se guarda nada. Ponerlo en true no dispara por sí solo.
  activo?: boolean;
  metodo?: "PATCH" | "PUT" | "POST";
  debounceMs?: number;
  /// Motivo por el que el borrador todavía no se puede mandar (un obligatorio vacío).
  /// Mientras devuelva texto no se hace la petición y el sello queda en error.
  validar?: (valor: T) => string | null;
  onGuardado?: () => void;
  /// Solo en la primera falla de una racha, para no repetir el aviso en cada reintento.
  onError?: (mensaje: string) => void;
}

interface Autoguardado {
  estado: EstadoAutoguardado;
  error: string | null;
  /// Se salta el debounce: para el botón de reintentar y para cerrar la edición.
  guardarYa: () => void;
  /// true mientras haya cambios que todavía no llegan al servidor.
  pendiente: boolean;
}

const DEBOUNCE_MS = 800;

/**
 * Guarda un borrador solo, con debounce, mientras la ficha esté en edición.
 *
 * Nunca hay dos peticiones en vuelo: si el debounce vence con una viajando, se
 * reprograma. Así una respuesta vieja no puede pisar lo que ya se mandó después.
 */
export function useAutoguardado<T>({
  url,
  valor,
  cuerpo,
  activo = true,
  metodo = "PATCH",
  debounceMs = DEBOUNCE_MS,
  validar,
  onGuardado,
  onError,
}: Opciones<T>): Autoguardado {
  const [estado, setEstado] = useState<EstadoAutoguardado>("limpio");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  const valorRef = useRef(valor);
  const cuerpoRef = useRef(cuerpo);
  const validarRef = useRef(validar);
  const onGuardadoRef = useRef(onGuardado);
  const onErrorRef = useRef(onError);
  const enviarRef = useRef<() => void>(() => {});

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enVuelo = useRef(false);
  const avisado = useRef(false);

  const firma = useCallback((v: T) => JSON.stringify(cuerpoRef.current ? cuerpoRef.current(v) : v), []);

  // El valor con el que se montó ya está en la BD: sin esta semilla el primer
  // render dispararía un PATCH de algo que nadie tocó.
  const firmaGuardada = useRef<string | null>(null);
  if (firmaGuardada.current === null) firmaGuardada.current = firma(valor);

  const programar = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      enviarRef.current();
    }, ms);
  }, []);

  // `activo` solo decide si un cambio programa guardado; lo ya programado se manda
  // aunque la ficha se haya cerrado, que es justo lo que pasa al dar "Listo".
  const enviar = useCallback(async () => {
    const v = valorRef.current;
    const motivo = validarRef.current?.(v) ?? null;
    if (motivo) {
      setEstado("error");
      setError(motivo);
      if (!avisado.current) {
        avisado.current = true;
        onErrorRef.current?.(motivo);
      }
      return;
    }

    const sig = firma(v);
    if (sig === firmaGuardada.current) {
      setPendiente(false);
      return;
    }
    if (enVuelo.current) {
      programar(250);
      return;
    }

    enVuelo.current = true;
    setEstado("guardando");
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: sig,
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        const mensaje = (d as { error?: string }).error ?? "No se pudo guardar.";
        setEstado("error");
        setError(mensaje);
        if (!avisado.current) {
          avisado.current = true;
          onErrorRef.current?.(mensaje);
        }
        return;
      }

      firmaGuardada.current = sig;
      avisado.current = false;
      setError(null);
      // Siguieron escribiendo mientras viajaba el PATCH: todavía falta una vuelta.
      if (firma(valorRef.current) !== sig) {
        programar(debounceMs);
      } else {
        setEstado("guardado");
        setPendiente(false);
      }
      onGuardadoRef.current?.();
    } catch {
      const mensaje = "Error de red: no se pudo guardar.";
      setEstado("error");
      setError(mensaje);
      if (!avisado.current) {
        avisado.current = true;
        onErrorRef.current?.(mensaje);
      }
    } finally {
      enVuelo.current = false;
    }
  }, [url, metodo, debounceMs, firma, programar]);

  useEffect(() => {
    valorRef.current = valor;
    cuerpoRef.current = cuerpo;
    validarRef.current = validar;
    onGuardadoRef.current = onGuardado;
    onErrorRef.current = onError;
    enviarRef.current = () => void enviar();
  });

  useEffect(() => {
    if (!activo) return;
    if (firma(valor) === firmaGuardada.current) return;
    setPendiente(true);
    programar(debounceMs);
  }, [valor, activo, debounceMs, firma, programar]);

  // Último disparo al salir: keepalive para que el PATCH sobreviva a la navegación.
  // Es justo el caso que se perdía antes: capturar y cambiar de página.
  useEffect(() => {
    const vaciar = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      const v = valorRef.current;
      if (validarRef.current?.(v)) return;
      const sig = firma(v);
      if (sig === firmaGuardada.current) return;
      firmaGuardada.current = sig;
      fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: sig,
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("pagehide", vaciar);
    return () => {
      window.removeEventListener("pagehide", vaciar);
      vaciar();
    };
  }, [url, metodo, firma]);

  return { estado, error, pendiente, guardarYa: () => programar(0) };
}
