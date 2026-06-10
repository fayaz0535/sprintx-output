```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const api = {
  health: {
    check: async (): Promise<{ status: string; timestamp: string }> => {
      const response = await apiClient.get('/api/health');
      return response.data;
    },
  },
};

export default api;
```