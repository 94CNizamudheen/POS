import { appStateApi } from "@/services/appStateDb";

export async function getKdsWsUrl(): Promise<string | null> {
  const state = await appStateApi.get();
  return state.kds_ws_url || null;
}

export async function setKdsWsUrl(url: string): Promise<void> {
  await appStateApi.setKdsWsUrl(url);
}

export async function clearKdsWsUrl(): Promise<void> {
  await appStateApi.setKdsWsUrl("");
}

export async function getKdsTerminalId(): Promise<string> {
  const state = await appStateApi.get();
  if (state.kds_terminal_id) return state.kds_terminal_id;
  const id = `KDS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await appStateApi.setKdsTerminalId(id);
  return id;
}
