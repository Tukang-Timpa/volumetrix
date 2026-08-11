import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges } from "@react-three/drei";
import {
  Play,
  Pause,
  RotateCcw,
  Box as BoxIcon,
  Gauge,
  Plus,
  X,
  Sparkles,
  PackageX,
} from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Select } from "../ui/select";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { packMultiContainer, volumeUtilization, type Box } from "../../lib/packing";
import { KAROSERI_LABEL, type PackedItem } from "../../types";

const SPEED_OPTIONS = [
  { label: "0.5×", ms: 900 },
  { label: "1×", ms: 500 },
  { label: "2×", ms: 250 },
  { label: "4×", ms: 120 },
];

interface ContainerDef {
  armadaId: string;
  namaArmada: string;
  jenisKaroseriLabel: string;
  box: Box;
}

export function Step6Visualisasi() {
  const { pengirimanList, barangList, armadaList, karoseriList, selectedStrategi } = useAppData();

  const [pengirimanId, setPengirimanId] = useState(pengirimanList[0]?.id ?? "");
  const [containerArmadaIds, setContainerArmadaIds] = useState<string[]>(() =>
    armadaList[0] ? [armadaList[0].id] : []
  );
  const [rawActiveIdx, setActiveIdx] = useState(0);
  const [addingArmadaId, setAddingArmadaId] = useState("");
  const [stepByArmada, setStepByArmada] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(SPEED_OPTIONS[1].ms);
  const intervalRef = useRef<number | null>(null);

  const barangForPengiriman = barangList.filter((b) => b.pengirimanId === pengirimanId);

  // Saat pengiriman berganti, pakai strategi yang sudah dipilih di Step 5 (jika ada dan cocok),
  // atau jatuh ke satu kontainer default.
  useEffect(() => {
    if (selectedStrategi && selectedStrategi.pengirimanId === pengirimanId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi default kontainer saat pengiriman/strategi berganti
      setContainerArmadaIds(selectedStrategi.containers.map((c) => c.armadaId));
    } else {
      setContainerArmadaIds(armadaList[0] ? [armadaList[0].id] : []);
    }
    setActiveIdx(0);
    setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset hanya bereaksi pada perubahan pengiriman/strategi
  }, [pengirimanId, selectedStrategi?.strategiId]);

  const containerDefs: ContainerDef[] = containerArmadaIds
    .map((id) => {
      const armada = armadaList.find((a) => a.id === id);
      const karoseri = armada ? karoseriList.find((k) => k.id === armada.karoseriId) : undefined;
      if (!armada || !karoseri) return null;
      return {
        armadaId: id,
        namaArmada: armada.namaKendaraan,
        jenisKaroseriLabel: KAROSERI_LABEL[karoseri.jenis],
        box: { w: karoseri.panjang, h: karoseri.tinggi, d: karoseri.lebar },
      };
    })
    .filter((c): c is ContainerDef => c !== null);

  const containerKey = containerDefs.map((c) => `${c.armadaId}:${c.box.w}x${c.box.h}x${c.box.d}`).join("|");
  const barangKey = barangForPengiriman.map((b) => `${b.id}:${b.quantity}`).join(",");

  const packResult = useMemo(() => {
    const boxes = containerDefs.map((c) => c.box);
    return packMultiContainer(barangForPengiriman, boxes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- di-key dengan string primitif agar stabil lintas render
  }, [containerKey, barangKey]);

  const activeIdx = Math.min(rawActiveIdx, Math.max(0, containerDefs.length - 1));

  const activeContainer = containerDefs[activeIdx];
  const activePacked: PackedItem[] = activeContainer ? packResult.perContainer[activeIdx] ?? [] : [];
  const activeStep = activeContainer ? stepByArmada[activeContainer.armadaId] ?? 0 : 0;

  useEffect(() => {
    if (playing && activeContainer && activeStep < activePacked.length) {
      intervalRef.current = window.setInterval(() => {
        setStepByArmada((prev) => {
          const current = prev[activeContainer.armadaId] ?? 0;
          if (current + 1 >= activePacked.length) {
            setPlaying(false);
            return { ...prev, [activeContainer.armadaId]: activePacked.length };
          }
          return { ...prev, [activeContainer.armadaId]: current + 1 };
        });
      }, speedMs);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- interval dikendalikan lewat playing/speedMs/activeIdx saja
  }, [playing, speedMs, activeIdx, activePacked.length]);

  const availableToAdd = armadaList.filter(
    (a) => !containerArmadaIds.includes(a.id) && karoseriList.some((k) => k.id === a.karoseriId)
  );

  const addContainer = () => {
    if (!addingArmadaId) return;
    setContainerArmadaIds((prev) => [...prev, addingArmadaId]);
    setActiveIdx(containerArmadaIds.length);
    setAddingArmadaId("");
    setPlaying(false);
  };

  const removeContainer = (armadaId: string) => {
    setContainerArmadaIds((prev) => prev.filter((id) => id !== armadaId));
    setActiveIdx(0);
    setPlaying(false);
  };

  const util = activeContainer ? volumeUtilization(activePacked.slice(0, activeStep), activeContainer.box) : 0;
  const usingStrategi = selectedStrategi && selectedStrategi.pengirimanId === pengirimanId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2 h-fit">
        <CardHeader>
          <CardTitle>Visualisasi 3D</CardTitle>
          <CardDescription>Pilih pengiriman, lalu atur satu atau beberapa kontainer sekaligus.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Pengiriman</Label>
            <Select value={pengirimanId} onChange={(e) => setPengirimanId(e.target.value)}>
              <option value="">— Pilih pengiriman —</option>
              {pengirimanList.map((p) => (
                <option key={p.id} value={p.id}>{p.id} · {p.kodePengiriman}</option>
              ))}
            </Select>
          </div>

          {usingStrategi && (
            <div className="flex items-start gap-1.5 rounded-lg border border-teal-400/25 bg-teal-400/[0.06] px-2.5 py-2 text-[11px] text-teal-300">
              <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
              Memakai strategi terpilih dari Rekomendasi AI ({containerDefs.length} kontainer).
            </div>
          )}

          <div>
            <Label>Kontainer Aktif ({containerDefs.length})</Label>
            <div className="space-y-1.5">
              {containerDefs.length === 0 && (
                <p className="text-[11px] text-neutral-600">Belum ada kontainer dipilih.</p>
              )}
              {containerDefs.map((c, idx) => (
                <button
                  key={c.armadaId}
                  onClick={() => { setActiveIdx(idx); setPlaying(false); }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                    idx === activeIdx
                      ? "border-teal-400/40 bg-teal-400/[0.07]"
                      : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-700"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-neutral-200">
                      {idx + 1}. {c.namaArmada}
                    </span>
                    <span className="block truncate text-[10px] text-neutral-500">{c.jenisKaroseriLabel}</span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); removeContainer(c.armadaId); }}
                    className="shrink-0 rounded-md p-1 text-neutral-600 hover:bg-red-500/15 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>

            {availableToAdd.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                <Select value={addingArmadaId} onChange={(e) => setAddingArmadaId(e.target.value)} className="flex-1">
                  <option value="">+ Tambah kontainer lain…</option>
                  {availableToAdd.map((a) => (
                    <option key={a.id} value={a.id}>{a.id} · {a.namaKendaraan}</option>
                  ))}
                </Select>
                <Button type="button" size="icon" variant="secondary" onClick={addContainer} disabled={!addingArmadaId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {activeContainer && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-400">
              <p className="flex items-center gap-1.5 text-neutral-300 mb-1">
                <BoxIcon className="h-3.5 w-3.5 text-teal-300" /> {activeContainer.jenisKaroseriLabel}
              </p>
              Dimensi kontainer: {activeContainer.box.w} × {activeContainer.box.d} × {activeContainer.box.h} cm
            </div>
          )}

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
            <p className="text-[10px] text-neutral-500 mb-1.5">Utilisasi Volume Terpakai</p>
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-lg font-semibold text-cream-100">{util.toFixed(1)}%</span>
              <span className="text-[11px] text-neutral-500">{activeStep}/{activePacked.length} item</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${util}%` }} />
            </div>
          </div>

          {packResult.unplacedCount > 0 && (
            <p className="flex items-center gap-1.5 text-[11px] text-amber-500/80">
              <PackageX className="h-3 w-3" /> {packResult.unplacedCount} unit barang belum tertampung di kontainer manapun.
            </p>
          )}

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="flex-1"
                onClick={() => setPlaying((p) => !p)}
                disabled={!activeContainer || activePacked.length === 0}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Jeda" : "Putar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  if (activeContainer) setStepByArmada((prev) => ({ ...prev, [activeContainer.armadaId]: 0 }));
                  setPlaying(false);
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <input
              type="range"
              min={0}
              max={activePacked.length}
              value={activeStep}
              onChange={(e) => {
                if (activeContainer) {
                  setStepByArmada((prev) => ({ ...prev, [activeContainer.armadaId]: parseInt(e.target.value, 10) }));
                }
                setPlaying(false);
              }}
              className="w-full accent-teal-400"
              disabled={activePacked.length === 0}
            />

            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              <Gauge className="h-3.5 w-3.5" /> Kecepatan pemutaran
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setSpeedMs(opt.ms)}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[11px] transition-colors",
                    speedMs === opt.ms
                      ? "border-teal-400/50 bg-teal-400/10 text-teal-300"
                      : "border-neutral-800 text-neutral-500 hover:border-neutral-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {containerDefs.length === 0 && (
            <p className="text-[11px] text-amber-500/80">Tambahkan minimal satu kontainer untuk memulai simulasi.</p>
          )}
          {containerDefs.length > 0 && barangForPengiriman.length === 0 && (
            <p className="text-[11px] text-amber-500/80">Pengiriman ini belum memiliki data barang.</p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>
            Simulasi Penataan {activeContainer && `— Kontainer ${activeIdx + 1} (${activeContainer.namaArmada})`}
          </CardTitle>
          <CardDescription>Drag untuk memutar tampilan, scroll untuk zoom.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[520px] rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
            {activeContainer ? (
              <Canvas camera={{ position: [1.7, 1.3, 1.7], fov: 45 }}>
                <ambientLight intensity={0.65} />
                <directionalLight position={[2, 3, 2]} intensity={0.9} />
                <ContainerScene container={activeContainer.box} items={activePacked.slice(0, activeStep)} />
                <OrbitControls enableDamping dampingFactor={0.08} />
              </Canvas>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-neutral-600">
                Belum ada kontainer untuk divisualisasikan.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ContainerScene({ container, items }: { container: Box; items: PackedItem[] }) {
  const maxDim = Math.max(container.w, container.h, container.d) || 1;
  const scale = 1 / maxDim;
  const toScene = (v: number) => v * scale;

  const cw = toScene(container.w);
  const ch = toScene(container.h);
  const cd = toScene(container.d);
  // Kontainer digambar terpusat di origin agar OrbitControls default (target 0,0,0) langsung membingkainya.
  const ox = -cw / 2;
  const oy = -ch / 2;
  const oz = -cd / 2;

  return (
    <group>
      <mesh position={[ox + cw / 2, oy + ch / 2, oz + cd / 2]}>
        <boxGeometry args={[cw, ch, cd]} />
        <meshBasicMaterial color="#2dd4bf" wireframe transparent opacity={0.3} />
      </mesh>

      {items.map((item, idx) => {
        const w = toScene(item.panjang);
        const h = toScene(item.tinggi);
        const d = toScene(item.lebar);
        return (
          <mesh
            key={`${item.barangId}-${idx}`}
            position={[
              ox + toScene(item.x) + w / 2,
              oy + toScene(item.y) + h / 2,
              oz + toScene(item.z) + d / 2,
            ]}
          >
            <boxGeometry args={[w * 0.96, h * 0.96, d * 0.96]} />
            <meshStandardMaterial color={item.color} />
            <Edges color="#0d1414" />
          </mesh>
        );
      })}
    </group>
  );
}
