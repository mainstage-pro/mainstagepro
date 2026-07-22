"use client";

import { useAccess } from "@/components/AccessProvider";
import { VISION_AREAS } from "@/lib/vision-semanal";
import VisionSemanalClient from "../../vision-semanal/VisionSemanalClient";

export default function VisionSemanalTab() {
  const { area, isAdmin } = useAccess();
  return (
    <VisionSemanalClient areas={[...VISION_AREAS]} areaInicial={null} userArea={area} isAdmin={isAdmin} />
  );
}
