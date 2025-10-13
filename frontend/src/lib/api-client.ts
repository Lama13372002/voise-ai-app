// API Client для работы с Go Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Response Types
interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface TokenBalanceResponse {
  token_balance: number;
}

interface TokenDeductResponse {
  new_balance: number;
  tokens_deducted: number;
}

interface UserResponse {
  user: {
    id: number;
    telegram_id: string;
    username?: string;
    first_name: string;
    last_name?: string;
    is_premium: boolean;
    token_balance: number;
    selected_model?: string;
    selected_voice?: string;
    selected_prompt_id?: number;
    created_at: string;
    updated_at: string;
    last_active: string;
  };
}

interface ConversationMessage {
  id: number;
  user_id: number;
  session_id?: number;
  message_type: string;
  content: string;
  audio_duration_seconds: number;
  created_at: string;
}

interface Plan {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  token_amount: number;
  features: string[];
  is_active: boolean;
  created_at?: string;
}

interface PlansResponse {
  plans: Plan[];
}

interface UserPlan {
  id: number;
  plan_name: string;
  token_amount: number;
  tokens_used: number;
  tokens_remaining: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'expired' | 'cancelled';
  features: string[];
}

interface UserPlansResponse {
  active_plans: UserPlan[];
  closed_plans: UserPlan[];
}

interface CurrentPlanResponse {
  has_active_subscription: boolean;
  current_plan_name: string;
  token_balance: number;
  plan_expired?: boolean;
  tokens_remaining_in_plan?: number;
}

interface CreateSubscriptionResponse {
  new_token_balance: number;
  existing_subscription?: {
    plan_name: string;
    tokens_remaining: number;
  };
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Users
  async createOrUpdateUser(data: {
    telegram_id: string;
    username?: string;
    first_name: string;
    last_name?: string;
    language_code?: string;
  }): Promise<APIResponse<UserResponse>> {
    return this.request<APIResponse<UserResponse>>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUser(params: { telegram_id?: string; user_id?: number }): Promise<APIResponse<UserResponse>> {
    const query = new URLSearchParams();
    if (params.telegram_id) query.set('telegram_id', params.telegram_id);
    if (params.user_id) query.set('user_id', params.user_id.toString());

    return this.request<APIResponse<UserResponse>>(`/users?${query.toString()}`);
  }

  async updateUserModel(data: { user_id: number; selected_model: string }): Promise<APIResponse<{ selected_model: string }>> {
    return this.request<APIResponse<{ selected_model: string }>>('/users', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Tokens
  async getTokenBalance(userId: number): Promise<APIResponse<TokenBalanceResponse>> {
    return this.request<APIResponse<TokenBalanceResponse>>(`/tokens?user_id=${userId}`);
  }

  async deductTokens(data: {
    user_id: number;
    session_id: string;
    usage: {
      total_tokens: number;
      input_tokens: number;
      output_tokens: number;
      input_token_details?: Record<string, unknown>;
      output_token_details?: Record<string, unknown>;
    };
    check_only?: boolean;
  }): Promise<APIResponse<TokenDeductResponse>> {
    return this.request<APIResponse<TokenDeductResponse>>('/tokens', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async addTokens(data: { user_id: number; tokens_to_add: number }) {
    return this.request('/tokens', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Plans
  async getPlans(): Promise<APIResponse<PlansResponse>> {
    return this.request<APIResponse<PlansResponse>>('/plans');
  }

  async getUserPlans(userId: number): Promise<APIResponse<UserPlansResponse>> {
    return this.request<APIResponse<UserPlansResponse>>(`/user-plans?user_id=${userId}`);
  }

  async createSubscription(data: {
    user_id: number;
    plan_id: number;
    payment_id?: string;
  }): Promise<APIResponse<CreateSubscriptionResponse>> {
    return this.request<APIResponse<CreateSubscriptionResponse>>('/user-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Conversation
  async getConversation(userId: number, limit = 6) {
    return this.request(`/conversation?user_id=${userId}&limit=${limit}`);
  }

  async saveMessage(data: {
    user_id: number;
    session_id?: string;
    message_type: string;
    content: string;
    audio_duration_seconds?: number;
  }) {
    return this.request('/conversation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Prompts
  async getPrompts(userId: number) {
    return this.request(`/prompts?user_id=${userId}`);
  }

  async createPrompt(data: {
    user_id: number;
    title: string;
    description?: string;
    content: string;
    category?: string;
    voice_gender?: string;
  }) {
    return this.request('/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // OpenAI Token
  async getOpenAIToken(userId?: number) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/token${query}`);
  }

  // Health Check
  async healthCheck() {
    return this.request('/health');
  }

  // User Current Plan
  async getCurrentUserPlan(userId: number): Promise<APIResponse<CurrentPlanResponse>> {
    return this.request<APIResponse<CurrentPlanResponse>>(`/user-current-plan?user_id=${userId}`);
  }

  // User Prompt Management
  async selectPrompt(data: { user_id: number; prompt_id: number }) {
    return this.request('/user-prompt', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePrompt(userId: number, promptId: number) {
    return this.request(`/user-prompt?user_id=${userId}&prompt_id=${promptId}`, {
      method: 'DELETE',
    });
  }

  // User Voice Selection
  async getUserVoice(userId: number) {
    return this.request(`/user-voice?user_id=${userId}`);
  }

  async updateUserVoice(data: { user_id: number; selected_voice: string }) {
    return this.request('/user-voice', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User Activity
  async logActivity(data: {
    user_id: number;
    activity_type: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.request('/user-activity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserActivities(userId: number, limit = 50) {
    return this.request(`/user-activity?user_id=${userId}&limit=${limit}`);
  }

  // Voice Sessions
  async createVoiceSession(data: {
    user_id: number;
    session_type?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.request('/voice-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserVoiceSessions(userId: number, limit = 20) {
    return this.request(`/voice-sessions?user_id=${userId}&limit=${limit}`);
  }

  async getSessionStats(userId: number) {
    return this.request(`/voice-sessions/stats?user_id=${userId}`);
  }

  // Admin - Plans Management
  async getAllPlansForAdmin(): Promise<APIResponse<PlansResponse>> {
    return this.request<APIResponse<PlansResponse>>('/admin/plans');
  }

  async createPlanAdmin(data: {
    name: string;
    description?: string;
    price: number;
    currency: string;
    token_amount: number;
    features?: string[];
    is_active?: boolean;
  }): Promise<APIResponse<Record<string, never>>> {
    return this.request<APIResponse<Record<string, never>>>('/admin/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlanAdmin(data: {
    plan_id: number;
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    token_amount?: number;
    features?: string[];
    is_active?: boolean;
  }): Promise<APIResponse<Record<string, never>>> {
    return this.request<APIResponse<Record<string, never>>>('/admin/plans', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlanAdmin(planId: number): Promise<APIResponse<Record<string, never>>> {
    return this.request<APIResponse<Record<string, never>>>(`/admin/plans?plan_id=${planId}`, {
      method: 'DELETE',
    });
  }
}

// Export types for use in components
export type { Plan, PlansResponse, UserPlan, UserPlansResponse, CurrentPlanResponse, CreateSubscriptionResponse };

export const apiClient = new APIClient(API_BASE_URL);
