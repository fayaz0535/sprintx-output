const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface HelloResponse {
  message: string;
  timestamp: string;
}

export interface ApiError {
  status: number | null;
  message: string;
}

export type HelloResult =
  | { ok: true; data: HelloResponse; status: number; contentType: string }
  | { ok: false; error: ApiError; status: number | null; contentType: string };

export async function getHello(): Promise<HelloResult> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/hello`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
  } catch (networkError) {
    return {
      ok: false,
      error: {
        status: null,
        message:
          networkError instanceof Error
            ? networkError.message
            : "Network request failed",
      },
      status: null,
      contentType: "",
    };
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.detail === "string") {
        errorMessage = errorBody.detail;
      } else if (typeof errorBody?.message === "string") {
        errorMessage = errorBody.message;
      }
    } catch {
      // ignore parse errors on error responses
    }

    return {
      ok: false,
      error: {
        status: response.status,
        message: errorMessage,
      },
      status: response.status,
      contentType,
    };
  }

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    return {
      ok: false,
      error: {
        status: response.status,
        message: "Response body could not be parsed as JSON",
      },
      status: response.status,
      contentType,
    };
  }

  if (!isHelloResponse(data)) {
    return {
      ok: false,
      error: {
        status: response.status,
        message:
          "Response payload is missing required fields: message, timestamp",
      },
      status: response.status,
      contentType,
    };
  }

  if (!isValidIso8601(data.timestamp)) {
    return {
      ok: false,
      error: {
        status: response.status,
        message: `Invalid timestamp format received: "${data.timestamp}"`,
      },
      status: response.status,
      contentType,
    };
  }

  return {
    ok: true,
    data,
    status: response.status,
    contentType,
  };
}

function isHelloResponse(value: unknown): value is HelloResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    "timestamp" in value &&
    typeof (value as Record<string, unknown>).message === "string" &&
    (value as Record<string, unknown>).message !== "" &&
    typeof (value as Record<string, unknown>).timestamp === "string"
  );
}

function isValidIso8601(value: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes("T");
}

export function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "long",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}