import type { Metadata } from "next";
import { FramesView } from "@/src/components/FramesView";

export const metadata: Metadata = { title: "Frames — Dailies" };

export default function FramesPage() {
  return <FramesView />;
}
