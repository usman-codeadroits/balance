# API Directory

This directory contains all API-related code for the BalanceApp project. The structure is organized to be scalable and maintainable as more APIs are added.

## Structure

```
api/
├── config.ts              # API configuration (base URL, endpoints, headers)
├── types.ts               # TypeScript type definitions for API requests/responses
├── client.ts              # Base API client with common functionality
├── services/              # API service modules (one per feature/domain)
│   └── subscriptionPlans.ts
├── index.ts               # Central export point
└── README.md              # This file
```

## Usage

### Importing API Services

```typescript
import { getSubscriptionPlans, type MealPlan } from '@/api';
```

### Adding a New API Service

1. Create a new service file in `api/services/` (e.g., `api/services/users.ts`)
2. Import the `apiClient` from `@/api/client`
3. Use the appropriate HTTP method (get, post, put, delete)
4. Export your functions from the service file
5. Add exports to `api/index.ts`

Example:

```typescript
// api/services/users.ts
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

export const getUsers = async () => {
  return await apiClient.get(API_ENDPOINTS.USERS);
};
```

### Configuration

Update `api/config.ts` to:
- Change the base URL
- Add new endpoints to `API_ENDPOINTS`
- Modify default headers or timeout

### Authentication

To add authentication, uncomment and modify the `getHeaders` method in `api/client.ts`:

```typescript
private async getHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('authToken');
  
  return {
    ...this.defaultHeaders,
    ...customHeaders,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}
```

## Features

- ✅ Centralized configuration
- ✅ Type-safe API calls
- ✅ Error handling
- ✅ Request timeout handling
- ✅ Easy to extend with new services
- ✅ Ready for authentication integration

