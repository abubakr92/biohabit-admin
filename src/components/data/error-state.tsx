import { AlertCircle, RotateCcw } from 'lucide-react';
export function ErrorState({
  message = 'We could not load this data.',
  retry,
}: {
  message?: string;
  retry?: () => void;
}) {
  return (
    <div className="card flex min-h-52 flex-col items-center justify-center px-6 text-center">
      <AlertCircle className="mb-3 size-6 text-red-500" />
      <h3 className="font-semibold">Something went wrong</h3>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      {retry && (
        <button className="btn mt-5" onClick={retry}>
          <RotateCcw className="size-4" />
          Try again
        </button>
      )}
    </div>
  );
}
