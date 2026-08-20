import { useAppData } from "../../context/AppDataContext";
import { Boxes, Truck, PackageSearch, PackageCheck, ClipboardList, Sparkles, AlertCircle } from "lucide-react";
import { KAROSERI_LABEL, ARMADA_LABEL } from "../../types";
import { cn } from "../../lib/utils";

export function Step7Ringkasan() {
  const { karoseriList, armadaList, pengirimanList, barangList, selectedStrategi } = useAppData();

  const metrics = [
    { label: "Total Karoseri", value: karoseriList.length, icon: Boxes, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { label: "Total Armada", value: armadaList.length, icon: Truck, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    { label: "Total Pengiriman", value: pengirimanList.length, icon: PackageSearch, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
    { label: "Total Barang", value: barangList.length, icon: PackageCheck, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-cream-100 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-400" />
            Ringkasan Data
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Keseluruhan data dari awal sampai akhir proses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className={cn("p-4 rounded-xl border bg-neutral-900/50 flex flex-col gap-3", m.border)}>
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", m.bg, m.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-neutral-400">{m.label}</p>
                <p className="text-2xl font-bold text-cream-100">{m.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Karoseri Summary */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-4">
          <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2 border-b border-neutral-800 pb-2">
            <Boxes className="h-4 w-4 text-blue-400" /> Data Karoseri
          </h3>
          {karoseriList.length === 0 ? (
            <div className="text-xs text-neutral-500 italic py-4 text-center">Belum ada data karoseri</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {karoseriList.map(k => (
                <div key={k.id} className="text-xs flex justify-between items-center p-2 rounded bg-neutral-800/50">
                  <span className="font-medium text-cream-100">{KAROSERI_LABEL[k.jenis] || k.jenis}</span>
                  <span className="text-neutral-400">{k.panjang}x{k.lebar}x{k.tinggi} cm</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Armada Summary */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-4">
          <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2 border-b border-neutral-800 pb-2">
            <Truck className="h-4 w-4 text-emerald-400" /> Data Armada
          </h3>
          {armadaList.length === 0 ? (
            <div className="text-xs text-neutral-500 italic py-4 text-center">Belum ada data armada</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {armadaList.map(a => {
                const karoseri = karoseriList.find(k => k.id === a.karoseriId);
                return (
                  <div key={a.id} className="text-xs p-2 rounded bg-neutral-800/50 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-cream-100">{a.namaKendaraan} ({ARMADA_LABEL[a.jenisArmada] || a.jenisArmada})</span>
                      <span className="text-neutral-400">{a.maxPayload} kg</span>
                    </div>
                    {karoseri && (
                      <div className="text-[10px] text-neutral-500">
                        Karoseri: {KAROSERI_LABEL[karoseri.jenis]} ({karoseri.panjang}x{karoseri.lebar}x{karoseri.tinggi})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pengiriman & Barang Summary */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2 border-b border-neutral-800 pb-2">
            <PackageSearch className="h-4 w-4 text-orange-400" /> Pengiriman & Barang
          </h3>
          {pengirimanList.length === 0 ? (
            <div className="text-xs text-neutral-500 italic py-4 text-center">Belum ada data pengiriman</div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {pengirimanList.map(p => {
                const barangInPengiriman = barangList.filter(b => b.pengirimanId === p.id);
                return (
                  <div key={p.id} className="border border-neutral-800/50 rounded-lg p-3 bg-neutral-800/30">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium text-sm text-cream-100">{p.kodePengiriman}</div>
                      <div className="text-xs text-neutral-400">{p.asal} &rarr; {p.tujuan} ({p.jarakKm} km)</div>
                    </div>
                    <div className="text-xs text-neutral-500 mb-2">{barangInPengiriman.length} jenis barang</div>
                    
                    {barangInPengiriman.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {barangInPengiriman.map(b => (
                          <div key={b.id} className="text-[10px] p-2 rounded bg-neutral-900/60 border border-neutral-800 flex justify-between">
                            <span className="text-neutral-300 truncate mr-2" title={b.namaBarang}>{b.namaBarang}</span>
                            <span className="text-neutral-400 flex-shrink-0">{b.quantity} pcs x {b.berat}kg</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Strategi Terpilih */}
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-5 space-y-4 md:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 bg-teal-500/5 rounded-bl-full pointer-events-none" />
          <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2 border-b border-teal-500/20 pb-2">
            <Sparkles className="h-4 w-4" /> Strategi Terpilih (Rekomendasi AI)
          </h3>
          {!selectedStrategi ? (
            <div className="text-xs text-neutral-500 italic py-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Belum ada strategi terpilih. Lakukan visualisasi terlebih dahulu di Step 5 & 6.
            </div>
          ) : (
            <div className="space-y-4 relative z-10">
              <div className="text-sm text-cream-100">
                Pengiriman: <span className="font-mono text-teal-300">{pengirimanList.find(p => p.id === selectedStrategi.pengirimanId)?.kodePengiriman || selectedStrategi.pengirimanId}</span>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-neutral-400">Kontainer yang digunakan:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedStrategi.containers.map((c, idx) => (
                    <div key={idx} className="border border-teal-500/20 rounded-lg p-3 bg-neutral-900/60">
                      <div className="font-medium text-xs text-teal-100 mb-1">{c.namaArmada}</div>
                      <div className="text-[10px] text-neutral-400 mb-2">Karoseri: {KAROSERI_LABEL[c.jenisKaroseri] || c.jenisKaroseri}</div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-neutral-500">Vol. Utilisasi</span>
                          <span className={c.utilisasiVolume > 80 ? "text-emerald-400" : "text-yellow-400"}>{c.utilisasiVolume}%</span>
                        </div>
                        <div className="w-full bg-neutral-800 rounded-full h-1">
                          <div className={cn("h-1 rounded-full", c.utilisasiVolume > 80 ? "bg-emerald-400" : "bg-yellow-400")} style={{ width: `${c.utilisasiVolume}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
