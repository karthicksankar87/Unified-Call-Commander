const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface Call {
  id: number;
  phoneNumber: string;
  callerName?: string;
  callType?: string;
  timestamp: string;
  duration?: number;
  status: 'incoming' | 'assigned' | 'active' | 'completed' | 'RECEIVED';
  routedTo?: string;
  routedToUserId?: number;
  customerId?: number;
  location?: string;
  metadata?: any;
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

export interface AnalyticsSummary {
  totalCallsToday: number;
  activeCallsNow: number;
  completedCallsToday: number;
  avgHandleTimeSecondsToday: number | null;
  activeStaffNow: number;
  locationStats: Array<{
    location: string;
    callsToday: number;
    avgHandleTimeSecondsToday: number | null;
  }>;
  reasons: Array<{
    name: string;
    value: number;
  }>;
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

  async answerCall(call: Call): Promise<Call> {
    const body = call.routedToUserId ? { userId: call.routedToUserId } : {};
    const response = await fetch(`${API_BASE_URL}/calls/${call.id}/answer`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let message = 'Failed to answer call';
      try {
        const err = await response.json();
        if (err?.error) message = err.error;
      } catch {}
      throw new Error(message);
    }
    return response.json();
  }

  async endCall(callId: number): Promise<Call> {
    const response = await fetch(`${API_BASE_URL}/calls/${callId}/end`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      let message = 'Failed to end call';
      try {
        const err = await response.json();
        if (err?.error) message = err.error;
      } catch {}
      throw new Error(message);
    }
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

  // Redis Management
  async initializeRedisStaffAvailability(): Promise<{ 
    success: boolean; 
    message: string;
    staffCount?: number;
    locationCount?: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/routing/initialize-redis`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to initialize Redis staff availability');
    return response.json();
  }

  // Analytics
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const response = await fetch(`${API_BASE_URL}/analytics/summary`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch analytics summary');
    return response.json();
  }
}

export const apiService = new ApiService();
