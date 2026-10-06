import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CONTEXTO_RIDER_LABEL } from "@/lib/giras";
import SubNav, { type EnlaceSub } from "../SubNav";
import { riderEditableDeGira } from "./rider";

export const dynamic = "force-dynamic";

export default async function CanalesGiraLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const rider = await riderEditableDeGira(id);

  if (!rider) {
    return (
      <div className="ms-page space-y-4">
        <h1 className="ms-h1">Canales</h1>
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            Esta gira no tiene rider contra el cual capturar canales: el artista no tiene ninguno vigente.{" "}
            <Link href={`/giras/${id}`} className="ms-link-gold">
              Engancha un rider desde el resumen de la gira
            </Link>{" "}
            o créale uno al artista.
          </p>
        </div>
      </div>
    );
  }

  const enlaces: EnlaceSub[] = [
    { href: `/giras/${id}/canales`, label: "Input list", llave: "canales-input", exacto: true },
    { href: `/giras/${id}/canales/salidas`, label: "Output list", llave: "canales-output" },
  ];

  return (
    <div className="ms-page space-y-4">
      <div className="ms-card p-4 space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h1 className="ms-h1">Canales</h1>
          <span className="ms-meta">
            editando «{rider.nombre}» v{rider.version} · {CONTEXTO_RIDER_LABEL[rider.contexto] ?? rider.contexto} ·{" "}
            {rider.artistaNombre}
          </span>
        </div>
        <p className="ms-subtitle">
          La input y la output list son del rider del artista, no de la gira: lo que cambies aquí es lo mismo que se ve
          en la ficha del artista y vale para todas sus fechas. Lo que solo pasa en una plaza —un invitado, un canal
          extra— se captura en «Invitados y canales» del show.
        </p>
        <p className="ms-micro">
          {rider.enganchado
            ? "Esta gira trae este rider enganchado."
            : "Esta gira no trae rider enganchado: se está usando el vigente del artista."}{" "}
          <Link href={`/giras/artista/${rider.artistaId}/rider/${rider.id}`} className="ms-link-gold">
            abrir el rider completo →
          </Link>
        </p>
      </div>

      <SubNav enlaces={enlaces} scope="gira-canales" />

      {children}
    </div>
  );
}
