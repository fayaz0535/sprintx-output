'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelloResponse {
  message: string;
  timestamp: string;
}

interface ApiStatus {
  status: string;
  uptime?: number;
  version?: string;
}

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  duration_ms?: number;
  error?: string;
}

interface TestResultsResponse {
  results: TestResult[];
  pass_count: number;
  fail_count: number;
  ran_at?: string;
}

type BadgeStatus = 'running' | 'stopped' | 'loading' | 'unknown';
type ResponseViewerVariant = 'success' | 'error' | 'empty';

// ─── Design tokens (Tailwind classes aligned to token map) ───────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── StatusBadge ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  size?: 'sm' | 'md';
}

function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  if (status === 'loading') {
    return (
      <span
        className={`inline-block rounded-full bg-gray-200 animate-pulse ${size === 'sm' ? 'w-16 h-5' : 'w-20 h-6'}`}
        aria-label="Checking status…"
      />
    );
  }

  const variantClasses: Record<BadgeStatus, string> = {
    running: 'bg-green-100 text-green-700 border border-green-300',
    stopped: 'bg-red-100 text-red-700 border border-red-300',
    loading: '',
    unknown: 'bg-gray-100 text-gray-500 border border-gray-300',
  };

  const dotColors: Record<BadgeStatus, string> = {
    running: 'bg-green-500',
    stopped: 'bg-red-500',
    loading: '',
    unknown: 'bg-gray-400',
  };

  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${variantClasses[status]}`}
      role="status"
    >
      {status === 'unknown' ? (
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
        </svg>
      ) : (
        <span className={`w-2 h-2 rounded-full ${dotColors[status]}`} aria-hidden="true" />
      )}
      {displayLabel}
    </span>
  );
}

// ─── EndpointCard ─────────────────────────────────────────────────────────────

interface EndpointCardProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  route: string;
  description: string;
  onClick?: () => void;
  variant?: 'default' | 'active' | 'disabled';
  isLoading?: boolean;
}

function EndpointCard({ method, route, description, onClick, variant = 'default', isLoading = false }: EndpointCardProps) {
  if (isLoading) {
    return (
      <div className="w-full h-[72px] rounded-lg bg-gray-200 animate-pulse" aria-hidden="true" />
    );
  }

  const methodColors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    DELETE: 'bg-red-100 text-red-700',
    PATCH: 'bg-purple-100 text-purple-700',
  };

  const variantClasses: Record<string, string> = {
    default: 'border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md cursor-pointer',
    active: 'border-2 border-indigo-500 bg-indigo-50 shadow-md cursor-pointer',
    disabled: 'border border-gray-200 bg-gray-50 cursor-not-allowed opacity-60',
  };

  const isDisabled = variant === 'disabled';

  return (
    <button
      type="button"
      onClick={!isDisabled ? onClick : undefined}
      disabled={isDisabled}
      title={isDisabled ? 'This endpoint is currently unavailable' : undefined}
      className={`w-full text-left rounded-lg px-4 py-3 transition-all duration-150 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-indigo-400/60 ${variantClasses[variant]}`}
    >
      <div className="flex items-center gap-3">
        <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold tracking-wide ${methodColors[method] ?? 'bg-gray-100 text-gray-600'}`}>
          {method}
        </span>
        <span className="font-mono text-sm font-medium text-gray-900">{route}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500 truncate">{description}</p>
    </button>
  );
}

// ─── ResponseViewer ───────────────────────────────────────────────────────────

interface ResponseViewerProps {
  status?: number | null;
  headers?: Record<string, string> | null;
  body?: unknown;
  isLoading?: boolean;
  variant?: ResponseViewerVariant;
}

function ResponseViewer({ status, headers, body, isLoading = false, variant = 'empty' }: ResponseViewerProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2" aria-busy="true" aria-label="Loading response">
        {[100, 80, 90, 60].map((w, i) => (
          <div key={i} className={`h-4 rounded bg-gray-200 animate-pulse`} style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }

  if (variant === 'empty' || body === undefined) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center h-36 text-sm text-gray-400">
        Send a request to see the response
      </div>
    );
  }

  const borderClass = variant === 'error' ? 'border-red-400' : 'border-green-400';
  const statusColor = status && status >= 200 && status <