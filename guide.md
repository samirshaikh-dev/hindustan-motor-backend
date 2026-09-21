# Hindustan Electricals Winding Works — React Native (Expo) Implementation Guide

A production-grade, implementation-focused engineering guide for building the **Hindustan Electricals Winding Works** mobile application using **React Native + Expo (TypeScript)**, fully integrated with the backend REST API.

---

## Table of Contents
1. [Architecture & Overview](#1-architecture--overview)
2. [Project Setup & Environment Configuration](#2-project-setup--environment-configuration)
3. [TypeScript Domain Models & API Contracts](#3-typescript-domain-models--api-contracts)
4. [Storage, Authentication & Token Refresh Flow](#4-storage-authentication--token-refresh-flow)
5. [API Client & Network Integration Layer](#5-api-client--network-integration-layer)
6. [State Management (TanStack Query + Zustand)](#6-state-management-tanstack-query--zustand)
7. [Screens, Navigation Hierarchy & UI States](#7-screens-navigation-hierarchy--ui-states)
8. [Comprehensive Screen-to-API Mapping](#8-comprehensive-screen-to-api-mapping)
9. [Feature Modules & Service Implementations](#9-feature-modules--service-implementations)
10. [Media & Image Uploads (Cloudinary Integration)](#10-media--image-uploads-cloudinary-integration)
11. [Security, Offline Handling & Production Hardening](#11-security-offline-handling--production-hardening)
12. [Step-by-Step Development Roadmap](#12-step-by-step-development-roadmap)

---

## 1. Architecture & Overview

### 1.1 Mobile Application Purpose
The mobile application serves workshop technicians and the workshop owner (Admin) on the shop floor. It facilitates:
- Rapid registration of incoming motors with customer details and complaints.
- Real-time job order status progression (`RECEIVED` → `IN_PROGRESS` → `TESTING` → `READY_FOR_DELIVERY` → `DELIVERED`).
- Task creation, owner-restricted task assignment, and technician task completion.
- Direct shop-floor photo capture of damaged motor components and uploaded via Cloudinary.
- Complete chronological audit history timeline inspection.

### 1.2 Dual Actor & Authentication Paradigm
The backend supports two complementary identification paradigms:
1. **Admin / Workshop Owner JWT Session (`Authorization: Bearer <accessToken>`)**:
   - Dedicated login via `/api/v1/auth/login` with email and password.
   - Issues short-lived access token (15 mins) and refresh token (7 days).
   - Required for privileged actions such as **Task Assignment / Reassignment (`OWNER` only)**.
2. **Actor Header (`X-Employee-Id: <employee_id>`)**:
   - Required on all `/api/v1/*` domain endpoints if not authenticated as Admin.
   - Identifies the technician creating jobs, updating task status, or taking photos.
   - When Admin JWT is provided, the backend automatically sets actor as `OWNER`.
   - The app enables seamless **Profile Switching** where technicians can select their active employee identity or the Owner can work under an admin token.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Native Mobile App                         │
├───────────────────────────────────┬────────────────────────────────────┤
│   Technician / Floor Operations   │     Admin / Workshop Management    │
│   (Identified by X-Employee-Id)   │    (Bearer JWT + Refresh Token)    │
└─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                  │                                    │
                  ▼                                    ▼
       ┌──────────────────────────────────────────────────────┐
       │   Axios Interceptor Layer (Token + Actor Injection)  │
       └──────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
       ┌──────────────────────────────────────────────────────┐
       │   Hindustan Motor Express Backend API (/api/v1)      │
       └──────────────────────────────────────────────────────┘
```

---

## 2. Project Setup & Environment Configuration

### 2.1 Technology Stack
- **Framework**: Expo SDK 51+ (Managed Workflow)
- **Routing**: Expo Router v3 (File-based routing) or React Navigation v6 Native Stack
- **Language**: TypeScript (Strict Mode)
- **HTTP Client**: Axios with interceptors + mutex for token refresh
- **Server State & Caching**: TanStack React Query (`@tanstack/react-query` v5)
- **Client State**: Zustand (`zustand` v4)
- **Forms & Validation**: React Hook Form (`react-hook-form`) + Zod (`zod`)
- **Secure Storage**: `expo-secure-store`
- **Camera & Gallery**: `expo-image-picker` & `expo-image-manipulator`
- **Network State**: `@react-native-community/netinfo`

### 2.2 Initialize Project
Run in your mobile development workspace:

```bash
# Initialize Expo project with TypeScript template
npx create-expo-app@latest hindustan-motor-mobile --template blank-typescript
cd hindustan-motor-mobile

# Core dependencies
npx expo install expo-router expo-constants expo-linking expo-status-bar react-native-safe-area-context react-native-screens
npx expo install expo-secure-store expo-image-picker expo-image-manipulator expo-network expo-haptics
npx expo install @react-native-community/netinfo

# State, Networking, Forms & Utilities
npm install axios @tanstack/react-query zustand zod react-hook-form @hookform/resolvers date-fns
```

### 2.3 Recommended Folder Structure
```text
hindustan-motor-mobile/
├── app/                          # Expo Router file-based screens
│   ├── _layout.tsx               # Root layout: Providers, QueryClient, AuthGate
│   ├── (auth)/                   # Authentication route group
│   │   ├── _layout.tsx
│   │   ├── login.tsx             # Admin email/password login
│   │   └── select-actor.tsx      # Technician quick profile selector
│   ├── (app)/                    # Authenticated workspace route group
│   │   ├── _layout.tsx           # Tab bar / Drawer navigation
│   │   ├── index.tsx             # Dashboard / Overview
│   │   ├── motors/               # Motor management stack
│   │   │   ├── index.tsx         # Motors list with search & filter
│   │   │   ├── register.tsx      # Register new motor form
│   │   │   ├── [id]/             # Motor detail & actions
│   │   │   │   ├── index.tsx     # Motor detail + job list + specs
│   │   │   │   ├── edit.tsx      # Edit motor details
│   │   │   │   ├── upload.tsx    # Capture & upload motor photo
│   │   │   │   └── history.tsx   # Motor chronological history timeline
│   │   ├── jobs/                 # Job management stack
│   │   │   ├── index.tsx         # Job cards filtered by status
│   │   │   └── [id]/
│   │   │       ├── index.tsx     # Job detail + state transition controls
│   │   │       ├── add-task.tsx  # Create task under job
│   │   │       └── history.tsx   # Job audit history
│   │   ├── tasks/                # Technician workbench stack
│   │   │   ├── index.tsx         # Tasks list (Assigned to me / All)
│   │   │   └── [id].tsx          # Task detail & status transition
│   │   ├── employees/            # Team & shop floor roster (Admin/Owner)
│   │   │   ├── index.tsx         # Employee status dashboard
│   │   │   ├── create.tsx        # Add new employee
│   │   │   └── [id].tsx          # Employee tasks & details
│   │   └── settings/             # App & connection configuration
│   │       └── index.tsx
│   └── +not-found.tsx
├── src/
│   ├── api/                      # Networking & Axios setup
│   │   ├── client.ts             # Axios instance + interceptors
│   │   ├── endpoints.ts          # API route constants
│   │   └── errors.ts             # Normalized error parser
│   ├── components/               # Reusable UI components
│   │   ├── common/               # Button, Input, Badge, Card, Spinner, EmptyState
│   │   ├── feedback/             # ErrorBanner, StatusToast, ConfirmDialog
│   │   ├── layout/               # ScreenWrapper, Header, StickyBottomCTA
│   │   └── domain/               # StatusBadge, JobCard, TaskRow, TimelineItem
│   ├── config/                   # Constants and environment
│   │   └── env.ts
│   ├── hooks/                    # Custom query and mutation hooks
│   │   ├── useAuth.ts
│   │   ├── useMotors.ts
│   │   ├── useJobs.ts
│   │   ├── useTasks.ts
│   │   ├── useEmployees.ts
│   │   └── useNetworkStatus.ts
│   ├── services/                 # API service layer
│   │   ├── auth.service.ts
│   │   ├── motor.service.ts
│   │   ├── job.service.ts
│   │   ├── task.service.ts
│   │   ├── employee.service.ts
│   │   ├── media.service.ts
│   │   └── storage.service.ts    # SecureStore wrapper
│   ├── store/                    # Zustand stores
│   │   ├── useAuthStore.ts       # Auth tokens, admin profile, active actor
│   │   └── useUIStore.ts         # Modals, snackbars, active filters
│   ├── types/                    # Strict TypeScript interfaces
│   │   ├── api.ts                # Generic envelopes & pagination
│   │   ├── auth.ts
│   │   ├── domain.ts             # Motor, Job, Task, Employee, History
│   │   └── forms.ts
│   └── utils/                    # Formatters, date utils, image helpers
│       ├── formatters.ts
│       └── imagePicker.ts
├── app.json
├── package.json
└── tsconfig.json
```

### 2.4 Environment Configuration (`src/config/env.ts`)
Mobile devices cannot resolve `localhost` directly to your development workstation:
- **Android Emulator**: uses `http://10.0.2.2:5000/api/v1`
- **iOS Simulator**: uses `http://localhost:5000/api/v1`
- **Physical Device (Expo Go)**: uses your computer's local Wi-Fi IP (e.g., `http://192.168.1.15:5000/api/v1`)

Create `src/config/env.ts`:
```typescript
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevApiUrl = (): string => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:5000/api/v1`;
  }
  return Platform.OS === 'android' 
    ? 'http://10.0.2.2:5000/api/v1' 
    : 'http://localhost:5000/api/v1';
};

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || getDevApiUrl(),
  TIMEOUT_MS: 15000,
  APP_VERSION: '1.0.0',
  CONTACT_PHONE: '+919825272547',
  WHATSAPP_URL: 'https://wa.me/919825272547',
};
```

---

## 3. TypeScript Domain Models & API Contracts

Create `src/types/domain.ts` and `src/types/api.ts` to strictly mirror the backend database schema and response envelopes.

### 3.1 Domain Enums & Core Types (`src/types/domain.ts`)
```typescript
export type Role = 'OWNER' | 'EMPLOYEE';

export type JobStatus =
  | 'RECEIVED'
  | 'IN_PROGRESS'
  | 'TESTING'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type TaskStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type HistoryAction =
  | 'MOTOR_REGISTERED'
  | 'JOB_CREATED'
  | 'MOTOR_UPDATED'
  | 'JOB_UPDATED'
  | 'JOB_STATUS_CHANGED'
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_STATUS_CHANGED'
  | 'MOTOR_IMAGE_UPLOADED';

export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MotorImage {
  id: string;
  motorId: string;
  publicId: string;
  secureUrl: string;
  resourceType: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  createdAt: string;
}

export interface Motor {
  id: string;
  motorNumber: string;
  customerName: string;
  customerPhone: string;
  brand?: string | null;
  motorType?: string | null;
  power?: number | null;
  powerUnit: string;
  rpm?: number | null;
  phase?: string | null;
  serialNumber?: string | null;
  complaint?: string | null;
  notes?: string | null;
  receivedAt: string;
  expectedDeliveryAt?: string | null;
  createdAt: string;
  updatedAt: string;
  images?: MotorImage[];
  jobs?: Job[];
}

export interface Job {
  id: string;
  jobNumber: string;
  motorId: string;
  status: JobStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  motor?: Motor;
  tasks?: Task[];
  _count?: {
    tasks: number;
  };
}

export interface Task {
  id: string;
  jobId: string;
  title: string;
  description?: string | null;
  assignedEmployeeId?: string | null;
  status: TaskStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedEmployee?: Employee | null;
  job?: {
    id: string;
    jobNumber: string;
    status: JobStatus;
    motor?: {
      id: string;
      motorNumber: string;
      customerName: string;
      customerPhone?: string;
      brand?: string;
    };
  };
}

export interface HistoryItem {
  id: string;
  motorId?: string | null;
  jobId?: string | null;
  taskId?: string | null;
  actorEmployeeId: string;
  action: HistoryAction;
  description?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  actorEmployee?: {
    id: string;
    name: string;
    role: Role;
  };
}
```

### 3.2 API Request/Response Envelopes (`src/types/api.ts`)
```typescript
export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  data: Array<{ field: string; message: string }> | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}
```

---

## 4. Storage, Authentication & Token Refresh Flow

### 4.1 Secure Storage Service (`src/services/storage.service.ts`)
We use `expo-secure-store` to keep sensitive credentials encrypted on iOS Keychain and Android Keystore.

```typescript
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'hww_access_token';
const REFRESH_TOKEN_KEY = 'hww_refresh_token';
const ACTOR_ID_KEY = 'hww_actor_id';
const ACTOR_NAME_KEY = 'hww_actor_name';
const ACTOR_ROLE_KEY = 'hww_actor_role';

export const storageService = {
  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },

  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async setActiveActor(id: string, name: string, role: string): Promise<void> {
    await SecureStore.setItemAsync(ACTOR_ID_KEY, id);
    await SecureStore.setItemAsync(ACTOR_NAME_KEY, name);
    await SecureStore.setItemAsync(ACTOR_ROLE_KEY, role);
  },

  async getActiveActor(): Promise<{ id: string; name: string; role: string } | null> {
    const id = await SecureStore.getItemAsync(ACTOR_ID_KEY);
    if (!id) return null;
    const name = (await SecureStore.getItemAsync(ACTOR_NAME_KEY)) || 'Technician';
    const role = (await SecureStore.getItemAsync(ACTOR_ROLE_KEY)) || 'EMPLOYEE';
    return { id, name, role };
  },

  async clearAll(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(ACTOR_ID_KEY);
    await SecureStore.deleteItemAsync(ACTOR_NAME_KEY);
    await SecureStore.deleteItemAsync(ACTOR_ROLE_KEY);
  },
};
```

### 4.2 Auth State Store (`src/store/useAuthStore.ts`)
```typescript
import { create } from 'zustand';
import { storageService } from '../services/storage.service';
import { Role } from '../types/domain';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  activeActorId: string | null;
  activeActorName: string | null;
  activeActorRole: Role;
  isAdmin: boolean;
  isLoading: boolean;

  setAdminSession: (accessToken: string, refreshToken?: string, email?: string) => Promise<void>;
  setActiveActor: (id: string, name: string, role: Role) => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  activeActorId: null,
  activeActorName: null,
  activeActorRole: 'EMPLOYEE',
  isAdmin: false,
  isLoading: true,

  setAdminSession: async (accessToken, refreshToken, email) => {
    await storageService.setAccessToken(accessToken);
    if (refreshToken) {
      await storageService.setRefreshToken(refreshToken);
    }
    await storageService.setActiveActor('admin', 'Workshop Owner', 'OWNER');
    set({
      accessToken,
      refreshToken: refreshToken || get().refreshToken,
      activeActorId: 'admin',
      activeActorName: 'Workshop Owner',
      activeActorRole: 'OWNER',
      isAdmin: true,
      isLoading: false,
    });
  },

  setActiveActor: async (id, name, role) => {
    await storageService.setActiveActor(id, name, role);
    set({
      activeActorId: id,
      activeActorName: name,
      activeActorRole: role,
      isAdmin: role === 'OWNER',
    });
  },

  restoreSession: async () => {
    try {
      const accessToken = await storageService.getAccessToken();
      const refreshToken = await storageService.getRefreshToken();
      const actor = await storageService.getActiveActor();

      set({
        accessToken,
        refreshToken,
        activeActorId: actor?.id || null,
        activeActorName: actor?.name || null,
        activeActorRole: (actor?.role as Role) || 'EMPLOYEE',
        isAdmin: actor?.role === 'OWNER' || !!accessToken,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await storageService.clearAll();
    set({
      accessToken: null,
      refreshToken: null,
      activeActorId: null,
      activeActorName: null,
      activeActorRole: 'EMPLOYEE',
      isAdmin: false,
      isLoading: false,
    });
  },
}));
```

---

## 5. API Client & Network Integration Layer

### 5.1 Axios Instance with Interceptors (`src/api/client.ts`)
The API client guarantees:
1. Dynamic header injection:
   - If Admin `accessToken` is present, it injects `Authorization: Bearer <accessToken>`.
   - If an `activeActorId` is selected, it injects `X-Employee-Id: <activeActorId>`.
2. Automatic Token Refresh on `401 Unauthorized` with **Mutex Queue**:
   - Multiple concurrent failing requests wait for one refresh operation rather than triggering multiple token requests.
   - Handles `TOKEN_REUSE_DETECTED` or expired refresh tokens by logging out and redirecting to the login screen.
3. Normalized Error handling for clean UI consumption.

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { storageService } from '../services/storage.service';
import { useAuthStore } from '../store/useAuthStore';

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach Auth & Actor Headers
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = await storageService.getAccessToken();
    const actor = await storageService.getActiveActor();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (actor?.id) {
      config.headers['X-Employee-Id'] = actor.id;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 Automatic Refresh Mutex
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Bypasses if request is login or refresh itself
    if (
      !originalRequest ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    // Check if error is 401 Unauthorized and not previously retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      const storedRefreshToken = await storageService.getRefreshToken();

      // If no refresh token exists, clear session and reject
      if (!storedRefreshToken) {
        await useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call backend refresh endpoint with fallback body
        const refreshResponse = await axios.post(
          `${ENV.API_BASE_URL}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken = refreshResponse.data.data.accessToken || refreshResponse.data.data.token;
        await storageService.setAccessToken(newAccessToken);

        useAuthStore.setState({ accessToken: newAccessToken });
        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        await useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

### 5.2 Error Parser & Code Mapping (`src/api/errors.ts`)
```typescript
import { AxiosError } from 'axios';
import { ApiErrorResponse } from '../types/api';

export interface AppError {
  message: string;
  code: string;
  validationErrors?: Array<{ field: string; message: string }>;
  isNetworkError: boolean;
}

export const parseApiError = (error: unknown): AppError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (!axiosError.response) {
      return {
        message: 'Unable to connect to workshop server. Check your network or server status.',
        code: 'NETWORK_ERROR',
        isNetworkError: true,
      };
    }

    const payload = axiosError.response.data;
    return {
      message: payload?.message || axiosError.message || 'An unexpected error occurred',
      code: payload?.code || `HTTP_${axiosError.response.status}`,
      validationErrors: Array.isArray(payload?.data) ? payload.data : undefined,
      isNetworkError: false,
    };
  }

  return {
    message: (error as Error)?.message || 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    isNetworkError: false,
  };
};
```

---

## 6. State Management (TanStack Query + Zustand)

### 6.1 Architectural Separation
- **Server State**: Managed strictly by **TanStack React Query**. Handles server caching, stale-while-revalidate, automatic retry, and cache invalidation.
- **Client/Local State**: Managed by **Zustand**. Handles authentication tokens, active actor profile, UI modal sheets, and search filter controls.

### 6.2 Query Client Setup (`app/_layout.tsx`)
```typescript
import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { ActivityIndicator, View } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Do not retry 4xx errors
        if (error?.response?.status && error.response.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 2, // 2 minutes fresh
      refetchOnWindowFocus: true,
    },
  },
});

export default function RootLayout() {
  const { restoreSession, isLoading } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
```

### 6.3 Query Keys Factory Pattern (`src/config/queryKeys.ts`)
Centralizes cache keys for consistent invalidation:
```typescript
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  employees: {
    all: ['employees'] as const,
    list: (filters: Record<string, any>) => ['employees', 'list', filters] as const,
    statusDashboard: ['employees', 'status'] as const,
    detail: (id: string) => ['employees', 'detail', id] as const,
    tasks: (id: string, status?: string) => ['employees', 'tasks', id, status] as const,
  },
  motors: {
    all: ['motors'] as const,
    list: (params: { search?: string; status?: string; page?: number }) => ['motors', 'list', params] as const,
    detail: (id: string) => ['motors', 'detail', id] as const,
    history: (motorId: string) => ['motors', 'history', motorId] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    list: (params: { status?: string; motorId?: string; page?: number }) => ['jobs', 'list', params] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
    tasks: (jobId: string) => ['jobs', 'tasks', jobId] as const,
    history: (jobId: string) => ['jobs', 'history', jobId] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },
};
```

---

## 7. Screens, Navigation Hierarchy & UI States

### 7.1 Navigation Architecture
```
Root Navigator
├── (auth)
│   ├── login.tsx            (Admin credentials: email/password)
│   └── select-actor.tsx     (Floor technician profile picker)
└── (app) [Tab Navigator]
    ├── index.tsx            (Workshop Dashboard / Status KPI)
    ├── motors
    │   ├── index.tsx        (Motors list & quick search)
    │   ├── register.tsx     (Register motor + initial job)
    │   ├── [id]/index.tsx   (Motor details, jobs, images)
    │   ├── [id]/edit.tsx    (Edit motor specifications)
    │   ├── [id]/upload.tsx  (Capture & upload photo)
    │   └── [id]/history.tsx (Motor audit log timeline)
    ├── jobs
    │   ├── index.tsx        (Kanban/list view by status)
    │   ├── [id]/index.tsx   (Job details & state machine transition buttons)
    │   ├── [id]/add-task.tsx(Create task under job)
    │   └── [id]/history.tsx (Job audit history)
    ├── tasks
    │   ├── index.tsx        (Assigned tasks workbench)
    │   └── [id].tsx         (Task progress start/complete actions)
    ├── employees
    │   ├── index.tsx        (Team active workload dashboard)
    │   ├── create.tsx       (Register employee)
    │   └── [id].tsx         (Employee tasks view)
    └── settings
        └── index.tsx        (Actor switch, server check, call/whatsapp CTA)
```

### 7.2 UI State Standards
Every screen must handle the 4 fundamental UI states:
1. **Loading State**: Render skeleton placeholders or native `<ActivityIndicator color="#0284c7" />`.
2. **Empty State**: Render illustrative card with explicit call-to-action (e.g. "No motors found in workshop. Register one now").
3. **Error State**: Render clear `ErrorBanner` displaying parsed human message with a "Retry" button.
4. **Success State**: Native haptic feedback (`expo-haptics`) and auto-dismissing toast notifications.

---

## 8. Comprehensive Screen-to-API Mapping

The following matrix defines the exact mapping between mobile screens, backend API routes, payloads, responses, and UI roles:

| Screen | Route / File | API Endpoint | HTTP | Request Data | Response Data | UI Usage / Notes |
|---|---|---|---|---|---|---|
| **Admin Login** | `app/(auth)/login.tsx` | `/api/v1/auth/login` | `POST` | `{ email, password }` | `{ token, accessToken, admin: { email, role } }` | Authenticates Owner; stores tokens in SecureStore. |
| **Actor Selector** | `app/(auth)/select-actor.tsx` | `/api/v1/employees?isActive=true` | `GET` | Headers: none (or public fallback) | `{ employees: Employee[] }` | Allows technician on shop floor to choose active profile. |
| **Dashboard** | `app/(app)/index.tsx` | `/api/v1/employees/status` + `/health` | `GET` | Headers: `X-Employee-Id` | Active tasks count, workers active, server health | Shows live workshop stats, quick motor registration CTA. |
| **Motor List** | `app/(app)/motors/index.tsx` | `/api/v1/motors` | `GET` | `?search=&status=&page=&limit=` | `{ motors: Motor[], pagination }` | Paginated search list with pull-to-refresh & status chips. |
| **Register Motor** | `app/(app)/motors/register.tsx` | `/api/v1/motors` | `POST` | `{ customerName, customerPhone, brand, power, powerUnit, rpm, phase, complaint, ... }` | `201 Created`: `{ id, motorNumber, job: { id, jobNumber } }` | Form creates motor + job in single transaction. Navigates to detail. |
| **Motor Detail** | `app/(app)/motors/[id]/index.tsx` | `/api/v1/motors/:id` | `GET` | Path param `:id` | Full motor object with `jobs`, `tasks`, `images` | Displays full specifications, photo carousel, linked jobs. |
| **Edit Motor** | `app/(app)/motors/[id]/edit.tsx` | `/api/v1/motors/:id` | `PATCH` | `{ complaint, expectedDeliveryAt, notes, ... }` | Updated `Motor` object | Updates mutable specs. Restricted fields remain locked. |
| **Upload Photo** | `app/(app)/motors/[id]/upload.tsx` | `/api/v1/motors/:id/images` | `POST` | `multipart/form-data` with `image` | `201 Created`: `MotorImage` with `secureUrl` | Direct camera capture; uploads to Cloudinary via backend. |
| **Motor History** | `app/(app)/motors/[id]/history.tsx` | `/api/v1/motors/:id/history` | `GET` | Path param `:id`, `?page=` | `{ history: HistoryItem[], pagination }` | Chronological audit timeline showing all actions & actors. |
| **Jobs Board** | `app/(app)/jobs/index.tsx` | `/api/v1/jobs` | `GET` | `?status=&page=&limit=` | `{ jobs: Job[], pagination }` | Filter jobs by state: `RECEIVED`, `IN_PROGRESS`, etc. |
| **Job Detail** | `app/(app)/jobs/[id]/index.tsx` | `/api/v1/jobs/:id` | `GET` | Path param `:id` | `Job` with `motor` & `tasks` | Displays customer name, linked tasks, status action buttons. |
| **Update Job Status** | Modal on `jobs/[id]` | `/api/v1/jobs/:id/status` | `PATCH` | `{ status: JobStatus, notes?: string }` | Updated `Job` object | Server state-machine transitions (e.g. `IN_PROGRESS` → `TESTING`). |
| **Create Task** | `app/(app)/jobs/[id]/add-task.tsx` | `/api/v1/jobs/:jobId/tasks` | `POST` | `{ title, description, assignedEmployeeId? }` | `201 Created`: `Task` | If `assignedEmployeeId` is provided, user must be `OWNER`. |
| **Tasks Workbench** | `app/(app)/tasks/index.tsx` | `/api/v1/employees/:id/tasks` | `GET` | Path param `:id`, `?status=` | `{ tasks: Task[], pagination }` | Technicians see their personal active assignments. |
| **Task Detail** | `app/(app)/tasks/[id].tsx` | `/api/v1/tasks/:id` | `GET` | Path param `:id` | Full `Task` object | Shows instructions, motor specs, and action buttons. |
| **Advance Task** | Button on `tasks/[id]` | `/api/v1/tasks/:id/status` | `PATCH` | `{ status: "IN_PROGRESS" \| "COMPLETED" }` | Updated `Task` object | Technician marks work started (`IN_PROGRESS`) or done (`COMPLETED`). |
| **Assign Task** | Modal on `tasks/[id]` | `/api/v1/tasks/:id` | `PATCH` | `{ assignedEmployeeId: string }` | Updated `Task` object | **OWNER role only**. Assigns or reassigns task to worker. |
| **Employees List** | `app/(app)/employees/index.tsx` | `/api/v1/employees/status` | `GET` | Headers: actor | List of all employees + their active tasks count | Shows who is currently working on what job. |
| **Add Employee** | `app/(app)/employees/create.tsx` | `/api/v1/employees` | `POST` | `{ name, phone, role }` | `201 Created`: `Employee` | Registers new worker into the system. |
| **Job History** | `app/(app)/jobs/[id]/history.tsx` | `/api/v1/jobs/:id/history` | `GET` | Path param `:id` | `{ history: HistoryItem[], pagination }` | Audit log for specific job state changes. |

---

## 9. Feature Modules & Service Implementations

### 9.1 Motors Service & Hooks (`src/services/motor.service.ts` & `src/hooks/useMotors.ts`)

```typescript
// src/services/motor.service.ts
import { apiClient } from '../api/client';
import { ApiResponse, PaginatedResult } from '../types/api';
import { Motor, HistoryItem } from '../types/domain';

export interface RegisterMotorPayload {
  customerName: string;
  customerPhone: string;
  brand?: string;
  motorType?: string;
  power?: number;
  powerUnit?: string;
  rpm?: number;
  phase?: string;
  serialNumber?: string;
  complaint?: string;
  notes?: string;
  expectedDeliveryAt?: string;
}

export const motorService = {
  async getMotors(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const res = await apiClient.get<ApiResponse<{ motors: Motor[]; pagination: any }>>('/motors', { params });
    return {
      items: res.data.data.motors,
      pagination: res.data.data.pagination,
    };
  },

  async getMotorById(id: string) {
    const res = await apiClient.get<ApiResponse<Motor>>(`/motors/${id}`);
    return res.data.data;
  },

  async registerMotor(payload: RegisterMotorPayload) {
    const res = await apiClient.post<ApiResponse<Motor>>('/motors', payload);
    return res.data.data;
  },

  async updateMotor(id: string, payload: Partial<RegisterMotorPayload>) {
    const res = await apiClient.patch<ApiResponse<Motor>>(`/motors/${id}`, payload);
    return res.data.data;
  },

  async getMotorHistory(motorId: string, page = 1) {
    const res = await apiClient.get<ApiResponse<{ history: HistoryItem[]; pagination: any }>>(
      `/motors/${motorId}/history`,
      { params: { page } }
    );
    return res.data.data;
  },
};
```

Custom React Query hook with optimistic updates and invalidation:
```typescript
// src/hooks/useMotors.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motorService, RegisterMotorPayload } from '../services/motor.service';
import { queryKeys } from '../config/queryKeys';

export const useMotors = (params?: { search?: string; status?: string; page?: number }) => {
  return useQuery({
    queryKey: queryKeys.motors.list(params || {}),
    queryFn: () => motorService.getMotors(params),
  });
};

export const useMotorDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.motors.detail(id),
    queryFn: () => motorService.getMotorById(id),
    enabled: Boolean(id),
  });
};

export const useRegisterMotor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterMotorPayload) => motorService.registerMotor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.motors.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.statusDashboard });
    },
  });
};
```

### 9.2 Job Status Transition Logic & Hook
The backend strictly enforces the job status state machine:
- `RECEIVED` → `IN_PROGRESS`, `CANCELLED`
- `IN_PROGRESS` → `TESTING`, `READY_FOR_DELIVERY`, `CANCELLED`
- `TESTING` → `IN_PROGRESS`, `READY_FOR_DELIVERY`, `CANCELLED`
- `READY_FOR_DELIVERY` → `DELIVERED`, `IN_PROGRESS`, `CANCELLED`
- `DELIVERED` → Terminal state
- `CANCELLED` → `RECEIVED`, `IN_PROGRESS`

```typescript
// src/hooks/useJobs.ts
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ApiResponse } from '../types/api';
import { Job, JobStatus } from '../types/domain';
import { queryKeys } from '../config/queryKeys';

export const useUpdateJobStatus = (jobId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ status, notes }: { status: JobStatus; notes?: string }) => {
      const res = await apiClient.patch<ApiResponse<Job>>(`/jobs/${jobId}/status`, {
        status,
        notes,
      });
      return res.data.data;
    },
    onSuccess: (updatedJob) => {
      queryClient.setQueryData(queryKeys.jobs.detail(jobId), updatedJob);
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.motors.detail(updatedJob.motorId) });
    },
  });
};
```

### 9.3 Task Management & Owner-Only Permissions
In `src/hooks/useTasks.ts`:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ApiResponse } from '../types/api';
import { Task, TaskStatus } from '../types/domain';
import { queryKeys } from '../config/queryKeys';

export const useUpdateTaskStatus = (taskId: string, jobId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: TaskStatus) => {
      const res = await apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.statusDashboard });
    },
  });
};

export const useAssignTask = (taskId: string, jobId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignedEmployeeId: string) => {
      // Backend validates that actor has role: 'OWNER'
      const res = await apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}`, {
        assignedEmployeeId,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
};
```

---

## 10. Media & Image Uploads (Cloudinary Integration)

### 10.1 Image Compression & Multipart Upload Utility
Workshop photos can be large (10–15 MB), which can saturate mobile cellular connections. We resize and compress photos before uploading.

```typescript
// src/services/media.service.ts
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { apiClient } from '../api/client';
import { ApiResponse } from '../types/api';
import { MotorImage } from '../types/domain';

export const mediaService = {
  async pickAndCompressImage(fromCamera = false): Promise<string | null> {
    const permissionResult = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      throw new Error('Camera / Photo library permission is required to attach motor photos.');
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    // Resize to max width 1600px with 75% JPEG compression
    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );

    return manipulated.uri;
  },

  async uploadMotorImage(motorId: string, imageUri: string): Promise<MotorImage> {
    const filename = imageUri.split('/').pop() || 'motor_photo.jpg';
    
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: 'image/jpeg',
    } as any);

    const res = await apiClient.post<ApiResponse<MotorImage>>(
      `/motors/${motorId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return res.data.data;
  },
};
```

---

## 11. Security, Offline Handling & Production Hardening

### 11.1 Secure Credential Handling
- **Never hardcode Admin passwords or API secrets** in the React Native codebase.
- Short-lived JWTs and refresh tokens must be kept exclusively in `expo-secure-store`.
- Automatically clear the secure store when `TOKEN_REUSE_DETECTED` or `INVALID_REFRESH_TOKEN` is received.

### 11.2 Offline Detection & Sticky Bottom CTAs
Motor repair workshops often have dead zones with poor mobile reception.
- Monitor connection using `@react-native-community/netinfo`.
- Present an offline status indicator at the top of screens.
- **Conversion Integrity**: The phone CTA (`tel:+919825272547`) and WhatsApp CTA (`https://wa.me/919825272547`) must remain functional and accessible at all times, even when offline.

```typescript
// src/components/layout/StickyBottomCTA.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Linking } from 'react-native';
import { ENV } from '../../config/env';

export const StickyBottomCTA: React.FC = () => {
  const handleCall = () => Linking.openURL(`tel:${ENV.CONTACT_PHONE}`);
  const handleWhatsApp = () => Linking.openURL(ENV.WHATSAPP_URL);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, styles.callButton]} onPress={handleCall}>
        <Text style={styles.buttonText}>📞 Call Workshop</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.whatsappButton]} onPress={handleWhatsApp}>
        <Text style={styles.buttonText}>💬 WhatsApp</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    elevation: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  callButton: {
    backgroundColor: '#0284c7',
  },
  whatsappButton: {
    backgroundColor: '#16a34a',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
```

### 11.3 Android Cleartext Traffic (Local Development)
When testing on Android against a local development backend (HTTP instead of HTTPS), add `usesCleartextTraffic` to `app.json`:
```json
{
  "expo": {
    "name": "Hindustan Motor Works",
    "slug": "hindustan-motor-mobile",
    "android": {
      "package": "com.hindustanelectricals.motorapp",
      "usesCleartextTraffic": true
    }
  }
}
```

---

## 12. Step-by-Step Development Roadmap

Follow this sequential, phased implementation path to construct the mobile app from the backend APIs:

### Phase 1: Foundation & Networking (Days 1–2)
1. Initialize Expo TypeScript app with Expo Router.
2. Configure `src/config/env.ts` with local IP discovery for development.
3. Implement `src/services/storage.service.ts` with `expo-secure-store`.
4. Build `src/api/client.ts` with request interceptor (attaching Bearer token and `X-Employee-Id`) and 401 token refresh mutex.
5. Verify connectivity by calling `GET /health` and `GET /version`.

### Phase 2: Authentication & Actor Selection (Days 3–4)
1. Implement `useAuthStore` using Zustand.
2. Build `app/(auth)/login.tsx` for Owner Admin login (`POST /api/v1/auth/login`).
3. Build `app/(auth)/select-actor.tsx` querying active employees (`GET /api/v1/employees?isActive=true`).
4. Implement root layout route gating: if no active actor or token is configured, route to `(auth)`.

### Phase 3: Motors Module (Days 5–7)
1. Build `useMotors` hook and `app/(app)/motors/index.tsx` list screen with search query.
2. Build `app/(app)/motors/register.tsx` form using `react-hook-form` + `zod` to post to `POST /api/v1/motors`.
3. Build `app/(app)/motors/[id]/index.tsx` detail screen displaying motor specifications and linked jobs.
4. Implement photo capture and upload using `expo-image-picker` and `POST /api/v1/motors/:id/images`.
5. Implement chronological timeline view (`app/(app)/motors/[id]/history.tsx`).

### Phase 4: Job & Status Progression (Days 8–9)
1. Build Jobs screen (`app/(app)/jobs/index.tsx`) categorized by status tabs (`RECEIVED`, `IN_PROGRESS`, `TESTING`, etc.).
2. Build Job detail screen (`app/(app)/jobs/[id]/index.tsx`).
3. Implement status transition action sheet enforcing allowed backend transitions (`PATCH /api/v1/jobs/:id/status`).

### Phase 5: Task Management & Owner Permissions (Days 10–11)
1. Build technician personal workbench (`app/(app)/tasks/index.tsx`) filtering tasks by active technician ID.
2. Implement task creation under jobs (`POST /api/v1/jobs/:jobId/tasks`).
3. Implement role-guarded task assignment UI: check `useAuthStore.isAdmin`, display employee picker for Owner, or hide if regular employee.
4. Implement task status toggle button (`ASSIGNED` → `IN_PROGRESS` → `COMPLETED`).

### Phase 6: Employee Dashboard & Workshop Overview (Days 12–13)
1. Implement shop floor status dashboard (`GET /api/v1/employees/status`).
2. Display employee workload cards showing currently active jobs.
3. Build employee registration form (`POST /api/v1/employees`).

### Phase 7: Polish, Offline Handling & Field Testing (Days 14–15)
1. Mount `StickyBottomCTA` on all primary screens for Instant Call and WhatsApp.
2. Add pull-to-refresh (`RefreshControl`) on all list views.
3. Add haptic feedback on successful form submissions and status changes.
4. Test token expiration and refresh flow end-to-end on a physical device.
5. Create production build preview using `eas build --profile preview`.
