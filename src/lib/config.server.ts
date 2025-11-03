import "server-only";
import { readFile } from "node:fs/promises";

export async function loadConfig() {
  const raw = await readFile("config.json", "utf8");
  return JSON.parse(raw);
}
