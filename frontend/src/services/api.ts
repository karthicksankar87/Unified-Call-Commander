const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface Call {
  id: number;
  timestamp: string;
  status: 'incoming' | 'active' | 'completed';
  routedToUserId?: number;
  customerId?: number;
  user?: {
    name: string;
    location: {
      name: string;
    };
  };
  customer?: {
    name: string;
    contact?: string;
  };
}

export interface CallStats {
  totalCalls: number;
  activeCalls: number;
  completedCalls: number;
}

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Call Management
  async getActiveCalls(): Promise<Call[]> {
    const response = await fetch(`${API_BASE_URL}/calls/active`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch active calls');
    return response.json();
  }

  async answerCall(callId: number, userId: number): Promise<Call> {
    const response = await fetch(`${API_BASE_URL}/calls/${callId}/answer`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) throw new Error('Failed to answer call');
    return response.json();
  }

  async endCall(callId: number): Promise<Call> {
    const response = await fetch(`${API_BASE_URL}/calls/${callId}/end`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to end call');
    return response.json();
  }

  async getCallStats(): Promise<CallStats> {
    const response = await fetch(`${API_BASE_URL}/calls/stats`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch call statistics');
    return response.json();
  }

  async createCall(customerId?: number): Promise<Call> {
    const response = await fetch(`${API_BASE_URL}/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ customerId }),
    });
    if (!response.ok) throw new Error('Failed to create call');
    return response.json();
  }

  // Authentication
  async login(email: string, password: string): Promise<{ token: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  }
}

export const apiService = new ApiService();
