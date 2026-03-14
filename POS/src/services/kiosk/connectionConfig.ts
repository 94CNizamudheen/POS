import { appStateDb } from "@/services/appStateDb";

const LS_URL_KEY = "kiosk_pos_url";
const LS_ID_KEY = "kiosk_terminal_id";

const DEFAULT_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ?? "ws://127.0.0.1:3001";
const DEFAULT_ID =
  (import.meta.env.VITE_TERMINAL_ID as string | undefined) ?? "KIOSK-1";

export async function getPosUrl(): Promise<string> {
  const v = await appStateDb.get(LS_URL_KEY);
  return v || DEFAULT_URL;
}

export async function getTerminalId(): Promise<string> {
  const v = await appStateDb.get(LS_ID_KEY);
  return v || DEFAULT_ID;
}

export async function saveConnectionConfig(url: string, id: string): Promise<void> {
  await appStateDb.set(LS_URL_KEY, url.trim());
  await appStateDb.set(LS_ID_KEY, id.trim());
}
