import { projectId, publicAnonKey } from './supabase/info';
import { getAccessToken } from './supabase/client';
import type { TireModel, Container, StockEntry } from './storage';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-18cdc61b`;
const TIMEOUT_MS = 5000; // 5 segundos de timeout

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Tenta obter token de autenticação (Supabase Auth)
    // Se não houver, usa publicAnonKey (fallback para compatibilidade)
    const accessToken = await getAccessToken();
    const authToken = accessToken || publicAnonKey;
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Se for erro de rede ou timeout, retorna um erro genérico
    if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Failed to fetch')) {
      throw new Error('Network error or timeout');
    }
    
    throw error;
  }
}

// Tire Models API
export async function fetchTireModels(): Promise<TireModel[]> {
  const result = await apiCall('/tire-models');
  return result.data || [];
}

export async function saveTireModelsToAPI(models: TireModel[]): Promise<void> {
  await apiCall('/tire-models', {
    method: 'POST',
    body: JSON.stringify(models),
  });
}

// Containers API
export async function fetchContainers(): Promise<Container[]> {
  const result = await apiCall('/containers');
  return result.data || [];
}

export async function saveContainersToAPI(containers: Container[]): Promise<void> {
  await apiCall('/containers', {
    method: 'POST',
    body: JSON.stringify(containers),
  });
}

// Stock Entries API
export async function fetchStockEntries(): Promise<StockEntry[]> {
  const result = await apiCall('/stock-entries');
  return result.data || [];
}

export async function saveStockEntryToAPI(entry: StockEntry): Promise<void> {
  await apiCall('/stock-entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export async function deleteStockEntryFromAPI(id: string): Promise<void> {
  await apiCall(`/stock-entries/${id}`, {
    method: 'DELETE',
  });
}

export async function bulkDeleteStockEntriesFromAPI(ids: string[]): Promise<void> {
  await apiCall('/stock-entries/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function saveStockEntriesToAPI(entries: StockEntry[]): Promise<void> {
  await apiCall('/stock-entries', {
    method: 'PUT',
    body: JSON.stringify(entries),
  });
}

export async function updateStockEntryInAPI(barcode: string, updates: Partial<StockEntry>): Promise<void> {
  await apiCall(`/stock-entries/${barcode}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// Tire Movements API
export async function fetchTireMovements(): Promise<any[]> {
  const result = await apiCall('/tire-movements');
  return result.data || [];
}

export async function saveTireMovementToAPI(movement: any): Promise<void> {
  await apiCall('/tire-movements', {
    method: 'POST',
    body: JSON.stringify(movement),
  });
}

export async function saveTireMovementsToAPI(movements: any[]): Promise<void> {
  await apiCall('/tire-movements', {
    method: 'PUT',
    body: JSON.stringify(movements),
  });
}

// Tire Consumption API
export async function fetchTireConsumption(): Promise<any[]> {
  const result = await apiCall('/tire-consumption');
  return result.data || [];
}

export async function saveTireConsumptionToAPI(record: any): Promise<void> {
  await apiCall('/tire-consumption', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

export async function saveTireConsumptionRecordsToAPI(records: any[]): Promise<void> {
  await apiCall('/tire-consumption', {
    method: 'PUT',
    body: JSON.stringify(records),
  });
}

// Users API (Basic sync, not auth)
export async function fetchUsers(): Promise<any[]> {
  const result = await apiCall('/users');
  return result.data || [];
}

export async function saveUsersToAPI(users: any[]): Promise<void> {
  await apiCall('/users', {
    method: 'POST',
    body: JSON.stringify(users),
  });
}

// ============================================
// AUTH API (Supabase Auth)
// ============================================

export interface SignupData {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'operator';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  error?: string;
  message?: string;
}

/**
 * Registra novo usuário via Supabase Auth
 */
export async function signupAPI(data: SignupData): Promise<AuthResponse> {
  return await apiCall('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Autentica usuário via Supabase Auth
 */
export async function loginAPI(data: LoginData): Promise<AuthResponse> {
  return await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Logout via Supabase Auth
 */
export async function logoutAPI(): Promise<AuthResponse> {
  return await apiCall('/auth/logout', {
    method: 'POST',
  });
}

/**
 * Verifica sessão atual
 */
export async function checkSessionAPI(): Promise<AuthResponse> {
  return await apiCall('/auth/session');
}

/**
 * Atualiza perfil do usuário
 */
export async function updateProfileAPI(name: string): Promise<AuthResponse> {
  return await apiCall('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

/**
 * Solicita recuperação de senha
 */
export async function requestPasswordRecoveryAPI(email: string): Promise<AuthResponse> {
  return await apiCall('/auth/password-recovery', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Reseta senha com token
 */
export async function resetPasswordAPI(access_token: string, new_password: string): Promise<AuthResponse> {
  return await apiCall('/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify({ access_token, new_password }),
  });
}
