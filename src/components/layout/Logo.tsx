import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

export function Logo({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src="/logo.png"
        alt="FoodFlow"
        width={32}
        height={32}
        className="h-8 w-8 rounded-lg object-cover shadow-card"
      />
      <span className="text-[17px] font-bold tracking-tight text-ink">FoodFlow</span>
    </Link>
  );
}
