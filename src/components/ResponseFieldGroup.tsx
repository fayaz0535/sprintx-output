import React from "react";

interface ResponseFieldGroupProps {
  message?: string | null;
  timestamp?: string | null;
  formattedTimestamp?: string | null;
  variant?: "populated" | "empty" | "error";
  isLoading?: boolean;
}

const DASH = "—";

function SkeletonRow() {
  return (
    <div
      className="h-4 w-full rounded animate-pulse bg-gray-200"
      aria-hidden="true"
    />
  );
}

function FieldRow({
  label,
  value,
  isMissing,
  mono = false,
  ariaLabel,
}: {
  label: string;
  value?: string | null;
  isMissing?: boolean;
  mono?: boolean;
  ariaLabel?: string;
}) {
  const displayValue = value && value.trim() !== "" ? value : null;

  return (
    <div className="flex flex-col gap-1 py-3 border-b border-[#E5E7EB] last:border-b-0">
      <dt
        className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {label}
      </dt>
      <dd
        className={[
          "text-sm break-all",
          displayValue
            ? "text-[#111827]"
            : "text-[#6B7280]",
          mono ? "font-mono" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          fontFamily: mono
            ? "JetBrains Mono, monospace"
            : "Inter, system-ui, sans-serif",
        }}
        aria-label={
          isMissing && ariaLabel ? ariaLabel : undefined
        }
      >
        {displayValue ?? DASH}
      </dd>
    </div>
  );
}

export default function ResponseFieldGroup({
  message,
  timestamp,
  formattedTimestamp,
  variant = "empty",
  isLoading = false,
}: ResponseFieldGroupProps) {
  if (isLoading) {
    return (
      <section
        aria-label="Response fields loading"
        aria-busy="true"
        className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] shadow-sm p-4 flex flex-col gap-4"
      >
        <SkeletonRow />
        <SkeletonRow />
      </section>
    );
  }

  const isError = variant === "error";
  const isEmpty = variant === "empty";

  return (
    <section
      aria-label="API response fields"
      className={[
        "rounded-lg border bg-[#F9FAFB] shadow-sm px-4 py-2",
        isError ? "border-[#DC2626]" : "border-[#E5E7EB]",
      ].join(" ")}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
    >
      <dl className="divide-y divide-[#E5E7EB]">
        <FieldRow
          label="Message"
          value={isEmpty ? null : message}
          isMissing={isError && (!message || message.trim() === "")}
          ariaLabel="message missing"
        />
        <FieldRow
          label="Timestamp (ISO 8601)"
          value={isEmpty ? null : timestamp}
          isMissing={isError && (!timestamp || timestamp.trim() === "")}
          mono
          ariaLabel="timestamp missing"
        />
        <FieldRow
          label="Timestamp (Formatted)"
          value={isEmpty ? null : formattedTimestamp}
          isMissing={
            isError &&
            (!formattedTimestamp || formattedTimestamp.trim() === "")
          }
          ariaLabel="formatted timestamp missing"
        />
      </dl>
    </section>
  );
}