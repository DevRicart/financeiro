export function LoadingSpinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-cinza dark:text-papel/60">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-cinza/30 border-t-petroleo dark:border-papel/20 dark:border-t-luz" />
      {label}
    </div>
  );
}
