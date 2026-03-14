import { appStateDb } from "@/services/appStateDb";

const QUEUE_WS_URL_KEY = "queue_ws_url";
const QUEUE_TERMINAL_ID_KEY = "queue_terminal_id";

export async function getQueueWsUrl(): Promise<string | null> {
  const v = await appStateDb.get(QUEUE_WS_URL_KEY);
  return v || null;
}

export async function setQueueWsUrl(url: string): Promise<void> {
  await appStateDb.set(QUEUE_WS_URL_KEY, url);
}

export async function clearQueueWsUrl(): Promise<void> {
  await appStateDb.remove(QUEUE_WS_URL_KEY);
}

export async function getQueueTerminalId(): Promise<string> {
  let id = await appStateDb.get(QUEUE_TERMINAL_ID_KEY);
  if (!id) {
    id = `QUEUE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await appStateDb.set(QUEUE_TERMINAL_ID_KEY, id);
  }
  return id;
}
