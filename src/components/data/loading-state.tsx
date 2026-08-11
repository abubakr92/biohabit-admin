export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="animate-pulse divide-y divide-slate-100">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex h-[68px] items-center gap-6 px-5">
            <div className="h-3 w-1/4 rounded bg-slate-200" />
            <div className="h-3 w-1/6 rounded bg-slate-100" />
            <div className="h-3 w-1/5 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
