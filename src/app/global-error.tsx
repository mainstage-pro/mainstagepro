"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ background: "#0a0a0a", color: "#fff", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: "#B3985B", fontSize: 22, marginBottom: 8 }}>
            Algo salió mal
          </h2>
          <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
            El error fue reportado automáticamente. Puedes intentar de nuevo o contactar soporte.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#B3985B",
              color: "#000",
              border: "none",
              padding: "10px 24px",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
