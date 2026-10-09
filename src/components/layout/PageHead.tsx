import type { ReactNode } from "react";

export function PageHead({
  title,
  sub,
  actions,
  eyebrow,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  // Page headers show only the title (the eyebrow and descriptive subtitle
  // were intentionally dropped app-wide for a cleaner header on every page).
  // `eyebrow`/`sub` are still accepted so callers compile unchanged.
  void eyebrow;
  void sub;
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
