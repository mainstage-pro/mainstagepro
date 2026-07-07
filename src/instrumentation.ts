import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      // Captura el 100% de errores, 10% de performance en producción
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      // No enviar errores en desarrollo local si no hay DSN
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
