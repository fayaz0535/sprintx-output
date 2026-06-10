```typescript
import React from 'react';

interface HelloWorldTextProps {
  text?: string;
}

const HelloWorldText: React.FC<HelloWorldTextProps> = ({ text = 'Hello World' }) => {
  return (
    <div
      className="text-center text-base font-normal"
      style={{ color: '#1F2937' }}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  );
};

export default HelloWorldText;
```