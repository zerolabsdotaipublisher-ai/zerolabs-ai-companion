export function TimelineEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center h-full">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-8 h-8 text-slate-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-2">
        A Quiet Beginning
      </h3>
      <p className="text-slate-500 max-w-sm">
        Your timeline will quietly collect moments as you live your days.
      </p>
    </div>
  );
}
