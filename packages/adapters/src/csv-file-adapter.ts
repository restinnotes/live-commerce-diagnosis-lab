import { readFile } from "node:fs/promises";
export async function readCsvFile(path: string): Promise<Record<string, string>[]> {
  const text = await readFile(path, "utf8");
  const [header = "", ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((v, i) => [cols[i], v])));
}
