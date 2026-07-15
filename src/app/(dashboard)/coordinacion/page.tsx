"use client";

import ModuleTabs from "@/components/ModuleTabs";
import { useAccess } from "@/components/AccessProvider";
import { VISION_AREAS } from "@/lib/vision-semanal";
import JuntasPage from "../juntas/page";
import FormulariosPage from "../formularios/page";
import VisionSemanalClient from "../vision-semanal/VisionSemanalClient";

export default function CoordinacionPage() {
  const { area, isAdmin } = useAccess();
  return (
    <ModuleTabs
      tabs={[
        { key: "juntas", label: "Juntas", accessKey: "juntas", content: <JuntasPage /> },
        {
          key: "vision",
          label: "Visión semanal",
          accessKey: "vision-semanal",
          content: (
            <VisionSemanalClient areas={[...VISION_AREAS]} areaInicial={null} userArea={area} isAdmin={isAdmin} />
          ),
        },
        { key: "formularios", label: "Formularios", accessKey: "formularios", adminOnly: true, content: <FormulariosPage /> },
      ]}
    />
  );
}
