import { appStateDb } from "@/services/appStateDb";

const KDS_WS_URL_KEY = "kds_ws_url";
const KDS_TERMINAL_ID_KEY = "kds_terminal_id";

export async function getKdsWsUrl(): Promise<string | null> {
  const v = await appStateDb.get(KDS_WS_URL_KEY);
  return v || null;
}

export async function setKdsWsUrl(url: string): Promise<void> {
  await appStateDb.set(KDS_WS_URL_KEY, url);
}

export async function clearKdsWsUrl(): Promise<void> {
  await appStateDb.remove(KDS_WS_URL_KEY);
}

export async function getKdsTerminalId(): Promise<string> {
  let id = await appStateDb.get(KDS_TERMINAL_ID_KEY);
  if (!id) {
    id = `KDS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await appStateDb.set(KDS_TERMINAL_ID_KEY, id);
  }
  return id;
}
