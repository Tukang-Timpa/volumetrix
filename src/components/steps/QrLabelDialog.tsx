import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { Button } from "../ui/button";
import { encodeBarangQr } from "../../lib/qrBarang";
import type { Barang } from "../../types";

export function QrLabelDialog({ barang }: { barang: Barang }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const payload = encodeBarangQr({
      namaBarang: barang.namaBarang,
      panjang: barang.panjang,
      lebar: barang.lebar,
      tinggi: barang.tinggi,
      berat: barang.berat,
      quantity: barang.quantity,
      bisaDitumpuk: barang.bisaDitumpuk,
    });
    QRCode.toDataURL(payload, { margin: 1, width: 240, color: { dark: "#0a0a0a", light: "#f5f0e6" } })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setDataUrl(null); });
    return () => { cancelled = true; };
  }, [barang]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-[240px] w-[240px] items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950">
        {dataUrl ? (
          <img src={dataUrl} alt={`QR ${barang.namaBarang}`} className="rounded-lg" />
        ) : (
          <span className="text-xs text-neutral-600">Membuat QR…</span>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-neutral-200">{barang.namaBarang}</p>
        <p className="text-[11px] text-neutral-500">
          {barang.panjang}×{barang.lebar}×{barang.tinggi} cm · {barang.berat} kg · qty {barang.quantity}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={!dataUrl}
        onClick={() => {
          if (!dataUrl) return;
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `qr-${barang.id}.png`;
          a.click();
        }}
      >
        <Download className="h-3.5 w-3.5" /> Unduh Label QR
      </Button>
    </div>
  );
}
