import { invoke } from "@tauri-apps/api/core";

export interface KdsStation {
  id: string;
  name: string;
  isMaster: number; // 0 | 1
  groupIds: string; // JSON array string e.g. '["grp-123"]'
  sortOrder: number;
  active: number; // 0 | 1
  createdAt?: string;
  updatedAt?: string;
}

function toRust(station: KdsStation) {
  return {
    id: station.id,
    name: station.name,
    is_master: station.isMaster,
    group_ids: station.groupIds,
    sort_order: station.sortOrder,
    active: station.active,
    created_at: station.createdAt ?? null,
    updated_at: station.updatedAt ?? null,
  };
}

function fromRust(s: any): KdsStation {
  return {
    id: s.id,
    name: s.name,
    isMaster: s.is_master,
    groupIds: s.group_ids,
    sortOrder: s.sort_order,
    active: s.active,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

export const kdsStationLocal = {
  async getAll(): Promise<KdsStation[]> {
    try {
      const stations = await invoke<any[]>("get_kds_stations");
      return stations.map(fromRust);
    } catch {
      return [];
    }
  },

  async save(station: KdsStation): Promise<void> {
    await invoke("save_kds_station", { station: toRust(station) });
  },

  async delete(id: string): Promise<void> {
    await invoke("delete_kds_station", { id });
  },

  async getStationId(): Promise<string> {
    try {
      return await invoke<string>("get_kds_station_id");
    } catch {
      return "";
    }
  },

  async setStationId(stationId: string): Promise<void> {
    await invoke("set_kds_station_id", { stationId });
  },

  parseGroupIds(station: KdsStation): string[] {
    try {
      return JSON.parse(station.groupIds);
    } catch {
      return [];
    }
  },
};
