import { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Select } from "../ui/select";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

const API_BASE = "http://localhost:8001";

export function Step5Rekomendasi() {
  const { pengirimanList, armadaList, barangList, refreshAll } = useAppData();
  const [pengirimanId, setPengirimanId] = useState(pengirimanList[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [kesimpulan, setKesimpulan] = useState<string>("");
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const itemsForPengiriman = barangList.filter((b) => b.pengirimanId === pengirimanId);

  const runAnalysis = () => {
    setLoading(true);
    setHasAnalyzed(false);
    setStrategies([]);
    setProgressText("Memulai analisis AI...");
    setSelectedId(null);

    const url = `${API_BASE}/pengiriman/${pengirimanId}/strategize`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      if (event.data === "[DONE]") {
        eventSource.close();
        setLoading(false);
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data.step === "done") {
          eventSource.close();
          setStrategies(data.data?.recommendation?.strategies || []);
          setKesimpulan(data.data?.recommendation?.kesimpulan || "");
          setHasAnalyzed(true);
          setLoading(false);
        } else if (data.step === "error" || data.step === "timeout") {
          eventSource.close();
          setProgressText(`Error: ${data.message}`);
          setLoading(false);
        } else {
          setProgressText(`${data.step}: ${data.message || ''}`);
        }
      } catch (err) {
        console.error("Parse error", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error", err);
      eventSource.close();
      setProgressText("Koneksi terputus atau terjadi kesalahan server.");
      setLoading(false);
    };
  };

  const executeStrategy = async (strat: any) => {
    setExecutingId(strat.label);
    try {
      const res = await fetch(`${API_BASE}/pengiriman/${pengirimanId}/execute-strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_label: strat.label,
          armada_sequence: strat.armada_sequence || []
        })
      });
      if (!res.ok) throw new Error("Gagal mengeksekusi strategi");
      await refreshAll();
      setSelectedId(strat.label);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-300" /> Rekomendasi AI Backend
          </CardTitle>
          <CardDescription>
            Memanggil <b>Groq LLM</b> dan engine py3dbp secara langsung.
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

          {loading && (
            <div className="mt-4 p-3 rounded bg-neutral-900 border border-neutral-800 text-xs text-teal-400 font-mono">
              &gt; {progressText}
            </div>
          )}

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

      {hasAnalyzed && (
        <>
          {kesimpulan && (
            <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-md text-xs text-neutral-300 mb-2">
              <span className="font-semibold text-teal-300 block mb-1">Kesimpulan AI:</span>
              {kesimpulan}
            </div>
          )}
          <div className={cn("grid grid-cols-1 gap-4", strategies.length > 1 ? "md:grid-cols-2 lg:grid-cols-3" : "max-w-md")}>
            {strategies.map((rec, idx) => {
              const isSelected = selectedId === rec.label;
              return (
                <Card
                  key={idx}
                  className={cn(
                    "flex flex-col transition-all",
                    isSelected && "border-teal-400/60 ring-1 ring-teal-400/40 bg-teal-400/[0.04]"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-neutral-600">Rank {rec.ranking || (idx + 1)}</span>
                      {idx === 0 && (
                        <span className="rounded-full bg-teal-400/15 border border-teal-400/30 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                          Paling direkomendasikan
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base mt-1">
                      {rec.label}
                    </CardTitle>
                    <CardDescription>
                      {rec.semua_muat ? "Semua muat dalam strategi ini." : "Sebagian barang tidak muat."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    
                    <div className="grid grid-cols-2 gap-3">
                      <UtilStat label="Utilisasi Volume" value={rec.utilisasi_volume_persen || 0} />
                      <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                        <p className="text-[10px] text-neutral-500 mb-1.5">Skor</p>
                        <div className="flex items-end justify-between mb-1.5">
                          <span className="text-lg font-semibold text-cream-100">{rec.skor}</span>
                        </div>
                      </div>
                    </div>

                    {(rec.estimasi_biaya_bbm !== undefined || rec.estimasi_biaya !== undefined) && (
                      <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                        <div>
                          <p className="text-[10px] text-neutral-500">Estimasi Bensin</p>
                          <p className="text-sm font-semibold text-cream-100">
                            Rp {(rec.estimasi_biaya_bbm || 0).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-neutral-500">Volume BBM</p>
                          <p className="text-sm font-semibold text-cream-100">
                            {(rec.estimasi_liter_bbm || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 })} L
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-neutral-300 leading-relaxed bg-neutral-900/40 p-2 rounded border border-neutral-800/50">
                      {rec.ringkasan}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="flex items-center gap-1 text-neutral-400 mb-1">
                          <ThumbsUp className="h-3 w-3 text-teal-400" /> Pro
                        </p>
                        <ul className="space-y-1 text-neutral-300">
                          {rec.pro?.map((k: string, i: number) => (
                            <li key={i} className="flex gap-1.5">
                              <span className="text-teal-400">·</span>{k}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="flex items-center gap-1 text-neutral-400 mb-1">
                          <ThumbsDown className="h-3 w-3 text-amber-500" /> Kontra
                        </p>
                        <ul className="space-y-1 text-neutral-300">
                          {rec.kontra?.map((k: string, i: number) => (
                            <li key={i} className="flex gap-1.5">
                              <span className="text-amber-500">·</span>{k}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <Button
                      variant={isSelected ? "default" : "secondary"}
                      className="mt-auto w-full"
                      disabled={executingId !== null && executingId !== rec.label}
                      onClick={() => executeStrategy(rec)}
                    >
                      {executingId === rec.label ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Menyimpan...</>
                      ) : isSelected ? (
                        <><CheckCircle2 className="h-4 w-4 mr-2" /> Dieksekusi</>
                      ) : (
                        "Eksekusi Strategi Ini"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {selectedId && (
        <p className="text-[11px] text-teal-400/80">
          Strategi berhasil dieksekusi dan sub-pengiriman telah dibuat! Silakan buka tab Visualisasi Tersimpan (Step 4) untuk merender hasilnya secara 3D.
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
