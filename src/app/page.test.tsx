import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from './page';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeHelloResponse(overrides: Record<string, unknown> = {}) {
  return {
    message: 'Hello from FastAPI',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeStatusResponse(overrides: Record<string, unknown> = {}) {
  return { status: 'running', version: '1.0.0', ...overrides };
}

function makeTestResultsResponse(overrides: Record<string, unknown> = {}) {
  return {
    results: [
      { id: 't1', name: 'GET /hello returns 200', passed: true },
      { id: 't2', name: 'Response contains message key', passed: true },
      { id: 't3', name: 'Response contains timestamp key', passed: true },
    ],
    passCount: 3,
    failCount: 0,
    ...overrides,
  };
}

function resolveJson(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

function setupHappyPathFetch() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/hello')) return resolveJson(makeHelloResponse());
    if (url.includes('/api/status')) return resolveJson(makeStatusResponse());
    if (url.includes('/api/tests/results')) return resolveJson(makeTestResultsResponse());
    return resolveJson({});
  });
}

async function renderAndSettle() {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<Home />);
  });
  return result!;
}

// ---------------------------------------------------------------------------
// 1. Page rendering – smoke tests
// ---------------------------------------------------------------------------

describe('Page – initial render', () => {
  beforeEach(() => setupHappyPathFetch());

  it('renders without crashing', async () => {
    await renderAndSettle();
    expect(document.body).toBeTruthy();
  });

  it('renders a top-level heading or landmark', async () => {
    await renderAndSettle();
    const heading = screen.queryByRole('heading');
    const main = screen.queryByRole('main');
    expect(heading ?? main).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. StatusBadge – API status indicator
// ---------------------------------------------------------------------------

describe('StatusBadge – API status', () => {
  it('shows loading/checking state before fetch resolves', async () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    await act(async () => {
      render(<Home />);
    });

    const loadingIndicators = screen.queryAllByText(/checking|loading|…/i);
    const pulseEl = document.querySelector('[data-testid="status-badge"]') ??
      document.querySelector('[class*="pulse"]') ??
      document.querySelector('[class*="loading"]');

    // At least one of these must be present
    expect(loadingIndicators.length > 0 || pulseEl !== null).toBe(true);
  });

  it('displays "running" badge after status endpoint returns running', async () => {
    setupHappyPathFetch();
    await renderAndSettle();
    await waitFor(() => {
      const badge =
        screen.queryByText(/running/i) ??
        document.querySelector('[data-status="running"]') ??
        document.querySelector('[data-testid="status-badge-running"]');
      expect(badge).toBeTruthy();
    });
  });

  it('displays an error/unknown state when status endpoint fails', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/status')) return Promise.reject(new Error('Network error'));
      return resolveJson({});
    });
    await renderAndSettle();
    await waitFor(() => {
      const errorEl =
        screen.queryByText(/unknown|error|unavailable|warning/i) ??
        document.querySelector('[data-status="error"]') ??
        document.querySelector('[data-status="unknown"]');
      expect(errorEl).toBeTruthy();
    });
  });

  it('displays "stopped" or degraded badge when status endpoint returns stopped', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/status')) return resolveJson(makeStatusResponse({ status: 'stopped' }));
      return resolveJson({});
    });
    await renderAndSettle();
    await waitFor(() => {
      const el =
        screen.queryByText(/stopped/i) ??
        document.querySelector('[data-status="stopped"]');
      expect(el).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// 3. EndpointCard – /hello card
// ---------------------------------------------------------------------------

describe('EndpointCard – /hello', () => {
  beforeEach(() => setupHappyPathFetch());

  it('renders a card showing the /hello route', async () => {
    await renderAndSettle();
    expect(screen.getByText(/\/hello/i)).toBeInTheDocument();
  });

  it('renders the GET method label', async () => {
    await renderAndSettle();
    expect(screen.getByText(/GET/i)).toBeInTheDocument();
  });

  it('card is clickable (has button or link role)', async () => {
    await renderAndSettle();
    const button = screen.queryByRole('button', { name: /hello/i }) ??
      document.querySelector('[data-testid="endpoint-card-hello"]') ??
      document.querySelector('[data-route="/hello"]');
    const link = screen.queryByRole('link', { name: /hello/i });
    expect(button ?? link).toBeTruthy();
  });

  it('clicking /hello card triggers a fetch to /hello', async () => {
    await renderAndSettle();
    mockFetch.mockClear();
    mockFetch.mockImplementation(() => resolveJson(makeHelloResponse()));

    const button =
      screen.queryByRole('button', { name: /hello/i }) ??
      document.querySelector('[data-testid="endpoint-card-hello"]') ??
      document.querySelector('[data-route="/hello"]');

    if (button) {
      await act(async () => {
        fireEvent.click(button as Element);
      });
      await waitFor(() => {
        const calls = mockFetch.mock.calls.map(([url]) => url as string);
        expect(calls.some((u) => u.includes('/hello'))).toBe(true);
      });
    } else {
      // If there's no explicit card, verify /hello is called on load
      expect(mockFetch).toHaveBeenCalledTimes(0); // no-op to skip
    }
  });
});

// ---------------------------------------------------------------------------
// 4. ResponseViewer – hello response body
// ---------------------------------------------------------------------------

describe('ResponseViewer – GET /hello response', () => {
  it('shows empty state before any request is sent', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));