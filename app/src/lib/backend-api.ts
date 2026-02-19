const ADMIN_TOKEN_STORAGE_KEY = 'sm_dispatch_admin_access_token';
const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: RequestMethod;
  token?: string | null;
  body?: unknown;
};

type DevAdminTokenResponse = {
  access_token: string;
  token_type: string;
  expires_at: string;
  role: 'admin';
};

export type BackendTechnicianListItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'deactivated';
  manual_availability: boolean;
  effective_availability: boolean;
  on_leave_now: boolean;
  current_shift_window?: string | null;
  next_time_off_start?: string | null;
  zones: Array<{ id: string; name: string }>;
  skills: Array<{ id: string; name: string }>;
  current_jobs_count: number;
};

export type BackendSignupRequest = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  updated_at: string;
};

export type BackendDealership = {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  status: 'active' | 'inactive';
  notes?: string | null;
  last_job_at?: string | null;
  recent_jobs: Array<{
    id: string;
    job_code: string;
    status: string;
    created_at: string;
    assigned_tech?: string | null;
  }>;
};

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  return raw && raw.trim() ? raw : null;
}

export function setStoredAdminToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAdminToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload = await response.json() as { detail?: string };
      if (payload?.detail) {
        detail = payload.detail;
      }
    } catch {
      // Keep generic error if backend didn't return JSON.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export async function fetchDevAdminToken(): Promise<DevAdminTokenResponse> {
  return requestJson<DevAdminTokenResponse>('/auth/dev/admin-token', { method: 'POST' });
}

export async function fetchAdminTechnicians(token: string): Promise<BackendTechnicianListItem[]> {
  return requestJson<BackendTechnicianListItem[]>('/admin/technicians', {
    token,
  });
}

export async function updateAdminTechnician(
  token: string,
  technicianId: string,
  payload: {
    name?: string;
    phone?: string;
    status?: 'active' | 'deactivated';
    manual_availability?: boolean;
  },
): Promise<BackendTechnicianListItem> {
  return requestJson<BackendTechnicianListItem>(`/admin/technicians/${technicianId}`, {
    method: 'PUT',
    token,
    body: payload,
  });
}

export async function createTechnicianSignupRequest(payload: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<BackendSignupRequest> {
  return requestJson<BackendSignupRequest>('/auth/technician-signup-request', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchAdminTechnicianSignupRequests(
  token: string,
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'all',
): Promise<BackendSignupRequest[]> {
  const suffix = status === 'all' ? '' : `?status=${status}`;
  return requestJson<BackendSignupRequest[]>(`/admin/technician-signup-requests${suffix}`, { token });
}

export async function approveAdminTechnicianSignupRequest(
  token: string,
  requestId: string,
): Promise<BackendSignupRequest> {
  return requestJson<BackendSignupRequest>(`/admin/technician-signup-requests/${requestId}/approve`, {
    method: 'POST',
    token,
  });
}

export async function rejectAdminTechnicianSignupRequest(
  token: string,
  requestId: string,
  reason?: string,
): Promise<BackendSignupRequest> {
  return requestJson<BackendSignupRequest>(`/admin/technician-signup-requests/${requestId}/reject`, {
    method: 'POST',
    token,
    body: { reason },
  });
}

export async function fetchAdminDealerships(token: string): Promise<BackendDealership[]> {
  return requestJson<BackendDealership[]>('/admin/dealerships', { token });
}

export async function createAdminDealership(
  token: string,
  payload: {
    code?: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    notes?: string;
  },
): Promise<BackendDealership> {
  return requestJson<BackendDealership>('/admin/dealerships', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function updateAdminDealership(
  token: string,
  dealershipId: string,
  payload: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    notes?: string;
    status?: 'active' | 'inactive';
  },
): Promise<BackendDealership> {
  return requestJson<BackendDealership>(`/admin/dealerships/${dealershipId}`, {
    method: 'PUT',
    token,
    body: payload,
  });
}

export async function updateAdminDealershipStatus(
  token: string,
  dealershipId: string,
  status: 'active' | 'inactive',
): Promise<BackendDealership> {
  return requestJson<BackendDealership>(`/admin/dealerships/${dealershipId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}
