import type { Barang, PackedItem } from "../types";

export interface Box {
  w: number; // panjang (x)
  h: number; // tinggi (y)
  d: number; // lebar (z)
}

interface ExtremePoint {
  x: number;
  y: number;
  z: number;
}

interface Unit {
  barangId: string;
  namaBarang: string;
  box: Box;
  stackable: boolean;
}

type PlacedUnit = Unit & { x: number; y: number; z: number };

const PALETTE = [
  "#2dd4bf",
  "#f5f0e6",
  "#5eead4",
  "#e7ddc4",
  "#0d9488",
  "#a7f3d0",
  "#f0e6cc",
  "#14b8a6",
];

function volumeOf(box: Box): number {
  return box.w * box.h * box.d;
}

function expandUnits(barangList: Barang[]): Unit[] {
  const units: Unit[] = [];
  barangList.forEach((b) => {
    for (let i = 0; i < b.quantity; i++) {
      units.push({
        barangId: b.id,
        namaBarang: b.namaBarang,
        box: { w: b.panjang, h: b.tinggi, d: b.lebar },
        stackable: b.bisaDitumpuk,
      });
    }
  });
  return units.sort((a, b) => volumeOf(b.box) - volumeOf(a.box));
}

/**
 * Extreme Point-Based heuristic (versi ringkas):
 * Setiap unit ditempatkan pada extreme point pertama yang muat dan tidak
 * tumpang tindih. Extreme point baru dibangkitkan dari sisi kanan, atas,
 * dan depan tiap unit yang baru diletakkan. Unit yang tidak muat sama
 * sekali dikembalikan sebagai `leftover` agar bisa dicoba di kontainer lain.
 */
function packIntoContainer(
  units: Unit[],
  container: Box
): { placed: PlacedUnit[]; leftover: Unit[] } {
  const placed: PlacedUnit[] = [];
  const leftover: Unit[] = [];
  let extremePoints: ExtremePoint[] = [{ x: 0, y: 0, z: 0 }];

  const fits = (ep: ExtremePoint, box: Box) =>
    ep.x + box.w <= container.w + 1e-6 &&
    ep.y + box.h <= container.h + 1e-6 &&
    ep.z + box.d <= container.d + 1e-6;

  const overlaps = (ep: ExtremePoint, box: Box) =>
    placed.some(
      (p) =>
        ep.x < p.x + p.box.w &&
        ep.x + box.w > p.x &&
        ep.y < p.y + p.box.h &&
        ep.y + box.h > p.y &&
        ep.z < p.z + p.box.d &&
        ep.z + box.d > p.z
    );

  // Barang non-stackable tidak boleh ditindih: tolak titik yang bertumpu tepat
  // di atas permukaan atas barang non-stackable (di bawahnya, footprint sama).
  const restsOnNonStackable = (ep: ExtremePoint, box: Box) =>
    ep.y > 0 &&
    placed.some(
      (p) =>
        !p.stackable &&
        Math.abs(p.y + p.box.h - ep.y) < 1e-6 &&
        ep.x < p.x + p.box.w &&
        ep.x + box.w > p.x &&
        ep.z < p.z + p.box.d &&
        ep.z + box.d > p.z
    );

  for (const unit of units) {
    // Jika dimensi unit lebih besar dari kontainer sama sekali, tidak akan pernah muat.
    if (unit.box.w > container.w || unit.box.h > container.h || unit.box.d > container.d) {
      leftover.push(unit);
      continue;
    }

    extremePoints.sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
    const ep = extremePoints.find(
      (p) => fits(p, unit.box) && !overlaps(p, unit.box) && !restsOnNonStackable(p, unit.box)
    );

    if (!ep) {
      leftover.push(unit);
      continue;
    }

    placed.push({ ...unit, x: ep.x, y: ep.y, z: ep.z });
    extremePoints = extremePoints.filter((p) => p !== ep);
    extremePoints.push(
      { x: ep.x + unit.box.w, y: ep.y, z: ep.z },
      { x: ep.x, y: ep.y, z: ep.z + unit.box.d }
    );
    // Barang non-stackable tidak membangkitkan extreme point "atas" —
    // tidak ada yang boleh diletakkan di atasnya.
    if (unit.stackable) {
      extremePoints.push({ x: ep.x, y: ep.y + unit.box.h, z: ep.z });
    }
  }

  return { placed, leftover };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function colorFor(barangId: string): string {
  return PALETTE[hashString(barangId) % PALETTE.length];
}

function toPackedItems(placed: PlacedUnit[]): PackedItem[] {
  return placed.map((u) => ({
    barangId: u.barangId,
    namaBarang: u.namaBarang,
    x: u.x,
    y: u.y,
    z: u.z,
    panjang: u.box.w,
    lebar: u.box.d,
    tinggi: u.box.h,
    color: colorFor(u.barangId),
  }));
}

/** Kemas seluruh barang ke dalam satu kontainer. */
export function packItems(barangList: Barang[], container: Box): PackedItem[] {
  const { placed } = packIntoContainer(expandUnits(barangList), container);
  return toPackedItems(placed);
}

/**
 * Kemas barang ke beberapa kontainer sekaligus (mis. hasil rekomendasi AI
 * yang butuh 2-3 armada). Barang diisi penuh dulu ke kontainer pertama,
 * sisanya "meluap" ke kontainer berikutnya, dan seterusnya.
 */
export function packMultiContainer(
  barangList: Barang[],
  containers: Box[]
): { perContainer: PackedItem[][]; unplacedCount: number } {
  let remaining = expandUnits(barangList);
  const perContainer: PackedItem[][] = [];

  for (const container of containers) {
    const { placed, leftover } = packIntoContainer(remaining, container);
    perContainer.push(toPackedItems(placed));
    remaining = leftover;
  }

  return { perContainer, unplacedCount: remaining.length };
}

/**
 * Kemas seluruh barang ke seluruh armada tersedia (urut volume terbesar
 * dulu). Kontainer kosong di akhir dibuang. `unplacedCount` adalah sisa yang
 * tidak tertampung karena kapasitas armada kurang — jujur, tidak menambah
 * kontainer di luar yang tersedia.
 */
export function packAllContainers(
  barangList: Barang[],
  availableContainers: Box[]
): { containers: Box[]; perContainer: PackedItem[][]; unplacedCount: number } {
  const result = packMultiContainer(barangList, availableContainers);
  const { unplacedCount } = result;
  let perContainer = result.perContainer;
  let containers = availableContainers.slice(0, perContainer.length);

  // Buang kontainer kosong di akhir yang tidak menampung barang apa pun.
  while (containers.length > 0 && perContainer[containers.length - 1].length === 0) {
    containers.pop();
  }
  // Minimal 1 kontainer agar daftar strategi tetap valid walau tidak ada yang muat.
  if (containers.length === 0 && availableContainers.length > 0) {
    containers = availableContainers.slice(0, 1);
    perContainer = result.perContainer.slice(0, 1);
  }
  perContainer = perContainer.slice(0, containers.length);

  return { containers, perContainer, unplacedCount };
}

export function volumeUtilization(items: PackedItem[], container: Box): number {
  const used = items.reduce((sum, i) => sum + i.panjang * i.lebar * i.tinggi, 0);
  const total = volumeOf(container);
  return total > 0 ? Math.min(100, (used / total) * 100) : 0;
}

/** Estimasi berapa kontainer dibutuhkan untuk menampung seluruh volume barang. */
export function estimateContainersNeeded(barangList: Barang[], container: Box, fillFactor = 0.85): number {
  const totalVolume = barangList.reduce(
    (sum, b) => sum + b.panjang * b.lebar * b.tinggi * b.quantity,
    0
  );
  const usableVolume = volumeOf(container) * fillFactor;
  if (usableVolume <= 0) return 1;
  return Math.max(1, Math.ceil(totalVolume / usableVolume));
}
