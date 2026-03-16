import { appStateApi } from "@/services/appStateDb";

const DEFAULT_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ?? "ws://127.0.0.1:3001";
const DEFAULT_ID =
  (import.meta.env.VITE_TERMINAL_ID as string | undefined) ?? "KIOSK-1";

export async function getPosUrl(): Promise<string> {
  const state = await appStateApi.get();
  return state.kiosk_pos_url || DEFAULT_URL;
}

export async function getTerminalId(): Promise<string> {
  const state = await appStateApi.get();
  return state.kiosk_terminal_id || DEFAULT_ID;
}

export async function saveConnectionConfig(url: string, id: string): Promise<void> {
  await appStateApi.setKioskPosUrl(url.trim());
  await appStateApi.setKioskTerminalId(id.trim());
}
