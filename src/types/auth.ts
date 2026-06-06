// src/types/auth.ts

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  tz: string;
  agree_terms: boolean;
  agree_privacy: boolean;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  userId: string;
  email: string;
  nextStep: "verify_email" | string;
  emailDelivery: "pending" | "sent" | "failed";
  debug_verification_token?: string;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  userId: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  session_id: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  emailDelivery: "pending" | "sent" | "failed";
  debug_reset_token?: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tier?: string;
}

export type PlanId = "starter" | "pro" | "elite";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  tokens: string;
  highlight: boolean;
  features: string[];
}
