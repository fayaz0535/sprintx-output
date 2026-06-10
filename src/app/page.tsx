```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hello World - SprintX',
}

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-white">
      <h1 
        className="text-base font-normal text-center text-[#1F2937]"
        role="status"
        aria-live="polite"
      >
        Hello World
      </h1>
    </main>
  )
}
```