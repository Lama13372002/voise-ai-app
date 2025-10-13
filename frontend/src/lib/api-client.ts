// API Client для работы с Go Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

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
  }) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUser(params: { telegram_id?: string; user_id?: number }) {
    const query = new URLSearchParams();
    if (params.telegram_id) query.set('telegram_id', params.telegram_id);
    if (params.user_id) query.set('user_id', params.user_id.toString());

    return this.request(`/users?${query.toString()}`);
  }

  async updateUserModel(data: { user_id: number; selected_model: string }) {
    return this.request('/users', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Tokens
  async getTokenBalance(userId: number) {
    return this.request(`/tokens?user_id=${userId}`);
  }

  async deductTokens(data: {
    user_id: number;
    session_id: string;
    usage: {
      total_tokens: number;
      input_tokens: number;
      output_tokens: number;
      input_token_details?: any;
      output_token_details?: any;
    };
    check_only?: boolean;
  }) {
    return this.request('/tokens', {
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
  async getPlans() {
    return this.request('/plans');
  }

  async getUserPlans(userId: number) {
    return this.request(`/user-plans?user_id=${userId}`);
  }

  async createSubscription(data: {
    user_id: number;
    plan_id: number;
    payment_id?: string;
  }) {
    return this.request('/user-plans', {
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
}

export const apiClient = new APIClient(API_BASE_URL);
