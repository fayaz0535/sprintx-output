'use client';

import { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelloResponse {
  message: string;
  timestamp: string;
}

type RequestState = 'idle' | 'loading' | 'error' | 'success';

interface AppState {
  status: RequestState;
  statusCode: number | null;
  contentType: string | null;
  data: HelloResponse | null;
  rawJson: string | null;
  errorMessage: string | null;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function isValidISO8601(value: string): boolean {
  return !isNaN(Date.parse(value));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({
  statusCode,
  contentType,
  isLoading,
}: {
  statusCode: number | null;
  contentType: string | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading status"
        className="h-6 w-12 rounded-full animate-pulse bg-gray-200"
        style={{ minWidth: '48px' }}
      />
    );
  }

  if (statusCode === null) return null;

  let bgColor = '#059669';
  let textColor = '#ffffff';
  let label = `${statusCode}`;

  if (statusCode >= 500) {
    bgColor = '#DC2626';
    label = `${statusCode} Error`;
  } else if (statusCode >= 400) {
    bgColor = '#B45309';
    label = `${statusCode} Error`;
  } else if (statusCode === 0) {
    bgColor = '#B45309';
    label = 'Unreachable';
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: bgColor, color: textColor }}
        aria-label={`HTTP status ${statusCode}`}
      >
        {statusCode >= 200 && statusCode < 300 && (
          <svg
            className="h-3 w-3"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {statusCode >= 400 && (
          <svg
            className="h-3 w-3"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 2v4M6 8.5v.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
        {label}
      </span>
      {contentType && (
        <span
          className="text-xs"
          style={{ color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}
          aria-label={`Content-Type: ${contentType}`}
        >
          {contentType}
        </span>
      )}
    </div>
  );
}

function ResponseFieldGroup({
  message,
  timestamp,
  formattedTimestamp,
  isLoading,
  hasError,
}: {
  message: string | null;
  timestamp: string | null;
  formattedTimestamp: string | null;
  isLoading: boolean;
  hasError: boolean;
}) {
  const dash = (label: string) => (
    <span
      className="text-sm"
      style={{ color: '#6B7280' }}
      aria-label={`${label} missing`}
    >
      —
    </span>
  );

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading fields">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-20 rounded animate-pulse bg-gray-200" />
            <div className="h-4 w-full rounded animate-pulse bg-gray-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <dl className="space-y-3">
      <div>
        <dt
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: '#6B7280' }}
        >
          message
        </dt>
        <dd
          className="mt-0.5 text-sm font-medium"
          style={{ color: hasError || !message ? '#6B7280' : '#111827' }}
        >
          {message ?? dash('message')}
        </dd>
      </div>

      <div>
        <dt
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: '#6B7280' }}
        >
          timestamp
        </dt>
        <dd className="mt-0.5 space-y-0.5">
          {timestamp ? (
            <>
              <p
                className="text-sm font-medium"
                style={{
                  color: '#111827',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {timestamp}
              </p>
              {formattedTimestamp && (
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {formattedTimestamp}
                </p>
              )}
              {!isValidISO8601(timestamp) && (
                <p
                  className="text-xs"
                  style={{ color: '#DC2626' }}
                  role="alert"
                >
                  ⚠ Value is not a valid ISO 8601 datetime
                </p>
              )}
            </>
          ) : (
            dash('timestamp')
          )}
        </dd>
      </div>
    </dl>
  );
}

function RawJSONViewer({
  json,
  isExpanded,
  onToggle,
  onCopy,
  isLoading,
}: {
  json: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: () => void;
  isLoading: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [onCopy]);

  const label = json ? (isExpanded ? 'Collapse JSON' : 'Expand JSON') : 'Awaiting response';

  return (
    <div
      className="rounded-md border overflow-hidden"
      style={{ borderColor: '#E5E7EB' }}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={