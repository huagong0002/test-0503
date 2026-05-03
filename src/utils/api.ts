
import type { ApiResponse, AuthResponse, ListeningMaterial, LoginRequest, RegisterRequest } from '../types';

// API 基础路径配置
const getApiBase = (): string => {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;

  if (host.includes('sd-education.online') && !host.startsWith('www.')) {
    return 'https://www.sd-education.online';
  }

  return '';
};

const API_BASE = getApiBase();

// 通用请求配置
const getRequestConfig = (method: string, data?: any): RequestInit => {
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    mode: 'cors',
    credentials: API_BASE ? 'include' : 'same-origin',
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  return config;
};

// 处理 API 响应
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
    let errorMessage = `请求失败: ${response.status}`;
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
    } else {
      const text = await response.text();
      if (text) errorMessage = text;
    }
    
    throw new Error(errorMessage);
  }

  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  throw new Error('响应格式不正确');
}

// ==================== 认证 API ====================

export const authApi = {
  /**
   * 登录
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(
      `${API_BASE}/api/login`,
      getRequestConfig('POST', data)
    );
    return handleResponse<AuthResponse>(response);
  },

  /**
   * 注册
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(
      `${API_BASE}/api/register`,
      getRequestConfig('POST', data)
    );
    return handleResponse<AuthResponse>(response);
  },
};

// ==================== 材料 API ====================

export const materialsApi = {
  /**
   * 获取材料列表
   */
  async getList(): Promise<ListeningMaterial[]> {
    const response = await fetch(
      `${API_BASE}/api/materials`,
      getRequestConfig('GET')
    );
    return handleResponse<ListeningMaterial[]>(response);
  },

  /**
   * 同步材料到服务器
   */
  async sync(materials: ListeningMaterial[]): Promise<ApiResponse<{ count: number; source: string }>> {
    const response = await fetch(
      `${API_BASE}/api/materials/sync`,
      getRequestConfig('POST', { materials })
    );
    return handleResponse<ApiResponse<{ count: number; source: string }>>(response);
  },

  /**
   * 删除材料
   */
  async delete(id: string): Promise<ApiResponse> {
    const response = await fetch(
      `${API_BASE}/api/materials/${id}`,
      getRequestConfig('DELETE')
    );
    return handleResponse<ApiResponse>(response);
  },
};

// ==================== 健康检查 API ====================

export const healthApi = {
  /**
   * 检查服务器健康状态
   */
  async check(): Promise<{ status: string; supabaseConnected: boolean }> {
    const response = await fetch(
      `${API_BASE}/api/health`,
      getRequestConfig('GET')
    );
    return handleResponse(response);
  },
};
