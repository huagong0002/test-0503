
import type { ApiResponse, AuthResponse, ListeningMaterial, LoginRequest, RegisterRequest } from '../types';

// API 基础路径配置
const getApiBase = (): string =&gt; {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;

  if (host.includes('sd-education.online') &amp;&amp; !host.startsWith('www.')) {
    return 'https://www.sd-education.online';
  }

  return '';
};

const API_BASE = getApiBase();

// 通用请求配置
const getRequestConfig = (method: string, data?: any): RequestInit =&gt; {
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    mode: 'cors',
    credentials: API_BASE ? 'include' : 'same-origin',
  };

  if (data &amp;&amp; method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  return config;
};

// 处理 API 响应
async function handleResponse&lt;T&gt;(response: Response): Promise&lt;T&gt; {
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
    let errorMessage = `请求失败: ${response.status}`;
    
    if (contentType &amp;&amp; contentType.includes('application/json')) {
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

  if (contentType &amp;&amp; contentType.includes('application/json')) {
    return response.json();
  }
  
  throw new Error('响应格式不正确');
}

// ==================== 认证 API ====================

export const authApi = {
  /**
   * 登录
   */
  async login(data: LoginRequest): Promise&lt;AuthResponse&gt; {
    const response = await fetch(
      `${API_BASE}/api/login`,
      getRequestConfig('POST', data)
    );
    return handleResponse&lt;AuthResponse&gt;(response);
  },

  /**
   * 注册
   */
  async register(data: RegisterRequest): Promise&lt;AuthResponse&gt; {
    const response = await fetch(
      `${API_BASE}/api/register`,
      getRequestConfig('POST', data)
    );
    return handleResponse&lt;AuthResponse&gt;(response);
  },
};

// ==================== 材料 API ====================

export const materialsApi = {
  /**
   * 获取材料列表
   */
  async getList(): Promise&lt;ListeningMaterial[]&gt; {
    const response = await fetch(
      `${API_BASE}/api/materials`,
      getRequestConfig('GET')
    );
    return handleResponse&lt;ListeningMaterial[]&gt;(response);
  },

  /**
   * 同步材料到服务器
   */
  async sync(materials: ListeningMaterial[]): Promise&lt;ApiResponse&lt;{ count: number; source: string }&gt;&gt; {
    const response = await fetch(
      `${API_BASE}/api/materials/sync`,
      getRequestConfig('POST', { materials })
    );
    return handleResponse&lt;ApiResponse&lt;{ count: number; source: string }&gt;&gt;(response);
  },

  /**
   * 删除材料
   */
  async delete(id: string): Promise&lt;ApiResponse&gt; {
    const response = await fetch(
      `${API_BASE}/api/materials/${id}`,
      getRequestConfig('DELETE')
    );
    return handleResponse&lt;ApiResponse&gt;(response);
  },
};

// ==================== 健康检查 API ====================

export const healthApi = {
  /**
   * 检查服务器健康状态
   */
  async check(): Promise&lt;{ status: string; supabaseConnected: boolean }&gt; {
    const response = await fetch(
      `${API_BASE}/api/health`,
      getRequestConfig('GET')
    );
    return handleResponse(response);
  },
};

