import { Boxes, PackageSearch, Sparkles, Truck, PackageCheck, View, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export interface StepDef {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const STEPS: StepDef[] = [
  { key: "karoseri", label: "Karoseri", icon: Boxes },
  { key: "armada", label: "Armada", icon: Truck },
  { key: "pengiriman", label: "Pengiriman", icon: PackageSearch },
  { key: "barang", label: "Barang", icon: PackageCheck },
  { key: "rekomendasi", label: "Rekomendasi AI", icon: Sparkles },
  { key: "visualisasi", label: "Visualisasi 3D", icon: View },
];

export function StepNav({
  active,
  onChange,
}: {
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <nav className="mx-auto max-w-[1400px] px-6 pt-6">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STEPS.map((step, idx) => {
          const isActive = step.key === active;
          const Icon = step.icon;
          return (
            <button
              key={step.key}
              onClick={() => onChange(step.key)}
              className={cn(
                "group relative flex flex-col items-start gap-2.5 rounded-2xl border p-3.5 text-left transition-all",
                isActive
                  ? "border-teal-400/40 bg-teal-400/[0.07]"
                  : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border",
                    isActive
                      ? "bg-teal-400/15 border-teal-400/30 text-teal-300"
                      : "bg-neutral-800/70 border-neutral-700 text-neutral-400"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-mono",
                    isActive ? "text-teal-400" : "text-neutral-600"
                  )}
                >
                  0{idx + 1}
                </span>
              </div>
              <span
                className={cn(
                  "text-xs font-medium leading-tight",
                  isActive ? "text-cream-100" : "text-neutral-400"
                )}
              >
                {step.label}
              </span>
              {isActive && (
                <span className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-teal-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
