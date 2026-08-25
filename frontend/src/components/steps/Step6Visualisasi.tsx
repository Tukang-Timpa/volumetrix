import { useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges } from "@react-three/drei";
import { Play, Pause, RotateCcw, Box as BoxIcon, Gauge, X, Loader2 } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Select } from "../ui/select";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { KAROSERI_LABEL } from "../../types";

const SPEED_OPTIONS = [
  { label: "0.5×", ms: 900 },
  { label: "1×", ms: 500 },
  { label: "2×", ms: 250 },
  { label: "4×", ms: 120 },
];

const API_BASE = "http://localhost:8001";

interface BackendBox {
  w: number;
  h: number;
  d: number;
}

interface BackendItem {
  id: string;
  name: string;
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
  color: string;
  orientasi: number;
  bottom_axis?: string | null;
}

export function Step6Visualisasi() {
  const { pengirimanList } = useAppData();
  const [pengirimanId, setPengirimanId] = useState(pengirimanList[0]?.id ?? "");

  // Parent vs children
  const children = pengirimanList.filter((p: any) => p.parentId === pengirimanId);
  const activeTabs = children.length > 0 ? children : pengirimanList.filter(p => p.id === pengirimanId);

  const [activeTabId, setActiveTabId] = useState<string>("");

  useEffect(() => {
    if (activeTabs.length > 0 && !activeTabs.find(t => t.id === activeTabId)) {
      setActiveTabId(activeTabs[0].id);
    }
  }, [activeTabs, activeTabId]);

  const [loading, setLoading] = useState(false);
  const [visData, setVisData] = useState<{ box: BackendBox; items: BackendItem[] } | null>(null);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(SPEED_OPTIONS[1].ms);
  const intervalRef = useRef<number | null>(null);

  // Fetch data
  useEffect(() => {
    if (!activeTabId) return;
    let isMounted = true;
    setLoading(true);
    setVisData(null);
    setStep(0);
    setPlaying(false);

    fetch(`${API_BASE}/pengiriman/${activeTabId}/visualisation`)
      .then(res => {
        if (!res.ok) throw new Error("Gagal mengambil data 3D dari backend.");
        return res.json();
      })
      .then(data => {
        if (!isMounted) return;
        const box: BackendBox = {
          w: data.karoseri?.panjang || 100,
          h: data.karoseri?.tinggi || 100,
          d: data.karoseri?.lebar || 100
        };
        const items: BackendItem[] = (data.items || []).map((it: any) => ({
          id: it.barang_id,
          name: it.nama_barang || `#${it.barang_id}`,
          w: it.panjang,
          h: it.tinggi,
          d: it.lebar,
          x: it.posisi_x,
          // Swap Y and Z from backend if needed. In test-console: targetY = z + t/2, targetZ = y + l/2
          y: it.posisi_z,
          z: it.posisi_y,
          color: it.is_fragile ? "#e8926b" : "#5b8def",
          orientasi: it.orientasi || 0,
          bottom_axis: it.bottom_axis
        }));
        setVisData({ box, items });
      })
      .catch(err => {
        if (isMounted) console.error(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [activeTabId]);

  useEffect(() => {
    if (playing && visData && step < visData.items.length) {
      intervalRef.current = window.setInterval(() => {
        setStep(prev => {
          if (prev + 1 >= visData.items.length) {
            setPlaying(false);
            return visData.items.length;
          }
          return prev + 1;
        });
      }, speedMs);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [playing, speedMs, step, visData]);

  // Utilisasi
  const util = visData && visData.box.w * visData.box.h * visData.box.d > 0
    ? (visData.items.slice(0, step).reduce((sum, it) => sum + (it.w * it.h * it.d), 0) / (visData.box.w * visData.box.h * visData.box.d)) * 100
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2 h-fit">
        <CardHeader>
          <CardTitle>Visualisasi 3D Tersimpan</CardTitle>
          <CardDescription>Pilih pengiriman untuk melihat hasil visualisasi dari backend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Pengiriman (Induk)</Label>
            <Select value={pengirimanId} onChange={(e) => setPengirimanId(e.target.value)}>
              <option value="">— Pilih pengiriman —</option>
              {pengirimanList.filter((p: any) => !p.parentId).map((p) => (
                <option key={p.id} value={p.id}>{p.id} · {p.kodePengiriman}</option>
              ))}
            </Select>
          </div>

          {children.length > 0 && (
            <div>
              <Label>Sub-Truk (Multi-Kontainer)</Label>
              <div className="flex flex-col gap-1.5 mt-1.5">
                {children.map((c: any, i: number) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveTabId(c.id)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      activeTabId === c.id
                        ? "border-teal-400/40 bg-teal-400/[0.07] text-teal-300"
                        : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-700 text-neutral-300"
                    )}
                  >
                    Truk {i + 1} (Sub-ID: {c.id})
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-teal-400 h-6 w-6" /></div>
          ) : visData ? (
            <>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-400">
                <p className="flex items-center gap-1.5 text-neutral-300 mb-1">
                  <BoxIcon className="h-3.5 w-3.5 text-teal-300" /> Kontainer
                </p>
                Dimensi kontainer: {visData.box.w} × {visData.box.d} × {visData.box.h} cm
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                <p className="text-[10px] text-neutral-500 mb-1.5">Utilisasi Volume Terpakai</p>
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-lg font-semibold text-cream-100">{util.toFixed(1)}%</span>
                  <span className="text-[11px] text-neutral-500">{step}/{visData.items.length} item</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${util}%` }} />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => setPlaying(p => !p)}
                    disabled={visData.items.length === 0}
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {playing ? "Jeda" : "Putar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => { setStep(0); setPlaying(false); }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <input
                  type="range"
                  min={0}
                  max={visData.items.length}
                  value={step}
                  onChange={(e) => {
                    setStep(parseInt(e.target.value, 10));
                    setPlaying(false);
                  }}
                  className="w-full accent-teal-400"
                  disabled={visData.items.length === 0}
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
            </>
          ) : (
            <p className="text-[11px] text-amber-500/80">Tidak ada data visualisasi.</p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Simulasi Penataan 3D</CardTitle>
          <CardDescription>Dapatkan posisi dari backend, putar untuk rotasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[520px] rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden relative">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-neutral-500">Memuat geometri...</div>
            ) : visData ? (
              <Canvas camera={{ position: [1.7, 1.3, 1.7], fov: 45 }}>
                <ambientLight intensity={0.65} />
                <directionalLight position={[2, 3, 2]} intensity={0.9} />
                <ContainerScene box={visData.box} items={visData.items.slice(0, step)} />
                <OrbitControls enableDamping dampingFactor={0.08} />
              </Canvas>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-neutral-600">
                Pilih pengiriman di sebelah kiri.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ContainerScene({ box, items }: { box: BackendBox; items: BackendItem[] }) {
  const maxDim = Math.max(box.w, box.h, box.d) || 1;
  const scale = 1 / maxDim;
  const toScene = (v: number) => v * scale;

  const cw = toScene(box.w);
  const ch = toScene(box.h);
  const cd = toScene(box.d);
  
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
        const w = toScene(item.w);
        const h = toScene(item.h);
        const d = toScene(item.d);
        return (
          <mesh
            key={`${item.id}-${idx}`}
            position={[
              ox + toScene(item.x) + w / 2,
              oy + toScene(item.y) + h / 2,
              oz + toScene(item.z) + d / 2,
            ]}
          >
            <boxGeometry args={[w * 0.96, h * 0.96, d * 0.96]} />
            {Array(6).fill(null).map((_, i) => {
              const bottomFaceIndex = getBottomFaceIndex(item.bottom_axis, item.orientasi);
              return (
                <meshStandardMaterial 
                  key={i} 
                  attach={`material-${i}`} 
                  color={bottomFaceIndex === i ? "#ef4444" : item.color} 
                />
              );
            })}
            <Edges color="#0d1414" />
          </mesh>
        );
      })}
    </group>
  );
}

function getBottomFaceIndex(bottom_axis: string | null | undefined, orientasi: number): number {
  if (!bottom_axis) return -1;
  
  if (bottom_axis === "panjang") {
    if (orientasi === 0 || orientasi === 5) return 1;
    if (orientasi === 1 || orientasi === 4) return 5;
    if (orientasi === 2 || orientasi === 3) return 3;
  } else if (bottom_axis === "lebar") {
    if (orientasi === 1 || orientasi === 2) return 1;
    if (orientasi === 0 || orientasi === 3) return 5;
    if (orientasi === 4 || orientasi === 5) return 3;
  } else if (bottom_axis === "tinggi") {
    if (orientasi === 3 || orientasi === 4) return 1;
    if (orientasi === 2 || orientasi === 5) return 5;
    if (orientasi === 0 || orientasi === 1) return 3;
  }
  return -1;
}
