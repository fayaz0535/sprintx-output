```typescript
import React from 'react';

interface CenteredLayoutProps {
  children: React.ReactNode;
}

const CenteredLayout: React.FC<CenteredLayoutProps> = ({ children }) => {
  return (
    <main
      role="main"
      className="flex min-h-screen items-center justify-center bg-white px-4 sm:px-8 lg:px-12"
    >
      {children}
    </main>
  );
};

export default CenteredLayout;
```