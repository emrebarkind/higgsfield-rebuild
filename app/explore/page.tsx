import type { Metadata } from "next";
import { ExploreView } from "@/src/components/ExploreView";

export const metadata: Metadata = { title: "Explore — Dailies" };

export default function ExplorePage() {
  return <ExploreView />;
}
