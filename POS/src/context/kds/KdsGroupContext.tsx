import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { appStateDb } from "@/services/appStateDb";

export interface KdsGroup {
  id: string;
  name: string;
}

interface KdsGroupContextType {
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  isChildMode: boolean;
  groups: KdsGroup[];
  isMasterStation: boolean;
  saveGroups: (groups: KdsGroup[]) => Promise<void>;
}

const KdsGroupContext = createContext<KdsGroupContextType | undefined>(undefined);

export const GROUPS_KEY = "kds_groups";

export function KdsGroupProvider({ children }: { children: ReactNode }) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<KdsGroup[]>([]);

  useEffect(() => {
    appStateDb.getJson<KdsGroup[]>(GROUPS_KEY, []).then(setGroups);
  }, []);

  const saveGroups = async (updated: KdsGroup[]) => {
    setGroups(updated);
    await appStateDb.setJson(GROUPS_KEY, updated);
  };

  return (
    <KdsGroupContext.Provider
      value={{
        selectedGroupId,
        setSelectedGroupId,
        isChildMode: selectedGroupId !== null,
        groups,
        isMasterStation: true,
        saveGroups,
      }}
    >
      {children}
    </KdsGroupContext.Provider>
  );
}

export function useKdsGroup() {
  const ctx = useContext(KdsGroupContext);
  if (!ctx) throw new Error("useKdsGroup must be used within KdsGroupProvider");
  return ctx;
}
