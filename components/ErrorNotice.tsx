import { AlertTriangle, Refresh } from "./Icons";
import { buttonSecondary } from "./ui";

export function ErrorNotice({
  title,
  message,
  onRetry,
  children,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div role="alert" className="rounded-lg bg-ask-soft px-4 py-4 sm:px-5">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-ask" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-ink-2">{message}</p>
          {(onRetry || children) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {onRetry && (
                <button type="button" onClick={onRetry} className={buttonSecondary}>
                  <Refresh size={18} />
                  Try again
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
