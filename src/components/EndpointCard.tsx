import React from 'react';

type EndpointMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type EndpointVariant = 'default' | 'active' | 'disabled';

interface EndpointCardProps {
  method: EndpointMethod;
  route: string;
  description?: string;
  variant?: EndpointVariant;
  onClick?: () => void;
}

const METHOD_STYLES: Record<EndpointMethod, string> = {
  GET: 'bg-indigo-100 text-indigo-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
};

const MethodBadge: React.FC<{ method: EndpointMethod }> = ({ method }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wide uppercase select-none ${METHOD_STYLES[method]}`}
    style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px', letterSpacing: '0.05em' }}
  >
    {method}
  </span>
);

const DisabledTooltip: React.FC = () => (
  <span
    role="tooltip"
    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 px-2 py-1 rounded text-xs text-white bg-gray-700 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
    style={{ fontSize: '12px', borderRadius: '4px' }}
  >
    This endpoint is currently unavailable
    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
  </span>
);

export const EndpointCard: React.FC<EndpointCardProps> = ({
  method,
  route,
  description,
  variant = 'default',
  onClick,
}) => {
  const isDisabled = variant === 'disabled';
  const isActive = variant === 'active';

  const containerBase = [
    'relative group flex flex-col gap-1 w-full rounded-lg border px-4 py-3 transition-all',
    'focus:outline-none',
  ].join(' ');

  const variantStyles = isDisabled
    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
    : isActive
    ? 'border-indigo-500 bg-indigo-50 shadow-md cursor-pointer ring-2 ring-indigo-200'
    : 'border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-indigo-300 cursor-pointer';

  const focusStyle = !isDisabled
    ? 'focus-visible:ring-[3px] focus-visible:ring-indigo-400/40 focus-visible:ring-offset-0'
    : '';

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role={isDisabled ? 'article' : 'button'}
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      aria-label={`${method} ${route}${description ? ` - ${description}` : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`${containerBase} ${variantStyles} ${focusStyle}`}
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        minHeight: '72px',
        transition: '150ms ease-in-out',
        borderRadius: '8px',
      }}
    >
      {isDisabled && <DisabledTooltip />}

      <div className="flex items-center gap-2">
        <MethodBadge method={method} />
        <span
          className={`font-medium text-sm truncate ${
            isDisabled ? 'text-gray-400' : isActive ? 'text-indigo-900' : 'text-gray-900'
          }`}
          style={{ fontWeight: 500, fontSize: '14px' }}
        >
          {route}
        </span>
        {isActive && (
          <span className="ml-auto flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500" aria-hidden="true" />
        )}
      </div>

      {description && (
        <p
          className={`text-sm leading-snug line-clamp-2 ${
            isDisabled ? 'text-gray-400' : 'text-gray-500'
          }`}
          style={{ fontSize: '13px', fontWeight: 400, lineHeight: '1.4', color: isDisabled ? '#9CA3AF' : '#4B5563' }}
        >
          {description}
        </p>
      )}
    </div>
  );
};

export const EndpointCardSkeleton: React.FC = () => (
  <div
    className="w-full rounded-lg border border-gray-200 bg-gray-50 animate-pulse"
    style={{ height: '72px', borderRadius: '8px' }}
    aria-busy="true"
    aria-label="Loading endpoint"
  >
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="h-4 w-10 rounded bg-gray-200" />
        <div className="h-4 w-40 rounded bg-gray-200" />
      </div>
      <div className="h-3 w-3/4 rounded bg-gray-200" />
    </div>
  </div>
);

export const EndpointCardEmptyState: React.FC = () => (
  <div
    className="flex flex-col items-center justify-center w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 px-4 text-center"
    style={{ borderRadius: '8px', fontFamily: 'Inter, system-ui, sans-serif' }}
    role="status"
    aria-label="No endpoints registered"
  >
    <svg
      className="mb-2 text-gray-400"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
    </svg>
    <p className="text-sm font-medium text-gray-500" style={{ fontSize: '14px', fontWeight: 500 }}>
      No endpoints registered yet
    </p>
    <p className="mt-1 text-xs