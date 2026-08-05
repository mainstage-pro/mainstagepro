import { Metadata } from "next";

interface CustomMetadataOptions {
  title: string;
  description: string;
  path: string;
  image?: string | null;
}

export function getPresentationMetadata({
  title,
  description,
  path,
  image,
}: CustomMetadataOptions): Metadata {
  const url = `https://mainstagepro.vercel.app${path}`;
  const fullTitle = `${title} — Mainstage Pro`;
  const defaultImage = "/pwa-icon-512.png";
  const hasCustomImage = Boolean(image);
  const ogImageUrl = image
    ? (image.startsWith("http") ? image : `https://mainstagepro.vercel.app${image}`)
    : `https://mainstagepro.vercel.app${defaultImage}`;
  // Sin imagen propia usamos el logo cuadrado: los clientes de chat (WhatsApp)
  // lo muestran como ícono pequeño en vez de un banner grande.
  const dims = hasCustomImage ? { width: 1200, height: 630 } : { width: 512, height: 512 };

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: "Mainstage Pro",
      images: [
        {
          url: ogImageUrl,
          ...dims,
          alt: title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: hasCustomImage ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      images: [ogImageUrl],
    },
  };
}
