import { createClient } from "@/lib/supabase/server";
import type { Game, ScoreRow } from "@/lib/data";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export async function getGamesWithStats(): Promise<Game[]> {
  const supabase = await createClient();
  const [{ data: games }, { data: scores }] = await Promise.all([
    supabase.from("games").select("*"),
    supabase.from("scores").select("game_id, score"),
  ]);

  const stats = new Map<string, { best: number; plays: number }>();
  for (const row of scores ?? []) {
    const current = stats.get(row.game_id) ?? { best: 0, plays: 0 };
    stats.set(row.game_id, {
      best: Math.max(current.best, row.score),
      plays: current.plays + 1,
    });
  }

  return (games ?? []).map((game) => ({
    ...game,
    best: stats.get(game.id)?.best ?? 0,
    plays: stats.get(game.id)?.plays ?? 0,
  }));
}

export async function getGameById(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const [{ data: game }, { data: scores }] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).maybeSingle(),
    supabase.from("scores").select("score").eq("game_id", id),
  ]);

  if (!game) return null;

  const best = (scores ?? []).reduce((max, row) => Math.max(max, row.score), 0);

  return { ...game, best, plays: scores?.length ?? 0 };
}

export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}
