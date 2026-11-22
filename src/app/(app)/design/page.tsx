import type { Metadata } from "next";
import { KitShowcase } from "@/features/design/KitShowcase";

export const metadata: Metadata = { title: "UI kit · CityVoice" };

export default function DesignPage() {
  return <KitShowcase />;
}
