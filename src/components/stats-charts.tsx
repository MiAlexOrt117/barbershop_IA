"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const colors = ["#72f0c4", "#7dd3fc", "#fbbf24", "#fda4af", "#c084fc"];

export function StatsCharts({
  weekly,
  monthly,
  topServices,
  barberPerformance
}: {
  weekly: Array<{ label: string; income: number; projected: number }>;
  monthly: Array<{ day: string; value: number }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  barberPerformance: Array<{ name: string; scheduled: number; completed: number; revenue: number }>;
}) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white">Ingresos semanales</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: "#0f1a2d", border: "1px solid rgba(255,255,255,0.08)" }} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#72f0c4" strokeWidth={2} name="Confirmado" />
                <Line type="monotone" dataKey="projected" stroke="#fbbf24" strokeWidth={2} name="Proyectado" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white">Ingresos mensuales</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly.slice(-14)}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: "#0f1a2d", border: "1px solid rgba(255,255,255,0.08)" }} />
                <Bar dataKey="value" fill="#7dd3fc" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white">Servicios top</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topServices} dataKey="count" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4}>
                  {topServices.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f1a2d", border: "1px solid rgba(255,255,255,0.08)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white">Barberos</h3>
          <div className="mt-4 space-y-3">
            {barberPerformance.map((barber) => (
              <div key={barber.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{barber.name}</p>
                    <p className="text-sm text-slate-400">{barber.completed}/{barber.scheduled} completadas</p>
                  </div>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-slate-200">${barber.revenue.toLocaleString("es-MX")}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}