```typescript
import React from 'react';

interface GreetingTextProps {
  text: string;
}

const GreetingText: React.FC<GreetingTextProps> = ({ text }) => {
  return (
    <h1
      className="text-[2rem] md:text-[3rem] lg:text-[4rem] font-semibold leading-[1.2] text-[#0A0A0A]"
      aria-level={1}
      role="heading"
    >
      {text}
    </h1>
  );
};

export default GreetingText;
```