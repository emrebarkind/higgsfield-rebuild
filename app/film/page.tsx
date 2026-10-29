import type { Metadata } from "next";
import { FilmView } from "@/src/components/FilmView";

export const metadata: Metadata = { title: "Product film — Dailies" };

export default function FilmPage() {
  return <FilmView />;
}
