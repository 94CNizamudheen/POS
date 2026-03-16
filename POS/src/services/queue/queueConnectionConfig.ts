import { appStateApi } from "@/services/appStateDb";

export async function getQueueWsUrl(): Promise<string | null> {
  const state = await appStateApi.get();
  return state.queue_ws_url || null;
}

export async function setQueueWsUrl(url: string): Promise<void> {
  await appStateApi.setQueueWsUrl(url);
}

export async function clearQueueWsUrl(): Promise<void> {
  await appStateApi.setQueueWsUrl("");
}

export async function getQueueTerminalId(): Promise<string> {
  const state = await appStateApi.get();
  if (state.queue_terminal_id) return state.queue_terminal_id;
  const id = `QUEUE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await appStateApi.setQueueTerminalId(id);
  return id;
}
