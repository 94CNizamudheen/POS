import { invoke } from "@tauri-apps/api/core";

/**
 * Thin async wrapper around the Tauri key-value app_state table.
 * All settings/config that previously used localStorage go through here.
 */
export const appStateDb = {
  async get(key: string): Promise<string | null> {
    try {
      const value = await invoke<string | null>("get_app_state", { key });
      return value ?? null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      await invoke("set_app_state", { key, value });
    } catch {
      // Silent — non-critical config write
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await invoke("set_app_state", { key, value: "" });
    } catch {}
  },

  async getJson<T>(key: string, fallback: T): Promise<T> {
    const raw = await appStateDb.get(key);
    if (!raw || raw === "") return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  async setJson(key: string, value: unknown): Promise<void> {
    await appStateDb.set(key, JSON.stringify(value));
  },
};
