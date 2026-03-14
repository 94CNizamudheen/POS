import { appStateDb } from "@/services/appStateDb";

const CD_WS_URL_KEY = "cd_ws_url";
const CD_TERMINAL_ID_KEY = "cd_terminal_id";
const CD_SETTINGS_KEY = "cd_settings";

export async function getCdWsUrl(): Promise<string | null> {
  const v = await appStateDb.get(CD_WS_URL_KEY);
  return v || null;
}

export async function setCdWsUrl(url: string): Promise<void> {
  await appStateDb.set(CD_WS_URL_KEY, url);
}

export async function clearCdWsUrl(): Promise<void> {
  await appStateDb.remove(CD_WS_URL_KEY);
}

export async function getCdTerminalId(): Promise<string> {
  let id = await appStateDb.get(CD_TERMINAL_ID_KEY);
  if (!id) {
    id = `CD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await appStateDb.set(CD_TERMINAL_ID_KEY, id);
  }
  return id;
}

export async function getCdSettings(): Promise<{ welcomeMessage: string; promoMedia: any[] }> {
  return appStateDb.getJson(CD_SETTINGS_KEY, { welcomeMessage: "Welcome!", promoMedia: [] });
}

export async function saveCdSettings(settings: {
  welcomeMessage: string;
  promoMedia: any[];
}): Promise<void> {
  await appStateDb.setJson(CD_SETTINGS_KEY, settings);
}
