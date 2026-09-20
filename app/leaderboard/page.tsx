import type { ScoreRow } from "@/lib/data";
import { getGamesWithStats, getTopScores } from "@/lib/queries";
import { LeaderboardBoard } from "@/components/leaderboard-board";

export default async function LeaderboardPage() {
  const games = await getGamesWithStats();

  const scoresByGame: Record<string, ScoreRow[]> = {};
  await Promise.all(
    games.map(async (g) => {
      scoresByGame[g.id] = await getTopScores(g.id, 12);
    }),
  );

  return <LeaderboardBoard games={games} scoresByGame={scoresByGame} />;
}
