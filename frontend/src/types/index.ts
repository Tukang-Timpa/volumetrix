export type AssetStatus = "aktif" | "ready" | "maintenance";
export type PengirimanStatus = "persiapan" | "on-going" | "selesai";
export type JenisBBM = "solar" | "pertalite" | "other";

// ── Step 1: Karoseri (badan kendaraan / kontainer) ─────────────────────────
export type JenisKaroseri =
  | "box"
  | "bak-terbuka"
  | "wingbox"
  | "kontainer-20ft"
  | "kontainer-40ft"
  | "reefer";

export interface Karoseri {
  id: string; // e.g. KRS-0001
  jenis: JenisKaroseri;
  panjang: number; // cm
  lebar: number; // cm
  tinggi: number; // cm
  jumlah: number;
  status: AssetStatus;
  createdAt: number;
}

// ── Step 2: Armada (kendaraan) ─────────────────────────────────────────────
export type JenisArmada =
  | "pickup"
  | "engkel"
  | "cdd"
  | "fuso"
  | "tronton"
  | "trailer";

export interface Armada {
  id: string; // e.g. ARM-0001
  namaKendaraan: string;
  jenisArmada: JenisArmada;
  karoseriId: string; // FK -> Karoseri.id
  jumlah: number; // jumlah unit kendaraan (1 record = 1 tipe armada, bisa batch)
  maxPayload: number; // kg
  konsumsiBbm: number; // km/liter
  jenisBbm?: JenisBBM | null;
  status: AssetStatus;
  createdAt: number;
}

// ── Step 3: Pengiriman logistik ─────────────────────────────────────────────
export interface Pengiriman {
  id: string; // e.g. PGR-0001
  kodePengiriman: string;
  asal?: string;
  tujuan?: string;
  jarakKm?: number;
  status: PengirimanStatus;
  createdAt: number;
}

// ── Step 4: Barang di dalam sebuah pengiriman ──────────────────────────────
export interface Barang {
  id: string; // e.g. BRG-0001
  pengirimanId: string; // FK -> Pengiriman.id
  namaBarang: string;
  panjang: number; // cm
  lebar: number; // cm
  tinggi: number; // cm
  berat: number; // kg per item
  quantity: number;
  bisaDitumpuk: boolean;
  fragilityLevel?: string;
  orientable?: boolean;
  bottomAxis?: string | null;
  bottomFaceIndex?: number | null;
  createdAt: number;
}

// ── Step 5: Rekomendasi AI (UI-only, backend menyusul) ─────────────────────
export interface KontainerRekomendasi {
  armadaId: string;
  namaArmada: string;
  jenisKaroseri: JenisKaroseri;
  utilisasiVolume: number; // %
  utilisasiMuatan: number; // %
}

export interface RekomendasiStrategi {
  id: string;
  label: string; // cth. "1 Kontainer" / "3 Kontainer (split muatan)"
  containers: KontainerRekomendasi[];
  kelebihan: string[];
  kekurangan: string[];
  skorEfisiensi: number; // 0-100
  estimasiBiayaBbm?: number;
  estimasiLiterBbm?: number;
}

/** Strategi yang sedang dipilih user di Step 5, dibawa sebagai default ke Step 6. */
export interface StrategiTerpilih {
  pengirimanId: string;
  strategiId: string;
  containers: KontainerRekomendasi[];
}

// ── Step 6: Packing result untuk visualisasi 3D ────────────────────────────
export interface PackedItem {
  barangId: string;
  namaBarang: string;
  x: number;
  y: number;
  z: number;
  panjang: number;
  lebar: number;
  tinggi: number;
  color: string;
}

export const KAROSERI_LABEL: Record<JenisKaroseri, string> = {
  box: "Box",
  "bak-terbuka": "Bak Terbuka",
  wingbox: "Wingbox",
  "kontainer-20ft": "Kontainer 20ft",
  "kontainer-40ft": "Kontainer 40ft",
  reefer: "Reefer (Berpendingin)",
};

export const ARMADA_LABEL: Record<JenisArmada, string> = {
  pickup: "Pickup",
  engkel: "Engkel",
  cdd: "CDD (Colt Diesel Double)",
  fuso: "Fuso",
  tronton: "Tronton",
  trailer: "Trailer",
};
