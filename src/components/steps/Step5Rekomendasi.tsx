import { useMemo, useState } from "react";
import {
  Sparkles,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  CheckCircle2,
  Boxes,
  Truck,
} from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Select } from "../ui/select";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { packAllContainers, estimateContainersNeeded, volumeUtilization, type Box } from "../../lib/packing";
import {
  KAROSERI_LABEL,
  type Armada,
  type Barang,
  type Karoseri,
  type KontainerRekomendasi,
  type RekomendasiStrategi,
} from "../../types";

interface Candidate {
  armada: Armada;
  karoseri: Karoseri;
  box: Box;
  containerVolume: number;
}

function buildCandidates(armadaList: Armada[], karoseriList: Karoseri[]): Candidate[] {
  return armadaList
    .filter((a) => a.status !== "maintenance")
    .flatMap((a) => {
      const karoseri = karoseriList.find((k) => k.id === a.karoseriId);
      if (!karoseri) return [];
      const box: Box = { w: karoseri.panjang, h: karoseri.tinggi, d: karoseri.lebar };
      const candidate: Candidate = { armada: a, karoseri, box, containerVolume: box.w * box.h * box.d };
      // 1 record armada = jumlah unit kendaraan (batch), tiap unit = 1 kontainer tersedia
      return Array.from({ length: Math.max(1, a.jumlah ?? 1) }, () => candidate);
    })
    .sort((a, b) => b.containerVolume - a.containerVolume);
}

function skorFor(volUtil: number, muatUtil: number, overload: boolean) {
  let skor = 100 - Math.abs(80 - volUtil) * 0.6 - Math.abs(80 - muatUtil) * 0.3;
  if (overload) skor -= 30;
  return Math.max(5, Math.min(99, Math.round(skor)));
}

function buildSingleStrategy(cand: Candidate, id: string, label: string, totalVolume: number, totalWeight: number): RekomendasiStrategi {
  const volUtilRaw = cand.containerVolume > 0 ? (totalVolume / cand.containerVolume) * 100 : 0;
  const muatUtilRaw = cand.armada.maxPayload > 0 ? (totalWeight / cand.armada.maxPayload) * 100 : 0;
  const overload = volUtilRaw > 100 || muatUtilRaw > 100;
  const volUtil = Math.min(100, volUtilRaw);
  const muatUtil = Math.min(100, muatUtilRaw);

  const kelebihan: string[] = [];
  const kekurangan: string[] = [];

  if (overload) {
    kekurangan.push("Volume/berat barang melebihi kapasitas kendaraan ini — berisiko tidak semua muat");
  } else {
    kelebihan.push("Cukup 1 kendaraan & 1 sopir untuk seluruh pengiriman");
    if (volUtil > 70) kelebihan.push("Pemanfaatan ruang kontainer efisien");
  }
  if (cand.armada.konsumsiBbm >= 6) kelebihan.push("Konsumsi BBM relatif hemat untuk rute jauh");
  if (volUtil < 50 && !overload) kekurangan.push("Ruang kontainer masih banyak tersisa, kurang efisien secara biaya");
  if (kelebihan.length === 0) kelebihan.push("Armada tersedia dan siap berangkat segera");
  if (kekurangan.length === 0) kekurangan.push("Perlu konfirmasi ketersediaan sopir");

  return {
    id,
    label,
    containers: [
      {
        armadaId: cand.armada.id,
        namaArmada: cand.armada.namaKendaraan,
        jenisKaroseri: cand.karoseri.jenis,
        utilisasiVolume: Math.round(volUtil),
        utilisasiMuatan: Math.round(muatUtil),
      },
    ],
    kelebihan,
    kekurangan,
    skorEfisiensi: skorFor(volUtil, muatUtil, overload),
  };
}

type MultiVariant = "efisien" | "seimbang" | "lega";

const MULTI_LABEL: Record<MultiVariant, string> = {
  efisien: "Efisiensi Tinggi",
  seimbang: "Seimbang",
  lega: "Distribusi Merata",
};

function buildMultiStrategy(
  candidates: Candidate[],
  containerCount: number,
  items: Barang[],
  totalWeight: number,
  variant: MultiVariant
): RekomendasiStrategi {
  const allBoxes = candidates.slice(0, containerCount).map((c) => c.box);
  const { containers: usedBoxes, perContainer, unplacedCount } = packAllContainers(items, allBoxes);
  const chosen = usedBoxes.map((box) => candidates.find((c) => c.box === box) ?? candidates[0]);
  const totalUnits = items.reduce((s, b) => s + b.quantity, 0);
  const avgWeightPerUnit = totalUnits > 0 ? totalWeight / totalUnits : 0;

  const containers: KontainerRekomendasi[] = chosen.map((c, idx) => {
    const placed = perContainer[idx] ?? [];
    const estWeight = placed.length * avgWeightPerUnit;
    return {
      armadaId: c.armada.id,
      namaArmada: c.armada.namaKendaraan,
      jenisKaroseri: c.karoseri.jenis,
      utilisasiVolume: Math.round(volumeUtilization(placed, c.box)),
      utilisasiMuatan: Math.round(Math.min(100, c.armada.maxPayload > 0 ? (estWeight / c.armada.maxPayload) * 100 : 0)),
    };
  });

  const avgVol = containers.reduce((s, c) => s + c.utilisasiVolume, 0) / containers.length;
  const avgMuat = containers.reduce((s, c) => s + c.utilisasiMuatan, 0) / containers.length;

  const kelebihan: string[] = [];
  const kekurangan: string[] = [];
  if (variant === "efisien") {
    kelebihan.push("Jumlah kendaraan seminimal mungkin — biaya operasional terendah");
    kelebihan.push("Ruang kontainer terpakai paling padat");
    kekurangan.push("Margin ruang lebih tipis, penyusunan barang perlu lebih teliti");
  } else if (variant === "lega") {
    kelebihan.push("Setiap kontainer longgar, penyusunan lebih aman & cepat");
    kelebihan.push("Pengiriman paralel mempercepat waktu tempuh total");
    kekurangan.push("Biaya operasional (BBM, tol, sopir) lebih tinggi");
  } else {
    kelebihan.push("Keseimbangan antara biaya operasional dan ruang cadangan");
    kelebihan.push("Beban terbagi rata sehingga tidak ada kendaraan yang overload");
  }
  kekurangan.push(`Membutuhkan ${chosen.length} kendaraan & sopir sekaligus`);
  if (unplacedCount > 0) {
    kekurangan.push(`${unplacedCount} unit barang masih belum tertampung — armada yang ada belum mencukupi`);
  }

  return {
    id: `STR-MULTI-${variant}`,
    label: `${chosen.length} Kontainer (${MULTI_LABEL[variant]})`,
    containers,
    kelebihan,
    kekurangan,
    skorEfisiensi: skorFor(avgVol, avgMuat, unplacedCount > 0),
  };
}

function buildStrategies(armadaList: Armada[], karoseriList: Karoseri[], items: Barang[]): RekomendasiStrategi[] {
  if (items.length === 0) return [];
  const candidates = buildCandidates(armadaList, karoseriList);
  if (candidates.length === 0) return [];

  const totalVolume = items.reduce((s, b) => s + b.panjang * b.lebar * b.tinggi * b.quantity, 0);
  const totalWeight = items.reduce((s, b) => s + b.berat * b.quantity, 0);
  const boxes = (count: number) => candidates.slice(0, count).map((c) => c.box);

  // Muat dalam 1 kontainer? (diverifikasi dengan packing sungguhan, bukan asumsi volume)
  const singleFits = packAllContainers(items, boxes(1)).unplacedCount === 0;
  if (singleFits) {
    const strategies = [buildSingleStrategy(candidates[0], "STR-SINGLE-1", "Kontainer Tunggal", totalVolume, totalWeight)];
    if (candidates.length > 1) {
      strategies.push(
        buildSingleStrategy(candidates[1], "STR-SINGLE-2", "Alternatif Kontainer Tunggal", totalVolume, totalWeight)
      );
    }
    return strategies.slice(0, 3);
  }

  // Kandidat jumlah kontainer: dari estimasi paling padat (fill 95%) sampai
  // seluruh armada tersedia — lalu diverifikasi dengan packing sungguhan.
  const minCount = Math.max(1, estimateContainersNeeded(items, candidates[0].box, 0.95));
  const counts = Array.from({ length: Math.max(1, candidates.length - minCount + 1) }, (_, i) => minCount + i);

  // Hanya jumlah yang BENAR-BENAR memuat semua barang (unplaced === 0) yang ditawarkan.
  const feasible = counts.filter((count) => packAllContainers(items, boxes(count)).unplacedCount === 0);

  if (feasible.length === 0) {
    // Seluruh armada pun tidak cukup — tampilkan usaha terbaik dengan peringatan.
    return [buildMultiStrategy(candidates, candidates.length, items, totalWeight, "seimbang")];
  }

  // Pilih paling banyak 3: paling sedikit, tengah, dan paling banyak kontainer.
  const picked = new Set<number>([feasible[0]]);
  if (feasible.length >= 2) picked.add(feasible[feasible.length - 1]);
  if (feasible.length >= 3) picked.add(feasible[Math.floor(feasible.length / 2)]);
  const chosenCounts = [...picked].sort((a, b) => a - b);

  const variants: MultiVariant[] =
    chosenCounts.length === 1 ? ["efisien"] : chosenCounts.length === 2 ? ["efisien", "lega"] : ["efisien", "seimbang", "lega"];

  const strategies = chosenCounts.map((count, idx) =>
    buildMultiStrategy(candidates, count, items, totalWeight, variants[idx])
  );

  // Buang opsi yang pola packing-nya identik (mis. armada homogen: 5 vs 6
  // kontainer menghasilkan tata letak sama) — hanya opsi yang benar-benar beda.
  const seen = new Set<string>();
  return strategies.filter((s) => {
    const key = `${s.containers.length}|${s.containers.map((c) => c.utilisasiVolume).join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function Step5Rekomendasi() {
  const { pengirimanList, armadaList, karoseriList, barangList, selectedStrategi, setSelectedStrategi } = useAppData();
  const [pengirimanId, setPengirimanId] = useState(pengirimanList[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const itemsForPengiriman = useMemo(
    () => barangList.filter((b) => b.pengirimanId === pengirimanId),
    [barangList, pengirimanId]
  );

  const strategies = useMemo(
    () => buildStrategies(armadaList, karoseriList, itemsForPengiriman),
    [armadaList, karoseriList, itemsForPengiriman]
  );

  const runAnalysis = () => {
    setLoading(true);
    setHasAnalyzed(false);
    window.setTimeout(() => {
      setLoading(false);
      setHasAnalyzed(true);
    }, 900);
  };

  const selectedId = selectedStrategi?.pengirimanId === pengirimanId ? selectedStrategi.strategiId : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-300" /> Rekomendasi AI
          </CardTitle>
          <CardDescription>
            Analisis armada &amp; muatan pengiriman untuk menemukan kombinasi paling efisien — termasuk
            jika muatan perlu dipecah ke beberapa kontainer sekaligus.
            <span className="block mt-1 text-amber-500/70">
              Catatan: skor &amp; narasi kelebihan/kekurangan dihasilkan dari heuristik sederhana di
              sisi frontend — mesin rekomendasi backend menyusul.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <Label>Pengiriman</Label>
              <Select
                value={pengirimanId}
                onChange={(e) => { setPengirimanId(e.target.value); setHasAnalyzed(false); }}
              >
                <option value="">— Pilih pengiriman —</option>
                {pengirimanList.map((p) => (
                  <option key={p.id} value={p.id}>{p.id} · {p.kodePengiriman}</option>
                ))}
              </Select>
            </div>
            <Button
              onClick={runAnalysis}
              disabled={!pengirimanId || itemsForPengiriman.length === 0 || armadaList.length === 0 || loading}
              className="sm:w-56"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Menganalisis..." : "Jalankan Analisis AI"}
            </Button>
          </div>
          {armadaList.length === 0 && (
            <p className="mt-2 text-[11px] text-amber-500/80">
              Tambahkan data armada terlebih dahulu agar rekomendasi dapat dihasilkan.
            </p>
          )}
          {pengirimanId && itemsForPengiriman.length === 0 && (
            <p className="mt-2 text-[11px] text-amber-500/80">
              Pengiriman ini belum memiliki data barang — tambahkan dulu di step 4.
            </p>
          )}
        </CardContent>
      </Card>

      {hasAnalyzed && strategies.length > 0 && (
        <div className={cn("grid grid-cols-1 gap-4", strategies.length > 1 ? "md:grid-cols-3" : "md:grid-cols-1 max-w-md")}>
          {strategies.map((rec, idx) => {
            const isSelected = selectedId === rec.id;
            const isMulti = rec.containers.length > 1;
            return (
              <Card
                key={rec.id}
                className={cn(
                  "flex flex-col transition-all",
                  isSelected && "border-teal-400/60 ring-1 ring-teal-400/40 bg-teal-400/[0.04]"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-600">Opsi {idx + 1}</span>
                    {idx === 0 && (
                      <span className="rounded-full bg-teal-400/15 border border-teal-400/30 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                        Paling efisien
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base flex items-center gap-1.5">
                    {isMulti ? <Boxes className="h-4 w-4 text-teal-300" /> : <Truck className="h-4 w-4 text-teal-300" />}
                    {rec.label}
                  </CardTitle>
                  <CardDescription>
                    {isMulti
                      ? `${rec.containers.length} kendaraan digunakan bersamaan`
                      : KAROSERI_LABEL[rec.containers[0].jenisKaroseri]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  {isMulti ? (
                    <div className="space-y-2.5">
                      {rec.containers.map((c, cIdx) => (
                        <div key={c.armadaId + cIdx} className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-2.5">
                          <p className="text-[11px] font-medium text-cream-100 mb-1.5 flex items-center gap-1.5">
                            <span className="flex h-4 w-4 items-center justify-center rounded bg-teal-400/15 text-[9px] text-teal-300">
                              {cIdx + 1}
                            </span>
                            {c.namaArmada}
                            <span className="text-neutral-600 font-normal">· {KAROSERI_LABEL[c.jenisKaroseri]}</span>
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <MiniUtilBar label="Volume" value={c.utilisasiVolume} />
                            <MiniUtilBar label="Muatan" value={c.utilisasiMuatan} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <UtilStat label="Utilisasi Volume" value={rec.containers[0].utilisasiVolume} />
                      <UtilStat label="Utilisasi Muatan" value={rec.containers[0].utilisasiMuatan} />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-cream-100">
                    <TrendingUp className="h-3.5 w-3.5 text-teal-300" />
                    Skor efisiensi: <span className="font-semibold">{rec.skorEfisiensi}/100</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="flex items-center gap-1 text-neutral-400 mb-1">
                        <ThumbsUp className="h-3 w-3 text-teal-400" /> Kelebihan
                      </p>
                      <ul className="space-y-1 text-neutral-300">
                        {rec.kelebihan.map((k) => (
                          <li key={k} className="flex gap-1.5">
                            <span className="text-teal-400">·</span>{k}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-neutral-400 mb-1">
                        <ThumbsDown className="h-3 w-3 text-amber-500" /> Kekurangan
                      </p>
                      <ul className="space-y-1 text-neutral-300">
                        {rec.kekurangan.map((k) => (
                          <li key={k} className="flex gap-1.5">
                            <span className="text-amber-500">·</span>{k}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Button
                    variant={isSelected ? "default" : "secondary"}
                    className="mt-auto w-full"
                    onClick={() =>
                      setSelectedStrategi(
                        isSelected ? null : { pengirimanId, strategiId: rec.id, containers: rec.containers }
                      )
                    }
                  >
                    {isSelected && <CheckCircle2 className="h-4 w-4" />}
                    {isSelected ? "Strategi Dipilih" : "Pilih Strategi Ini"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedId && (
        <p className="text-[11px] text-neutral-500">
          Strategi ini otomatis tersedia sebagai kontainer default saat kamu membuka step Visualisasi 3D
          untuk pengiriman yang sama.
        </p>
      )}
    </div>
  );
}

function UtilStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
      <p className="text-[10px] text-neutral-500 mb-1.5">{label}</p>
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-lg font-semibold text-cream-100">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
        <div className="h-full rounded-full bg-teal-400" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function MiniUtilBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-neutral-500">{label}</span>
        <span className="text-[10px] font-medium text-neutral-300">{value}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-neutral-800 overflow-hidden">
        <div className="h-full rounded-full bg-teal-400" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
