import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const RATE_LIMIT_MS = 5000;
const lastSuccessByIp = new Map<string, number>();

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function sanitizePlayerName(raw: unknown): string {
  const value = typeof raw === "string" ? raw : "";
  const cleaned = value
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .slice(0, 12);
  return cleaned.length > 0 ? cleaned : "INVITADO";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    gameId?: unknown;
    score?: unknown;
    playerName?: unknown;
  } | null;

  const ip = getClientIp(request);
  const lastSuccess = lastSuccessByIp.get(ip);
  if (lastSuccess && Date.now() - lastSuccess < RATE_LIMIT_MS) {
    return NextResponse.json(
      {
        ok: false,
        error: "Espera unos segundos antes de guardar otra puntuación.",
      },
      { status: 429 },
    );
  }

  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const score = body?.score;

  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score <= 0 ||
    score > 999999
  ) {
    return NextResponse.json(
      { ok: false, error: "Puntuación inválida." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("id", gameId)
    .maybeSingle();

  if (!game) {
    return NextResponse.json(
      { ok: false, error: "El juego no existe." },
      { status: 404 },
    );
  }

  const playerName = sanitizePlayerName(body?.playerName);

  const { data: inserted, error } = await supabase
    .from("scores")
    .insert({ game_id: gameId, player_name: playerName, score })
    .select()
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar la puntuación." },
      { status: 500 },
    );
  }

  lastSuccessByIp.set(ip, Date.now());

  return NextResponse.json({ ok: true, score: inserted });
}
