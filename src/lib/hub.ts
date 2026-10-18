import type { Achievement } from "./achievements";
import type { ResultRow, Standing } from "./stats";

/** Jouw afgeronde potjes, oudste eerst. */
function myResults(results: ResultRow[], userId: string) {
  return results
    .filter((r) => r.user_id === userId)
    .sort((a, b) => a.finished_at.localeCompare(b.finished_at) || a.match_id.localeCompare(b.match_id));
}

/** Huidige reeks: hoeveel potjes je op rij gewonnen hebt (wins), of op rij níet gewonnen (losses). */
export function currentStreak(results: ResultRow[], userId: string) {
  const mine = myResults(results, userId);
  let wins = 0;
  let losses = 0;
  for (let i = mine.length - 1; i >= 0; i--) {
    if (mine[i].is_winner) {
      if (losses) break;
      wins++;
    } else {
      if (wins) break;
      losses++;
    }
  }
  return { wins, losses };
}

/** De laatste vijf afgeronde potjes, oudste links: true = gewonnen. */
export function recentForm(results: ResultRow[], userId: string, n = 5) {
  return myResults(results, userId)
    .slice(-n)
    .map((r) => r.is_winner);
}

/** "2/3" → 0.67; geen voortgang → null. */
function ratio(progress?: string) {
  const m = progress?.match(/^(\d+)\/(\d+)$/);
  if (!m) return null;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return b > 0 ? { a, b, r: a / b } : null;
}

/**
 * Volgende achievement: het niet-behaalde achievement waar je het dichtst bij zit.
 * Zonder meetbare voortgang tonen we geen balk.
 */
export function nextAchievement(list: Achievement[]) {
  const open = list.filter((a) => !a.earned);
  if (!open.length) return null;
  const measured = open
    .map((a) => ({ a, p: ratio(a.progress) }))
    .filter((x) => x.p)
    .sort((x, y) => y.p!.r - x.p!.r);
  const pick = measured.find((x) => x.p!.a > 0) ?? measured[0];
  if (pick) return { achievement: pick.a, done: pick.p!.a, goal: pick.p!.b };
  return { achievement: open[0], done: null, goal: null };
}

export type Rival = { user_id: string; rank: number; points: number; diff: number; ahead: boolean };

/** De speler die in punten het dichtst bij jou staat op de seizoensranglijst (bij gelijkspel: die boven je). */
export function pickRival(rows: Standing[], userId: string): Rival | null {
  const me = rows.find((r) => r.user_id === userId);
  if (!me) return null;
  const others = rows.filter((r) => r.user_id !== userId);
  if (!others.length) return null;
  const best = [...others].sort((a, b) => {
    const da = Math.abs(a.points - me.points);
    const db = Math.abs(b.points - me.points);
    if (da !== db) return da - db;
    const aAbove = a.rank < me.rank || a.points > me.points ? 0 : 1;
    const bAbove = b.rank < me.rank || b.points > me.points ? 0 : 1;
    return aAbove - bAbove || a.rank - b.rank;
  })[0];
  return {
    user_id: best.user_id,
    rank: best.rank,
    points: best.points,
    diff: Math.abs(best.points - me.points),
    ahead: best.points > me.points || (best.points === me.points && best.rank < me.rank),
  };
}

export type HubMessage = { title: string; text: string; emoji: string };

/** Begroeting op basis van echte prestaties. Altijd dezelfde uitkomst voor dezelfde stand. */
export function playerMessage(input: {
  played: number;
  wins: number;
  seasonRank: number | null;
  seasonPlayed: number;
  streak: { wins: number; losses: number };
  lastWon: boolean;
  rival: Rival | null;
  rivalName?: string;
}): HubMessage {
  const { played, wins, seasonRank, streak, lastWon, rival, rivalName } = input;
  if (played === 0) return { emoji: "🐣", title: "WELCOME, ROOKIE!", text: "Tijd om je eerste overwinning te pakken." };
  if (seasonRank === 1 && input.seasonPlayed > 0)
    return { emoji: "👑", title: "ALL HAIL THE KING!", text: "Jij staat bovenaan het seizoen." };
  if (lastWon && wins > 0 && wins % 5 === 0)
    return { emoji: "🌟", title: "LEGENDARY!", text: `Zege nummer ${wins} is binnen. Wat een mijlpaal!` };
  if (streak.wins >= 2) return { emoji: "🔥", title: "ON FIRE!", text: `Je hebt ${streak.wins} potjes op rij gewonnen.` };
  if (lastWon && wins === 1) return { emoji: "🎉", title: "FIRST BLOOD!", text: "Je eerste zege staat op je naam." };
  if (streak.losses >= 3) return { emoji: "🌧️", title: "ROUGH TIMES!", text: "Het zit je de laatste potjes niet mee." };
  if (rival && rival.ahead && rivalName)
    return {
      emoji: "⚔️",
      title: "CHASE MODE!",
      text: rival.diff === 0 ? `Gelijk met ${rivalName}. Eén zege en je staat erboven.` : `Nog ${rival.diff} ${rival.diff === 1 ? "punt" : "punten"} tot ${rivalName}.`,
    };
  if (rival && !rival.ahead && rivalName)
    return { emoji: "🛡️", title: "HOLD THE LINE!", text: `${rivalName} zit ${rival.diff} ${rival.diff === 1 ? "punt" : "punten"} achter je.` };
  if (seasonRank === null) return { emoji: "🎮", title: "NEW SEASON!", text: "Speel een potje om dit seizoen op de ranglijst te komen." };
  return { emoji: "🎮", title: "GAME ON!", text: "Klaar voor het volgende potje?" };
}
