import { Card } from "./ui";
import { cn } from "@/lib/utils";

export function KpiCard({ title, value, hint, delta, tone = "default" }: { title: string; value: string; hint: string; delta?: string; tone?: "default" | "good" | "warn" }) {
  const toneClass = tone === "good" ? "from-accent/20 to-transparent" : tone === "warn" ? "from-accentWarm/20 to-transparent" : "from-white/10 to-transparent";

  return (
    <Card className={cn("bg-gradient-to-br", toneClass)}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-400">{hint}</p>
        </div>
        {delta ? <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-accent">{delta}</span> : null}
      </div>
    </Card>
  );
}