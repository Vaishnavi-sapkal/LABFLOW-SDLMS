import { isAxiosError } from 'axios';
import client from './client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}

export type AccountRole = 'admin' | 'doctor' | 'receptionist' | 'technician' | 'patient';

export interface RegisterAccountDto {
  name: string;
  email: string;
  password: string;
  role: AccountRole;
}

export interface PatientSignupDto {
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  mobile: string;
  email: string;
  password: string;
  consentToTesting: boolean;
  consentToDetailsVerification: boolean;
}

export type AccountSummary = AuthenticatedUser;

interface ProtectedAuthResponse {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

interface AuthServiceLoginResponse {
  access_token: string;
  user: AuthenticatedUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const { data } = await client.post<AuthServiceLoginResponse>('/auth/login', { email, password });
    localStorage.setItem('labflow_token', data.access_token);
    localStorage.setItem('labflow_user', JSON.stringify(data.user));

    return { token: data.access_token, user: data.user };
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to sign in. Please try again.');
    }

    throw error;
  }
}

export async function registerAccount(payload: RegisterAccountDto): Promise<AuthenticatedUser> {
  try {
    const { data } = await client.post<AuthenticatedUser>('/auth/register', payload);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to create the account. Please try again.');
    }
    throw error;
  }
}

export async function patientSignup(payload: PatientSignupDto): Promise<{ message: string; verificationEmailSent: boolean }> {
  try {
    const { data } = await client.post<{ message: string; verificationEmailSent: boolean }>('/auth/patient-signup', payload);
    return data;
  } catch (error) {
    throwApiError(error, 'Unable to create the patient account. Please try again.');
  }
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  try {
    const { data } = await client.post<{ message: string }>('/auth/verify-email', { token });
    return data;
  } catch (error) {
    throwApiError(error, 'Unable to verify your email.');
  }
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  try {
    const { data } = await client.post<{ message: string }>('/auth/resend-verification', { email });
    return data;
  } catch (error) {
    throwApiError(error, 'Unable to resend the verification email.');
  }
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  try {
    const { data } = await client.post<{ message: string }>('/auth/forgot-password', { email });
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to send password reset link. Please try again.');
    }
    throw error;
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  try {
    const { data } = await client.post<{ message: string }>('/auth/reset-password', { token, newPassword });
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to reset password. Please try again.');
    }
    throw error;
  }
}

export async function listAccounts(): Promise<AccountSummary[]> {
  try {
    const { data } = await client.get<AccountSummary[]>('/auth/users');
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to load accounts. Please try again.');
    }
    throw error;
  }
}

export async function deleteAccount(id: string): Promise<void> {
  try {
    await client.delete(`/auth/users/${id}`);
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to delete the account. Please try again.');
    }
    throw error;
  }
}

export async function getCurrentUser(): Promise<AuthenticatedUser> {
  try {
    const { data } = await client.get<ProtectedAuthResponse>('/auth/protected');
    const storedUser = getStoredUser();

    if (storedUser?.id === data.user.userId) {
      return {
        ...storedUser,
        id: data.user.userId,
        email: data.user.email,
        role: data.user.role,
      };
    }

    return {
      id: data.user.userId,
      name: data.user.email,
      email: data.user.email,
      role: data.user.role,
      isActive: true,
    };
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to restore your session. Please sign in again.');
    }

    throw error;
  }
}

export function clearStoredSession() {
  localStorage.removeItem('labflow_token');
  localStorage.removeItem('labflow_user');
}

function getStoredUser(): AuthenticatedUser | null {
  const storedUser = localStorage.getItem('labflow_user');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AuthenticatedUser;
  } catch {
    localStorage.removeItem('labflow_user');
    return null;
  }
}

function throwApiError(error: unknown, fallback: string): never {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    throw new Error(typeof message === 'string' ? message : fallback);
  }
  throw error;
}
