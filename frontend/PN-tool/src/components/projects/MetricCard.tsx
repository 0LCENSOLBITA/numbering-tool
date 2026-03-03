import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  gradient: "projects" | "active" | "clients";
}

const borderColorMap = {
  projects: "border-l-[hsl(220,70%,35%)]",
  active: "border-l-[hsl(145,65%,42%)]",
  clients: "border-l-[hsl(270,60%,50%)]",
};

const valueColorMap = {
  projects: "text-foreground",
  active: "text-[hsl(145,65%,35%)]",
  clients: "text-[hsl(270,60%,50%)]",
};

export function MetricCard({ title, value, gradient }: MetricCardProps) {
  return (
    <div className={`rounded-xl bg-card p-6 border-l-4 ${borderColorMap[gradient]} animate-fade-in transition-all duration-300 hover:shadow-md cursor-default`}>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className={`text-4xl font-bold mt-2 ${valueColorMap[gradient]}`}>{value}</p>
    </div>
  );
}
