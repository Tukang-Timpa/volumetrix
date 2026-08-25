import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Armada, Barang, Karoseri, Pengiriman, StrategiTerpilih } from "../types";

const API_BASE = "http://localhost:8001";

interface AppDataContextValue {
  karoseriList: Karoseri[];
  armadaList: Armada[];
  pengirimanList: Pengiriman[];
  barangList: Barang[];

  addKaroseri: (data: Omit<Karoseri, "id" | "createdAt" | "status">) => Promise<void>;
  addKaroseriBulk: (rows: Omit<Karoseri, "id" | "createdAt" | "status">[]) => Promise<void>;
  removeKaroseri: (id: string) => Promise<void>;
  updateKaroseri: (id: string, data: Partial<Karoseri>) => Promise<void>;
  updateKaroseriStatus: (id: string, status: Karoseri["status"]) => Promise<void>;

  addArmada: (data: Omit<Armada, "id" | "createdAt" | "status">) => Promise<void>;
  removeArmada: (id: string) => Promise<void>;
  updateArmada: (id: string, data: Partial<Armada>) => Promise<void>;

  addPengiriman: (data: { kodePengiriman: string; asal: string; tujuan: string; jarakKm: number }) => Promise<void>;
  updatePengiriman: (id: string, data: Partial<Pengiriman>) => Promise<void>;
  removePengiriman: (id: string) => Promise<void>;
  updatePengirimanStatus: (id: string, status: Pengiriman["status"]) => Promise<void>;

  addBarang: (data: Omit<Barang, "id" | "createdAt">) => Promise<void>;
  addBarangBulk: (rows: Omit<Barang, "id" | "createdAt">[]) => Promise<void>;
  updateBarang: (id: string, data: Partial<Barang>) => Promise<void>;
  removeBarang: (id: string) => Promise<void>;

  selectedStrategi: StrategiTerpilih | null;
  setSelectedStrategi: (value: StrategiTerpilih | null) => void;
  
  refreshAll: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [karoseriList, setKaroseriList] = useState<Karoseri[]>([]);
  const [armadaList, setArmadaList] = useState<Armada[]>([]);
  const [pengirimanList, setPengirimanList] = useState<Pengiriman[]>([]);
  const [barangList, setBarangList] = useState<Barang[]>([]);
  const [selectedStrategi, setSelectedStrategi] = useState<StrategiTerpilih | null>(null);

  const fetchApi = async (path: string, method = "GET", body?: any) => {
    const headers: Record<string, string> = {};
    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API Error: ${res.status} - ${err}`);
    }
    return res.json();
  };

  const loadData = async () => {
    try {
      const [kRes, aRes, pRes, bRes] = await Promise.all([
        fetchApi("/karoseri/").catch(() => []),
        fetchApi("/armada/").catch(() => []),
        fetchApi("/pengiriman/").catch(() => []),
        fetchApi("/barang/").catch(() => []),
      ]);
      
      setKaroseriList(kRes.map((k: any) => ({
        id: k.id.toString(),
        jenis: k.jenis_karoseri,
        panjang: k.panjang,
        lebar: k.lebar,
        tinggi: k.tinggi,
        jumlah: 1, // Default if not provided
        status: "ready",
        createdAt: Date.now()
      })));

      setArmadaList(aRes.map((a: any) => ({
        id: a.id.toString(),
        namaKendaraan: a.nama_kendaraan,
        jenisArmada: a.jenis_armada || "pickup",
        karoseriId: a.karoseri_id?.toString(),
        jumlah: 1,
        maxPayload: a.max_payload || 0,
        konsumsiBbm: a.konsumsi_bahan_bakar || 0,
        jenisBbm: a.jenis_bbm || null,
        status: a.status === "tersedia" ? "ready" : "maintenance",
        createdAt: Date.now()
      })));

      // Filter pengiriman to only parents (parent_id is null) based on README
      setPengirimanList(pRes.filter((p: any) => p.parent_id == null).map((p: any) => ({
        id: p.id.toString(),
        kodePengiriman: p.kode_pengiriman,
        asal: p.asal,
        tujuan: p.tujuan,
        jarakKm: p.jarak_km,
        status: p.status,
        createdAt: Date.now()
      })));

      setBarangList(bRes.map((b: any) => ({
        id: b.id.toString(),
        pengirimanId: b.pengiriman_id?.toString(),
        namaBarang: b.nama_barang,
        panjang: b.panjang,
        lebar: b.lebar,
        tinggi: b.tinggi,
        berat: b.berat,
        quantity: b.quantity,
        bisaDitumpuk: b.fragility_level === 'normal' || b.fragility_level === 'sturdy' || b.fragility_level === 'structure',
        fragilityLevel: b.fragility_level,
        orientable: b.orientable,
        bottomAxis: b.bottom_axis,
        bottomFaceIndex: b.bottom_face_index,
        createdAt: Date.now()
      })));
    } catch (error) {
      console.error("Failed to load data from backend API", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      karoseriList,
      armadaList,
      pengirimanList,
      barangList,

      addKaroseri: async (data) => {
        await fetchApi("/karoseri/", "POST", {
          jenis_karoseri: data.jenis,
          panjang: data.panjang,
          lebar: data.lebar,
          tinggi: data.tinggi,
        });
        await loadData();
      },

      addKaroseriBulk: async (rows) => {
        for (const data of rows) {
          await fetchApi("/karoseri/", "POST", {
            jenis_karoseri: data.jenis,
            panjang: data.panjang,
            lebar: data.lebar,
            tinggi: data.tinggi,
          });
        }
        await loadData();
      },

      removeKaroseri: async (id) => {
        await fetchApi(`/karoseri/${id}`, "DELETE");
        await loadData();
      },

      updateKaroseriStatus: async (id, status) => {
        setKaroseriList((prev) =>
          prev.map((k) => (k.id === id ? { ...k, status } : k))
        );
      },

      updateKaroseri: async (id, data) => {
        setKaroseriList((prev) =>
          prev.map((k) => (k.id === id ? { ...k, ...data } : k))
        );
      },

      addArmada: async (data) => {
        await fetchApi("/armada/", "POST", {
          nama_kendaraan: data.namaKendaraan,
          jenis_armada: data.jenisArmada,
          karoseri_id: parseInt(data.karoseriId),
          max_payload: data.maxPayload,
          konsumsi_bahan_bakar: data.konsumsiBbm,
          jenis_bbm: data.jenisBbm || null,
        });
        await loadData();
      },

      removeArmada: async (id) => {
        await fetchApi(`/armada/${id}`, "DELETE");
        await loadData();
      },

      updateArmada: async (id, data) => {
        const existing = armadaList.find(a => a.id === id);
        if (existing) {
          await fetchApi(`/armada/${id}`, "PUT", {
            nama_kendaraan: data.namaKendaraan !== undefined ? data.namaKendaraan : existing.namaKendaraan,
            jenis_armada: data.jenisArmada !== undefined ? data.jenisArmada : existing.jenisArmada,
            karoseri_id: data.karoseriId !== undefined ? parseInt(data.karoseriId) : parseInt(existing.karoseriId),
            max_payload: data.maxPayload !== undefined ? data.maxPayload : existing.maxPayload,
            konsumsi_bahan_bakar: data.konsumsiBbm !== undefined ? data.konsumsiBbm : existing.konsumsiBbm,
            jenis_bbm: data.jenisBbm !== undefined ? data.jenisBbm : existing.jenisBbm,
            status: data.status !== undefined ? (data.status === "ready" ? "tersedia" : data.status) : existing.status,
          });
          await loadData();
        }
      },

      addPengiriman: async (data) => {
        await fetchApi("/pengiriman/", "POST", {
          kode_pengiriman: data.kodePengiriman,
          asal: data.asal,
          tujuan: data.tujuan,
          jarak_km: data.jarakKm
        });
        await loadData();
      },

      removePengiriman: async (id) => {
        await fetchApi(`/pengiriman/${id}`, "DELETE");
        await loadData();
      },

      updatePengiriman: async (id, data) => {
        const existing = pengirimanList.find((p) => p.id === id);
        if (existing) {
          const payload: any = {
            kode_pengiriman: data.kodePengiriman !== undefined ? data.kodePengiriman : existing.kodePengiriman,
            asal: data.asal !== undefined ? data.asal : existing.asal,
            tujuan: data.tujuan !== undefined ? data.tujuan : existing.tujuan,
            jarak_km: data.jarakKm !== undefined ? data.jarakKm : existing.jarakKm,
            status: data.status !== undefined ? data.status : existing.status,
          };
          await fetchApi(`/pengiriman/${id}`, "PUT", payload);
          await loadData();
        }
      },

      updatePengirimanStatus: async (id, status) => {
        const existing = pengirimanList.find((p) => p.id === id);
        if (existing) {
          const payload: any = {
            kode_pengiriman: existing.kodePengiriman,
            asal: existing.asal,
            tujuan: existing.tujuan,
            jarak_km: existing.jarakKm,
            status: status
          };
          await fetchApi(`/pengiriman/${id}`, "PUT", payload);
          await loadData();
        }
      },

      addBarang: async (data) => {
        await fetchApi("/barang/", "POST", {
          pengiriman_id: parseInt(data.pengirimanId),
          nama_barang: data.namaBarang,
          panjang: data.panjang,
          lebar: data.lebar,
          tinggi: data.tinggi,
          berat: data.berat,
          quantity: data.quantity,
          fragility_level: data.fragilityLevel || (data.bisaDitumpuk ? "normal" : "do_not_stack"),
          bottom_axis: data.bottomAxis || null,
          bottom_face_index: data.bottomFaceIndex || null,
          butuh_pendingin: false,
          orientable: data.orientable ?? false,
        });
        await loadData();
      },

      addBarangBulk: async (rows) => {
        for (const data of rows) {
          await fetchApi("/barang/", "POST", {
            pengiriman_id: parseInt(data.pengirimanId),
            nama_barang: data.namaBarang,
            panjang: data.panjang,
            lebar: data.lebar,
            tinggi: data.tinggi,
            berat: data.berat,
            quantity: data.quantity,
            fragility_level: data.fragilityLevel || (data.bisaDitumpuk ? "normal" : "do_not_stack"),
            bottom_axis: data.bottomAxis || null,
            bottom_face_index: data.bottomFaceIndex || null,
            butuh_pendingin: false,
            orientable: data.orientable ?? false,
          });
        }
        await loadData();
      },

      updateBarang: async (id, data) => {
        // Find existing barang to merge correctly
        const existing = barangList.find(b => b.id === id);
        if (existing) {
          await fetchApi(`/barang/${id}`, "PUT", {
            pengiriman_id: parseInt(existing.pengirimanId),
            nama_barang: data.namaBarang !== undefined ? data.namaBarang : existing.namaBarang,
            panjang: data.panjang !== undefined ? data.panjang : existing.panjang,
            lebar: data.lebar !== undefined ? data.lebar : existing.lebar,
            tinggi: data.tinggi !== undefined ? data.tinggi : existing.tinggi,
            berat: data.berat !== undefined ? data.berat : existing.berat,
            quantity: data.quantity !== undefined ? data.quantity : existing.quantity,
            fragility_level: data.fragilityLevel !== undefined ? data.fragilityLevel : existing.fragilityLevel,
            bottom_axis: data.bottomAxis !== undefined ? data.bottomAxis : existing.bottomAxis,
            bottom_face_index: data.bottomFaceIndex !== undefined ? data.bottomFaceIndex : existing.bottomFaceIndex,
            butuh_pendingin: false,
            orientable: data.orientable !== undefined ? data.orientable : existing.orientable,
          });
        }
        await loadData();
      },

      removeBarang: async (id) => {
        await fetchApi(`/barang/${id}`, "DELETE");
        await loadData();
      },

      selectedStrategi,
      setSelectedStrategi,
      
      refreshAll: loadData,
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
