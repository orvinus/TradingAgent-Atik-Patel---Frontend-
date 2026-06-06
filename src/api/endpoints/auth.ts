// src/api/endpoints/auth.ts
import { apiClient } from "@/api/client";
import type {
  RegisterPayload,
  RegisterResponse,
  VerifyEmailPayload,
  VerifyEmailResponse,
  LoginPayload,
  LoginResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
} from "@/types/auth";

export const authApi = {
  register: async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<RegisterResponse>(
      "/auth/register",
      payload
    );
    return data;
  },

  verifyEmail: async (payload: VerifyEmailPayload) => {
    const { data } = await apiClient.post<VerifyEmailResponse>(
      "/auth/verify-email",
      payload
    );
    return data;
  },

  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post<LoginResponse>(
      "/auth/login",
      payload
    );
    return data;
  },

  forgotPassword: async (payload: ForgotPasswordPayload) => {
    const { data } = await apiClient.post<ForgotPasswordResponse>(
      "/auth/forgot-password",
      payload
    );
    return data;
  },

  resetPassword: async (payload: ResetPasswordPayload) => {
    const { data } = await apiClient.post<ResetPasswordResponse>(
      "/auth/reset-password",
      payload
    );
    return data;
  },

  logout: () => {
    localStorage.removeItem("tradingagents-store");
  },
};