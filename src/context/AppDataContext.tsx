import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Armada, Barang, Karoseri, Pengiriman, StrategiTerpilih } from "../types";
import { nextId } from "../lib/utils";

interface AppDataContextValue {
  karoseriList: Karoseri[];
  armadaList: Armada[];
  pengirimanList: Pengiriman[];
  barangList: Barang[];

  addKaroseri: (data: Omit<Karoseri, "id" | "createdAt" | "status">) => void;
  addKaroseriBulk: (rows: Omit<Karoseri, "id" | "createdAt" | "status">[]) => void;
  removeKaroseri: (id: string) => void;
  updateKaroseri: (id: string, data: Partial<Karoseri>) => void;
  updateKaroseriStatus: (id: string, status: Karoseri["status"]) => void;

  addArmada: (data: Omit<Armada, "id" | "createdAt" | "status">) => void;
  removeArmada: (id: string) => void;
  updateArmada: (id: string, data: Partial<Armada>) => void;

  addPengiriman: (kodePengiriman: string) => void;
  removePengiriman: (id: string) => void;
  updatePengirimanStatus: (id: string, status: Pengiriman["status"]) => void;

  addBarang: (data: Omit<Barang, "id" | "createdAt">) => void;
  addBarangBulk: (rows: Omit<Barang, "id" | "createdAt">[]) => void;
  updateBarang: (id: string, data: Partial<Barang>) => void;
  removeBarang: (id: string) => void;

  selectedStrategi: StrategiTerpilih | null;
  setSelectedStrategi: (value: StrategiTerpilih | null) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const STORAGE_KEY = "volumetrix:v1";

interface StoredState {
  karoseriList: Karoseri[];
  armadaList: Armada[];
  pengirimanList: Pengiriman[];
  barangList: Barang[];
  selectedStrategi: StrategiTerpilih | null;
}

function loadStored(): Partial<StoredState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<StoredState>) : {};
    return {
      ...parsed,
      // migrasi data lama: armada tanpa jumlah dianggap 1 unit
      armadaList: (parsed.armadaList ?? []).map((a) => ({ ...a, jumlah: a.jumlah ?? 1 })),
    };
  } catch {
    return {};
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const stored = useState(loadStored)[0];
  const [karoseriList, setKaroseriList] = useState<Karoseri[]>(stored.karoseriList ?? []);
  const [armadaList, setArmadaList] = useState<Armada[]>(stored.armadaList ?? []);
  const [pengirimanList, setPengirimanList] = useState<Pengiriman[]>(stored.pengirimanList ?? []);
  const [barangList, setBarangList] = useState<Barang[]>(stored.barangList ?? []);
  const [selectedStrategi, setSelectedStrategi] = useState<StrategiTerpilih | null>(stored.selectedStrategi ?? null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ karoseriList, armadaList, pengirimanList, barangList, selectedStrategi } satisfies StoredState)
      );
    } catch {
      // storage penuh / tidak tersedia — abaikan, data tetap hidup sesi ini
    }
  }, [karoseriList, armadaList, pengirimanList, barangList, selectedStrategi]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      karoseriList,
      armadaList,
      pengirimanList,
      barangList,

      addKaroseri: (data) =>
        setKaroseriList((prev) => [
          ...prev,
          {
            ...data,
            id: nextId("KRS", prev.map((k) => k.id)),
            status: "ready",
            createdAt: Date.now(),
          },
        ]),

      addKaroseriBulk: (rows) =>
        setKaroseriList((prev) => {
          const next = [...prev];
          rows.forEach((data) => {
            next.push({
              ...data,
              id: nextId("KRS", next.map((k) => k.id)),
              status: "ready",
              createdAt: Date.now(),
            });
          });
          return next;
        }),

      removeKaroseri: (id) =>
        setKaroseriList((prev) => prev.filter((k) => k.id !== id)),

      updateKaroseriStatus: (id, status) =>
        setKaroseriList((prev) =>
          prev.map((k) => (k.id === id ? { ...k, status } : k))
        ),

      updateKaroseri: (id, data) =>
        setKaroseriList((prev) =>
          prev.map((k) => (k.id === id ? { ...k, ...data } : k))
        ),

      addArmada: (data) =>
        setArmadaList((prev) => [
          ...prev,
          {
            ...data,
            id: nextId("ARM", prev.map((a) => a.id)),
            status: "ready",
            createdAt: Date.now(),
          },
        ]),

      removeArmada: (id) =>
        setArmadaList((prev) => prev.filter((a) => a.id !== id)),

      updateArmada: (id, data) =>
        setArmadaList((prev) =>
          prev.map((a) => (a.id === id ? { ...a, ...data } : a))
        ),

      addPengiriman: (kodePengiriman) =>
        setPengirimanList((prev) => [
          ...prev,
          {
            id: nextId("PGR", prev.map((p) => p.id)),
            kodePengiriman,
            status: "persiapan",
            createdAt: Date.now(),
          },
        ]),

      removePengiriman: (id) =>
        setPengirimanList((prev) => prev.filter((p) => p.id !== id)),

      updatePengirimanStatus: (id, status) =>
        setPengirimanList((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status } : p))
        ),

      addBarang: (data) =>
        setBarangList((prev) => [
          ...prev,
          { ...data, id: nextId("BRG", prev.map((b) => b.id)), createdAt: Date.now() },
        ]),

      addBarangBulk: (rows) =>
        setBarangList((prev) => {
          const next = [...prev];
          rows.forEach((data) => {
            next.push({
              ...data,
              id: nextId("BRG", next.map((b) => b.id)),
              createdAt: Date.now(),
            });
          });
          return next;
        }),

      updateBarang: (id, data) =>
        setBarangList((prev) =>
          prev.map((b) => (b.id === id ? { ...b, ...data } : b))
        ),

      removeBarang: (id) =>
        setBarangList((prev) => prev.filter((b) => b.id !== id)),

      selectedStrategi,
      setSelectedStrategi,
    }),
    [karoseriList, armadaList, pengirimanList, barangList, selectedStrategi]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData harus dipakai di dalam AppDataProvider");
  return ctx;
}
