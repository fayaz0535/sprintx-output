```typescript
import React from 'react';

interface MainContainerProps {
  children: React.ReactNode;
}

const MainContainer: React.FC<MainContainerProps> = ({ children }) => {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      {children}
    </main>
  );
};

export default MainContainer;
```