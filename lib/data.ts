export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: number;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
