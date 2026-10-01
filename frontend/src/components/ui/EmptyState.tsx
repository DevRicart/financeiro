export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-cinza/30 py-12 text-center dark:border-papel/15">
      <p className="font-medium text-tinta dark:text-papel">{title}</p>
      {description && <p className="text-sm text-cinza dark:text-papel/60">{description}</p>}
    </div>
  );
}
