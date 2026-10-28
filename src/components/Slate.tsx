import { MOVES, type LensMm, type MoveId } from "@/src/lib/moves";

export function slateText(shot: number, take: number, moveId: MoveId, lensMm: LensMm): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `SHOT ${pad(shot)} · TAKE ${take} · ${MOVES[moveId].label.toUpperCase()} · ${lensMm}MM`;
}

export function Slate(props: { shot: number; take: number; moveId: MoveId; lensMm: LensMm; className?: string }) {
  return (
    <p className={`font-mono text-[11px] uppercase tracking-wider text-muted ${props.className ?? ""}`}>
      {slateText(props.shot, props.take, props.moveId, props.lensMm)}
    </p>
  );
}
