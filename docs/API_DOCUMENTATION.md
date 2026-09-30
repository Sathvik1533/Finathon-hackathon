# Finathon API Documentation & Next.js Integration Guide

This guide provides complete technical documentation for all backend API endpoints, security models, error codes, and the drop-in **Next.js** integration contract.

---

## 🌐 Base URL & Configuration

| Environment | Base URL |
| :--- | :--- |
| **Local Development** | `http://localhost:5001` |
| **Production** | Configured via `API_URL` / `NEXT_PUBLIC_API_URL` |

All authentication routes are prefixed with `/api/auth`.

---

## 🔐 Authentication Scheme

- **Mechanism**: Bearer Token in HTTP `Authorization` Header.
- **Format**: `Authorization: Bearer <JWT_TOKEN>`
- **Algorithm**: `HS256` signed with `JWT_SECRET`.
- **Expiration**: 7 days (default configurable in `.env`).

---

## 📡 API Endpoints

### 1. Health Probe
Check backend server status and connectivity.

- **Method**: `GET`
- **Path**: `/api/health`
- **Authentication**: None

#### Response (200 OK)
```json
{
  "status": "healthy",
  "service": "finathon-auth-backend",
  "version": "1.0.0",
  "timestamp": "2026-09-30T13:20:00.000Z"
}
```

#### Example cURL
```bash
curl -X GET http://localhost:5001/api/health
```

---

### 2. User Registration
Registers a new user account, encrypts password using `bcryptjs`, and returns an initial JWT token.

- **Method**: `POST`
- **Path**: `/api/auth/register`
- **Authentication**: None
- **Content-Type**: `application/json`

#### Request Body
| Field | Type | Required | Description | Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | User's full name | Min 2, max 100 characters |
| `email` | `string` | Yes | User's email | Valid email address |
| `password` | `string` | Yes | Account password | Minimum 8 characters |

```json
{
  "name": "Alex Mercer",
  "email": "alex.mercer@finathon.org",
  "password": "SecurePassword123!"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Account created successfully!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Alex Mercer",
    "email": "alex.mercer@finathon.org",
    "created_at": "2026-09-30T13:20:00.000Z"
  }
}
```

#### Error Responses
- **400 Bad Request**: Input validation failed.
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      { "field": "password", "message": "Password must be at least 8 characters long." }
    ]
  }
  ```
- **409 Conflict**: Email already registered.
  ```json
  {
    "success": false,
    "message": "An account with this email address already exists."
  }
  ```

#### Example cURL
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex Mercer","email":"alex.mercer@finathon.org","password":"SecurePassword123!"}'
```

---

### 3. User Login
Authenticates an existing user and returns a signed JWT token.

- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Authentication**: None
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "email": "alex.mercer@finathon.org",
  "password": "SecurePassword123!"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Alex Mercer",
    "email": "alex.mercer@finathon.org"
  }
}
```

#### Error Responses
- **400 Bad Request**: Missing email or password.
- **401 Unauthorized**: Invalid credentials.
  ```json
  {
    "success": false,
    "message": "Invalid email or password."
  }
  ```

#### Example cURL
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex.mercer@finathon.org","password":"SecurePassword123!"}'
```

---

### 4. Authenticated User Profile (`/me`)
Returns the profile of the currently authenticated user based on the provided Bearer token.

- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Authentication**: Required (`Bearer <token>`)

#### Request Headers
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response (200 OK)
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Alex Mercer",
    "email": "alex.mercer@finathon.org",
    "created_at": "2026-09-30T13:20:00.000Z"
  }
}
```

#### Error Responses
- **401 Unauthorized**: Missing token, expired token, or signature verification failed.
  ```json
  {
    "success": false,
    "message": "Access denied. No token provided."
  }
  ```

#### Example cURL
```bash
curl -X GET http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5. User Logout
Notifies backend of logout. The client removes the stored token from storage.

- **Method**: `POST`
- **Path**: `/api/auth/logout`
- **Authentication**: Required (`Bearer <token>`)

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Successfully logged out."
}
```

#### Example cURL
```bash
curl -X POST http://localhost:5001/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ⚡ Next.js Integration Guide

This section explains how to consume this backend inside a Next.js (App Router or Pages Router) frontend.

### 1. Environment Variable Setup
In your Next.js root directory, create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

---

### 2. TypeScript Types (`types/auth.ts`)
```typescript
export interface User {
  id: number | string;
  name: string;
  email: string;
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  errors?: Array<{ field: string; message: string }>;
}
```

---

### 3. API Client Helper (`lib/api.ts`)
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('finathon_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'An error occurred during the request.');
  }

  return data;
}
```

---

### 4. React Auth Context (`context/AuthContext.tsx`)
```tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthResponse } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('finathon_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }

    setToken(savedToken);
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${savedToken}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('finathon_token');
          setToken(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('finathon_token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data: AuthResponse = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    if (data.token && data.user) {
      localStorage.setItem('finathon_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data: AuthResponse = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');

    if (data.token && data.user) {
      localStorage.setItem('finathon_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    localStorage.removeItem('finathon_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

### 5. Screen 1 Drop-in Page (`app/auth/page.tsx`)
```tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const { user, login, register, logout, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Verifying session...</div>;
  }

  if (user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-white">
        <div className="w-full max-w-md p-8 bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-xl text-center">
          <div className="text-4xl mb-4">🛡️</div>
          <h2 className="text-2xl font-bold text-emerald-400">Authenticated Session</h2>
          <p className="mt-2 text-slate-300">Welcome, <strong>{user.name}</strong></p>
          <p className="text-sm text-slate-400">{user.email}</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-semibold rounded-lg transition"
            >
              Proceed to Next Screen ➔
            </button>
            <button
              onClick={logout}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-slate-950 text-white">
      <div className="w-full max-w-md p-8 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md">
        <h1 className="text-2xl font-bold text-center mb-2">Finathon Auth</h1>
        <p className="text-sm text-slate-400 text-center mb-6">
          {isSignUp ? 'Create your new account' : 'Sign in to access your dashboard'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs uppercase font-medium text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs uppercase font-medium text-slate-400 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-medium text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-lg transition disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            className="text-indigo-400 hover:underline font-medium"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
