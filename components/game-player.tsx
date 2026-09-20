"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import type { Game } from "@/lib/data";
import {
  AsteroidsGame,
  type AsteroidsGameHandle,
  type AsteroidsState,
} from "@/components/games/asteroids-game";

const DEMO_SCORE = 15420;
const DEMO_LIVES = 3;
const DEMO_LEVEL = 2;

type SaveState = "idle" | "guardando" | "guardado" | "error";

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useAuth();
  const isAsteroids = game.id === "asteroides";
  const asteroidsRef = useRef<AsteroidsGameHandle>(null);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [liveState, setLiveState] = useState<AsteroidsState>({
    score: 0,
    lives: 3,
    level: 1,
    state: "playing",
  });
  const [playerName, setPlayerName] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const name = user ? user.name : "INVITADO";

  const score = isAsteroids ? liveState.score : DEMO_SCORE;
  const lives = isAsteroids ? liveState.lives : DEMO_LIVES;
  const level = isAsteroids ? liveState.level : DEMO_LEVEL;
  const isOver = isAsteroids ? liveState.state === "gameover" : over;

  const handlePauseClick = () => {
    setPaused((p) => {
      const next = !p;
      if (isAsteroids) {
        if (next) asteroidsRef.current?.pause();
        else asteroidsRef.current?.resume();
      }
      return next;
    });
  };

  const handleFinClick = () => {
    if (isAsteroids) asteroidsRef.current?.forceGameOver();
    else setOver((o) => !o);
  };

  const handleSaveScore = async () => {
    setSaveState("guardando");
    setSaveError("");
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id, score, playerName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 429) {
          setSaveError(
            "Espera unos segundos antes de guardar otra puntuación.",
          );
        } else {
          setSaveError(body?.error ?? "No se pudo guardar la puntuación.");
        }
        setSaveState("error");
        return;
      }
      setSaveState("guardado");
    } catch {
      setSaveError("No se pudo guardar la puntuación.");
      setSaveState("error");
    }
  };

  const handleRestart = () => {
    setPlayerName("");
    setSaveState("idle");
    setSaveError("");
    asteroidsRef.current?.restart();
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={handlePauseClick}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={handleFinClick}>
            FIN
          </button>
          <Link href={`/game/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroids ? (
            <AsteroidsGame ref={asteroidsRef} onStateChange={setLiveState} />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
          {isOver && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-magenta" style={{ fontSize: 22 }}>
                  FIN DEL JUEGO
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PUNTUACIÓN FINAL · {score.toLocaleString("es-ES")}
                </div>
                {isAsteroids && (
                  <>
                    <div
                      style={{
                        marginTop: 18,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {saveState === "guardado" ? (
                        <div
                          className="mono"
                          style={{ fontSize: 11, color: "var(--green)" }}
                        >
                          ✔ PUNTUACIÓN GUARDADA
                        </div>
                      ) : (
                        <>
                          <input
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            placeholder="NOMBRE (OPCIONAL)"
                            maxLength={12}
                            className="mono"
                            style={{
                              background: "var(--bg-2)",
                              border: "1px solid var(--line)",
                              color: "var(--ink)",
                              padding: "8px 12px",
                              textAlign: "center",
                              letterSpacing: "0.08em",
                            }}
                            disabled={saveState === "guardando"}
                          />
                          <button
                            className="btn magenta"
                            onClick={handleSaveScore}
                            disabled={saveState === "guardando"}
                          >
                            {saveState === "guardando"
                              ? "GUARDANDO…"
                              : "GUARDAR PUNTUACIÓN"}
                          </button>
                          {saveState === "error" && (
                            <div
                              className="mono"
                              style={{ fontSize: 10, color: "var(--magenta)" }}
                            >
                              {saveError}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <button
                      className="btn yellow"
                      style={{ marginTop: 14 }}
                      onClick={handleRestart}
                    >
                      JUGAR DE NUEVO
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
    </div>
  );
}
