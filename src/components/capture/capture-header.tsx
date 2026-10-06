export function CaptureHeader({
  suggestionContext,
}: {
  suggestionContext?: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center pt-8 pb-4 space-y-2">
      <h1 className="text-xl font-medium text-neutral-900 tracking-tight text-center">
        Capture a moment
      </h1>
      {suggestionContext && (
        <p className="text-sm text-neutral-500 text-center max-w-xs">
          {suggestionContext}
        </p>
      )}
    </div>
  );
}
