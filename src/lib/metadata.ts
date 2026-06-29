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
  const ogImageUrl = image 
    ? (image.startsWith("http") ? image : `https://mainstagepro.vercel.app${image}`)
    : `https://mainstagepro.vercel.app${defaultImage}`;

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
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImageUrl],
    },
  };
}
