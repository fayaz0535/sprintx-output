import React from "react";

export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  duration?: number;
  errorMessage?: string;
}

interface TestResultsListProps {
  results: TestResult[];
  passCount: number;
  failCount: number;
  isLoading: boolean;
  onRunSuite?: () => void;
  runnerError?: string | null;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E7EB] last:border-b-0 animate-pulse">
      <div className="w-5 h-5 rounded-full bg-[#E5E7EB] flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-[#E5E7EB] rounded w-2/3" />
        <div className="h-3 bg-[#E5E7EB] rounded w-1/3" />
      </div>
      <div className="h-3 bg-[#E5E7EB] rounded w-12" />
    </div>
  );
}

function PassIcon() {
  return (
    <svg
      className="w-5 h-5 text-[#16A34A] flex-shrink-0"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FailIcon() {
  return (
    <svg
      className="w-5 h-5 text-[#DC2626] flex-shrink-0"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function RunnerErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 px-4 py-3 mb-0 bg-[#FEF2F2] border border-[#DC2626] rounded-t-[8px] text-[#DC2626]"
    >
      <svg
        className="w-4 h-4 mt-0.5 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-sm font-medium leading-snug">
        Runner error: {message}
      </span>
    </div>
  );
}

function SummaryBar({
  passCount,
  failCount,
  total,
}: {
  passCount: number;
  failCount: number;
  total: number;
}) {
  const allPass = failCount === 0 && total > 0;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
      <span className="text-sm font-medium text-[#111827]">
        {total} test{total !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1 text-sm font-medium ${
            allPass ? "text-[#16A34A]" : "text-[#4B5563]"
          }`}
        >
          <PassIcon />
          {passCount} passed
        </span>
        {failCount > 0 && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[#DC2626]">
            <FailIcon />
            {failCount} failed
          </span>
        )}
      </div>
    </div>
  );
}

function TestResultRow({ result }: { result: TestResult }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-[#E5E7EB] last:border-b-0 transition-colors duration-[150ms] ease-in-out hover:bg-[#F9FAFB] ${
        !result.passed ? "bg-[#FFF7F7]" : ""
      }`}
    >
      <div className="mt-0.5">
        {result.passed ? <PassIcon /> : <FailIcon />}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            result.passed ? "text-[#111827]" : "text-[#DC2626]"
          }`}
          title={result.name}
        >
          {result.name}
        </p>
        {!result.passed && result.errorMessage && (
          <p className="mt-0.5 text-xs text-[#DC2626] leading-snug break-words">
            {result.errorMessage}
          </p>
        )}
      </div>
      {result.duration !== undefined && (
        <span className="flex-shrink-0 text-xs text-[#4B5563] tabular-nums mt-0.5">
          {result.duration}ms
        </span>
      )}
    </div>
  );
}

export default function TestResultsList({
  results,
  passCount,
  failCount,
  isLoading,
  onRunSuite,
  runnerError,
}: TestResultsListProps) {
  const total = results.length;
  const hasFailures = fail