import * as React from "react";
import { cn } from "../../lib/utils";
import type { AssetStatus, PengirimanStatus } from "../../types";

const assetStatusStyle: Record<AssetStatus, string> = {
  aktif: "bg-teal-400/15 text-teal-300 border-teal-400/30",
  ready: "bg-cream-100/10 text-cream-200 border-cream-100/25",
  maintenance: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const pengirimanStatusStyle: Record<PengirimanStatus, string> = {
  persiapan: "bg-cream-100/10 text-cream-200 border-cream-100/25",
  "on-going": "bg-teal-400/15 text-teal-300 border-teal-400/30",
  selesai: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        className
      )}
      {...props}
    />
  );
}

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return <Badge className={assetStatusStyle[status]}>{status}</Badge>;
}

export function PengirimanStatusBadge({ status }: { status: PengirimanStatus }) {
  return <Badge className={pengirimanStatusStyle[status]}>{status}</Badge>;
}
