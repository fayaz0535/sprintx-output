import React from 'react';

type StatusVariant = 'running' | 'stopped' | 'loading' | 'unknown';
type BadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  size?: BadgeSize;
}

const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
      clipRule="evenodd"
    />
  </svg>
);

const RunningDot: React.FC<{ className?: string }> = ({ className }) => (
  <span className={`relative flex ${className}`}>
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
    <span className="relative inline-flex rounded-full bg-green-500 h-full w-full" />
  </span>
);

const resolveVariant = (status: string): StatusVariant => {
  const normalised = status.toLowerCase().trim();
  if (['running', 'stopped', 'loading', 'unknown'].includes(normalised)) {
    return normalised as StatusVariant;
  }
  return 'unknown';
};

const variantConfig: Record<
  StatusVariant,
  {
    containerClass: string;
    textClass: string;
    defaultLabel: string;
    icon: React.ReactNode;
  }
> = {
  running: {
    containerClass: 'bg-green-50 border border-green-200 text-green-800',
    textClass: 'text-green-800',
    defaultLabel: 'Running',
    icon: null,
  },
  stopped: {
    containerClass: 'bg-red-50 border border-red-200 text-red-800',
    textClass: 'text-red-800',
    defaultLabel: 'Stopped',
    icon: (
      <span
        className="inline-block rounded-full bg-red-500 flex-shrink-0"
        aria-hidden="true"
      />
    ),
  },
  loading: {
    containerClass: 'bg-indigo-50 border border-indigo-200 text-indigo-700',
    textClass: 'text-indigo-700',
    defaultLabel: 'Checking...',
    icon: null,
  },
  unknown: {
    containerClass: 'bg-neutral-100 border border-neutral-300 text-neutral-600',
    textClass: 'text-neutral-600',
    defaultLabel: 'Unknown',
    icon: null,
  },
};

const sizeConfig: Record<
  BadgeSize,
  {
    containerClass: string;
    textClass: string;
    dotSize: string;
    iconSize: string;
    skeletonWidth: string;
  }
> = {
  sm: {
    containerClass: 'px-2 py-0.5 gap-1',
    textClass: 'text-xs font-medium',
    dotSize: 'h-1.5 w-1.5',
    iconSize: 'h-3 w-3',
    skeletonWidth: 'w-16',
  },
  md: {
    containerClass: 'px-3 py-1 gap-1.5',
    textClass: 'text-sm font-medium',
    dotSize: 'h-2 w-2',
    iconSize: 'h-3.5 w-3.5',
    skeletonWidth: 'w-16',
  },
  lg: {
    containerClass: 'px-4 py-1.5 gap-2',
    textClass: 'text-base font-medium',
    dotSize: 'h-2.5 w-2.5',
    iconSize: 'h-4 w-4',
    skeletonWidth: 'w-20',
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
}) => {
  const variant = resolveVariant(status ?? '');
  const sz = sizeConfig[size];
  const cfg = variantConfig[variant];

  // Loading state — skeleton pill
  if (variant === 'loading') {
    return (
      <span
        role="status"
        aria-label="Checking status"
        className={`
          inline-flex items-center rounded-full
          ${cfg.containerClass}
          ${sz.containerClass}
          ${sz.skeletonWidth}
          animate-pulse overflow-hidden
        `}
      >
        <span
          className={`
            inline-block rounded-full bg-indigo-300 flex-shrink-0
            ${sz.dotSize}
          `}
          aria-hidden="true"
        />
        <span
          className={`
            block bg-indigo-200 rounded-full h-2 flex-1
          `}
          aria-hidden="true"
        />
      </span>
    );
  }

  const displayLabel = label ?? cfg.defaultLabel;

  const renderDotOrIcon = () => {
    if (variant === 'running') {
      return <RunningDot className={sz.dotSize} />;
    }
    if (variant === 'unknown') {
      return (
        <WarningIcon
          className={`${sz.iconSize} text-neutral-500 flex-shrink-0`}
        />
      );
    }
    if (variant === 'stopped') {
      return (
        <span
          className={`inline-block rounded-full bg-red-500 flex-shrink-0 ${sz.dotSize}`}
          aria-hidden="true"
        />
      );
    }
    return null;
  };

  return (
    <span
      role="status"
      aria-label={`Status: ${displayLabel}`}
      className={`
        inline-flex items-center rounded-full
        ${cfg.containerClass}
        ${sz.containerClass}
        font-[Inter,system-ui,sans-serif]
        transition-all duration-150 ease-in-out
      `}
    >
      {renderDotOrIcon()}
      <span className={`${sz.textClass} ${cfg.textClass} leading-none`}>
        {displayLabel}
      </span>
    </span>
  );
};

export default StatusBadge;
export type { StatusBadgeProps, StatusVariant, BadgeSize };