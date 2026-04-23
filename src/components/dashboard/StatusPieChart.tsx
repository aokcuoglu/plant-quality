"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const COLORS: Record<string, string> = {
  OPEN: "#f87171",
  IN_PROGRESS: "#fbbf24",
  WAITING_APPROVAL: "#fbbf24",
  RESOLVED: "#34d399",
  REJECTED: "#f87171",
}

const LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_APPROVAL: "Waiting",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
}

interface RawItem {
  status: string
  _count: number
}

export function StatusPieChart({ data, total }: { data: RawItem[]; total: number }) {
  const chartData = data
    .filter((d) => d._count > 0)
    .map((d) => ({
      name: LABELS[d.status] ?? d.status,
      value: d._count,
      color: COLORS[d.status] ?? "#6b7280",
    }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as (typeof chartData)[number]
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <span className="font-medium">{d.name}</span>: {d.value}
                </div>
              )
            }}
          />
          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Active Issues
          </text>
          <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-bold">
            {total}
          </text>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-3">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  )
}
