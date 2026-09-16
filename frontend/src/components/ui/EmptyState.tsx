export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
      <p className="font-medium text-slate-700 dark:text-slate-300">{title}</p>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}
