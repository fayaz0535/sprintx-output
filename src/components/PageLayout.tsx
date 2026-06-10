```typescript
import React from 'react';
import Head from 'next/head';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function PageLayout({ title, children }: PageLayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>
      <html lang="en">
        <body className="bg-white">
          {children}
        </body>
      </html>
    </>
  );
}
```