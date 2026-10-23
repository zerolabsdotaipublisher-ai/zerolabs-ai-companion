export function TimelineSkeleton() {
  return (
    <div className="flex flex-col space-y-6 w-full max-w-xl mx-auto px-4 py-8">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse flex flex-col space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm"
        >
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-32 bg-slate-200 rounded w-full mt-2"></div>
        </div>
      ))}
    </div>
  );
}
