import { fmtMoneda, relativo } from "@/lib/resumen/base";
import { Panel, Fila, Grupo, Vacio, Badge, type Tono } from "@/components/resumen/ui";

type Doc = {
  id: string;
  concepto: string;
  proyecto: string | null;
  proyectoFecha: string | null;
  fecha: string;
  saldo: number;
  dias: number;
};

export type BucketCartera = {
  total: number;
  n: number;
  grupos: { quien: string; total: number; n: number; diasMax: number; docs: Doc[] }[];
};

/**
 * Lectura de una cartera (CxC o CxP) agrupada por contraparte — sin acciones,
 * para la foto en vivo y para el detalle histórico de un cierre guardado.
 */
export function CarteraPanel({
  titulo,
  bucket,
  tipo,
  pasado,
  vacio,
  href,
}: {
  titulo: string;
  bucket: BucketCartera;
  tipo: "cobrar" | "pagar";
  /** Servicio ya ejecutado y aún sin cobrar/pagar — lo urgente. */
  pasado: boolean;
  vacio: string;
  href?: string;
}) {
  return (
    <Panel
      titulo={titulo}
      nota={`${bucket.n} documentos · ${bucket.grupos.length} ${tipo === "cobrar" ? "clientes" : "acreedores"} · ${fmtMoneda(bucket.total)}`}
      href={href}
      scroll
    >
      {bucket.grupos.length === 0 ? (
        <Vacio texto={vacio} />
      ) : (
        bucket.grupos.map(g => {
          const tonoGrupo: Tono = pasado ? (g.diasMax >= 30 ? "rojo" : "ambar") : tipo === "cobrar" ? "azul" : "neutro";
          return (
            <Grupo key={g.quien} titulo={g.quien} meta={`${g.n} ${g.n === 1 ? "documento" : "documentos"}`} valor={fmtMoneda(g.total)} tono={tonoGrupo}>
              {g.docs.map(d => {
                const etiqueta = pasado ? (d.dias > 0 ? `${d.dias}d` : "reprog.") : undefined;
                return (
                  <Fila
                    key={d.id}
                    titulo={d.concepto}
                    meta={[d.proyecto, d.proyectoFecha && `evento ${d.proyectoFecha}`].filter(Boolean).join(" · ") || undefined}
                    tono={tonoGrupo}
                    badge={etiqueta ? <Badge tono={d.dias >= 30 ? "rojo" : "ambar"}>{etiqueta}</Badge> : undefined}
                    valor={fmtMoneda(d.saldo)}
                    valorNota={pasado ? d.fecha : `${d.fecha} · ${relativo(-d.dias)}`}
                  />
                );
              })}
            </Grupo>
          );
        })
      )}
    </Panel>
  );
}
