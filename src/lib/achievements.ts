import type { Game, LeaderboardRow, MatchResult } from "./types";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: "trophy" | "flame" | "crown" | "star" | "sparkles" | "home" | "swords" | "medal";
  earned: boolean;
  progress?: string;
};

type Input = {
  userId: string;
  results: MatchResult[]; // alle resultaten van deze speler
  leaderboard: LeaderboardRow[]; // alle leaderboard-rijen (alle games)
  games: Game[];
  hostedNights: number; // afgeronde avonden als host
  seasonTitles?: number; // aantal gewonnen seizoenen
};

export function computeAchievements({ userId, results, leaderboard, games, hostedNights, seasonTitles = 0 }: Input) {
  const wins = results.filter((r) => r.is_winner).length;
  const played = results.length;
  const distinctGames = new Set(results.map((r) => r.game_id)).size;
  const sharedFirst = results.filter((r) => r.placement === 1 && !r.is_winner).length;

  const winsPerGame = new Map<string, number>();
  for (const r of results) if (r.is_winner) winsPerGame.set(r.game_id, (winsPerGame.get(r.game_id) ?? 0) + 1);
  const bestWinsInGame = Math.max(0, ...winsPerGame.values());

  const championOf = leaderboard
    .filter((l) => l.user_id === userId && l.rank === 1)
    .map((l) => games.find((g) => g.id === l.game_id)?.name)
    .filter(Boolean) as string[];

  const list: Achievement[] = [
    {
      id: "first-win",
      title: "Eerste zege",
      description: "Win je eerste potje",
      icon: "star",
      earned: wins >= 1,
    },
    {
      id: "hattrick",
      title: "Hattrick",
      description: "Win 3 potjes van dezelfde game",
      icon: "flame",
      earned: bestWinsInGame >= 3,
      progress: `${Math.min(bestWinsInGame, 3)}/3`,
    },
    {
      id: "ten-wins",
      title: "Legende",
      description: "Win in totaal 10 potjes",
      icon: "medal",
      earned: wins >= 10,
      progress: `${Math.min(wins, 10)}/10`,
    },
    {
      id: "regular",
      title: "Vaste gast",
      description: "Speel 10 potjes",
      icon: "swords",
      earned: played >= 10,
      progress: `${Math.min(played, 10)}/10`,
    },
    {
      id: "allrounder",
      title: "Allrounder",
      description: "Speel 5 verschillende games",
      icon: "sparkles",
      earned: distinctGames >= 5,
      progress: `${Math.min(distinctGames, 5)}/5`,
    },
    {
      id: "host",
      title: "Gastheer",
      description: "Host 3 gamenights",
      icon: "home",
      earned: hostedNights >= 3,
      progress: `${Math.min(hostedNights, 3)}/3`,
    },
    {
      id: "photo-finish",
      title: "Fotofinish",
      description: "Eindig gelijk op de eerste plek",
      icon: "medal",
      earned: sharedFirst >= 1,
    },
    {
      id: "season",
      title: "Seizoenskampioen",
      description: "Eindig een seizoen als #1",
      icon: "trophy",
      earned: seasonTitles > 0,
    },
    {
      id: "champion",
      title: "Kampioen",
      description: "Sta #1 op een leaderboard",
      icon: "crown",
      earned: championOf.length > 0,
    },
  ];

  const titles = championOf.map((name) => `Kampioen ${name}`);
  return { list, titles, stats: { wins, played, distinctGames } };
}
