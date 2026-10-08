import { AlertTriangle, Refresh } from "./Icons";
import { buttonSecondary } from "./ui";

export function ErrorNotice({
  title,
  message,
  onRetry,
  retryLabel = "Try again",
  children,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-[0.95rem]">{message}</p>
          {(onRetry || children) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {onRetry && (
                <button type="button" onClick={onRetry} className={buttonSecondary}>
                  <Refresh size={18} />
                  {retryLabel}
                </button>
              )}
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
