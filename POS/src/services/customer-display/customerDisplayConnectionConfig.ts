import { appStateApi } from "@/services/appStateDb";

export async function getCdWsUrl(): Promise<string | null> {
  const state = await appStateApi.get();
  return state.cd_ws_url || null;
}

export async function setCdWsUrl(url: string): Promise<void> {
  await appStateApi.setCdWsUrl(url);
}

export async function clearCdWsUrl(): Promise<void> {
  await appStateApi.setCdWsUrl("");
}

export async function getCdTerminalId(): Promise<string> {
  const state = await appStateApi.get();
  if (state.cd_terminal_id) return state.cd_terminal_id;
  const id = `CD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await appStateApi.setCdTerminalId(id);
  return id;
}

export async function getCdSettings(): Promise<{ welcomeMessage: string; promoMedia: any[] }> {
  const state = await appStateApi.get();
  if (!state.cd_settings) return { welcomeMessage: "Welcome!", promoMedia: [] };
  try {
    return JSON.parse(state.cd_settings);
  } catch {
    return { welcomeMessage: "Welcome!", promoMedia: [] };
  }
}

export async function saveCdSettings(settings: {
  welcomeMessage: string;
  promoMedia: any[];
}): Promise<void> {
  await appStateApi.setCdSettings(JSON.stringify(settings));
}
