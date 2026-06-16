import React from 'react';

interface EndpointCardProps {
  method: string;
  path: string;
  isLoading: boolean;
  onSend: () => void;
  error?: string | null;
}

const METHOD_STYLES: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'bg-blue-100', text: 'text-blue-700' },
  POST: { bg: 'bg-green-100', text: 'text-green-700' },
  PUT: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  PATCH: { bg: 'bg-orange-100', text: 'text-orange-700' },
  DELETE: { bg: 'bg-red-100', text: 'text-red-700' },
};

const EndpointCard: React.FC<EndpointCardProps> = ({
  method,
  path,
  isLoading,
  onSend,
  error,
}) => {
  const normalizedMethod = method.toUpperCase();
  const methodStyle = METHOD_STYLES[normalizedMethod] ?? {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
  };

  return (
    <div
      className={[
        'bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
        'border',
        error ? 'border-red-600' : 'border-[#E5E7EB]',
        'p-6',
        'font-[Inter,system-ui,sans-serif]',
      ].join(' ')}
      role="region"
      aria-label={`${normalizedMethod} ${path} endpoint`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {/* Method badge */}
          <span
            className={[
              'inline-flex items-center justify-center',
              'px-2.5 py-1',
              'rounded-[0.25rem]',
              'text-xs font-semibold tracking-wide uppercase',
              'shrink-0',
              'font-[JetBrains_Mono,monospace]',
              methodStyle.bg,
              methodStyle.text,
            ].join(' ')}
            aria-label={`HTTP method: ${normalizedMethod}`}
          >
            {normalizedMethod}
          </span>

          {/* Path */}
          <code
            className={[
              'text-sm font-medium truncate',
              'font-[JetBrains_Mono,monospace]',
              'text-[#111827]',
            ].join(' ')}
            title={path}
          >
            {path}
          </code>
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={onSend}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label={isLoading ? 'Sending request…' : `Send ${normalizedMethod} ${path}`}
          className={[
            'inline-flex items-center gap-2',
            'px-4 py-2',
            'rounded-md',
            'text-sm font-medium',
            'text-white',
            'bg-[#4F46E5]',
            'transition-colors duration-[150ms] ease-in-out',
            'focus:outline-none focus-visible:ring-[0_0_0_3px_rgba(79,70,229,0.45)]',
            'focus-visible:shadow-[0_0_0_3px_rgba(79,70,229,0.45)]',
            isLoading
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-[#4338CA] cursor-pointer',
          ].join(' ')}
        >
          {isLoading ? (
            <>
              <SpinnerIcon />
              <span>Sending…</span>
            </>
          ) : (
            <>
              <SendIcon />
              <span>Send Request</span>
            </>
          )}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className={[
            'mt-4',
            'flex items-start gap-3',
            'rounded-md',
            'border border-red-300',
            'bg-red-50',
            'px-4 py-3',
            'text-sm text-red-700',
          ].join(' ')}
        >
          <ErrorIcon className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Request failed</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Icon helpers ─────────────────────────────────────────────────────────── */

const SpinnerIcon: React.FC = () => (
  <svg
    className="h-4 w-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const SendIcon: React.FC = () => (
  <svg
    className="h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M3.105 3.105a1 1 0 011.27-.083l13 8a1 1 0 010 1.756l-13 8a1 1 0 01-1.437-1.088L4.5 12H10a1 1 0 000-2H4.5L2.938 4.276a1 1 0 01.167-.171z" />
  </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`h-4 w-4 ${className ?? ''}`}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zM9 8a1 1 0 012 0v3a1 1 0 11-2 0V8z"
      clipRule="evenodd"
    />
  </svg>
);

export default EndpointCard;