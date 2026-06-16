import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    let apiStatus: 'running' | 'stopped' = 'stopped'
    let apiResponseTimeMs: number | null = null
    let apiVersion: string | null = null

    try {
      const start = Date.now()
      const res = await fetch(`${backendUrl}/hello`, {
        signal: controller.signal,
        cache: 'no-store',
      })
      apiResponseTimeMs = Date.now() - start

      if (res.ok) {
        apiStatus = 'running'
        const data = (await res.json()) as { message?: string; version?: string }
        apiVersion = data.version ?? null
      }
    } catch {
      apiStatus = 'stopped'
    } finally {
      clearTimeout(timeoutId)
    }

    let dbStatus: 'running' | 'stopped' = 'stopped'
    try {
      const dbCheckUrl = `${backendUrl}/api/health/db`
      const dbController = new AbortController()
      const dbTimeout = setTimeout(() => dbController.abort(), 5000)

      try {
        const dbRes = await fetch(dbCheckUrl, {
          signal: dbController.signal,
          cache: 'no-store',
        })
        if (dbRes.ok) {
          dbStatus = 'running'
        }
      } finally {
        clearTimeout(dbTimeout)
      }
    } catch {
      dbStatus = 'stopped'
    }

    const overallStatus =
      apiStatus === 'running' ? 'running' : 'stopped'

    return NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: {
          api: {
            status: apiStatus,
            url: backendUrl,
            responseTimeMs: apiResponseTimeMs,
            version: apiVersion,
          },
          database: {
            status: dbStatus,
          },
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    return NextResponse.json(
      {
        status: 'stopped',
        timestamp: new Date().toISOString(),
        error: message,
        services: {
          api: { status: 'stopped', url: null, responseTimeMs: null, version: null },
          database: { status: 'stopped' },
        },
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    )
  }
}