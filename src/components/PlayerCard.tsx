import type { CardView } from "@/lib/cardStyles";
import { EDITIONS } from "@/lib/player";
import { GameBoyCard } from "./cards/GameBoyCard";
import { RpgCard } from "./cards/RpgCard";
import { ArcadeCard } from "./cards/ArcadeCard";
import { TradingCard } from "./cards/TradingCard";

// 1em = 1/16 van de kaartbreedte
const SIZES = { sm: 10, md: 12, lg: 19 } as const;

/** De Player Card in de stijl die de speler zelf gekozen heeft. */
export function PlayerCard({ card, size = "md", locked }: { card: CardView; size?: keyof typeof SIZES; locked?: boolean }) {
  const Body = { gameboy: GameBoyCard, rpg: RpgCard, arcade: ArcadeCard, trading: TradingCard }[card.style];
  return (
    <div
      className={`retro-card relative shrink-0 select-none ${locked ? "retro-card-locked" : ""}`}
      style={{ fontSize: SIZES[size], width: "16em", height: "22.4em" }}
      role="img"
      aria-label={`Player Card van ${card.name}: ${card.stats.ovr ?? "geen"} OVR, ${EDITIONS[card.edition].name}`}
    >
      <Body c={card} />
      {locked && (
        <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: "3em" }} aria-label="nog niet vrijgespeeld">
          🔒
        </span>
      )}
    </div>
  );
}
