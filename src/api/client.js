const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('req_auth_token') || null;
    try {
      this.user = JSON.parse(localStorage.getItem('req_auth_user') || 'null');
    } catch {
      // Do not let stale/corrupt browser storage blank the entire app.
      this.user = null;
      localStorage.removeItem('req_auth_user');
      localStorage.removeItem('req_auth_token');
      this.token = null;
    }
    this.listeners = new Set();
  }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    if (token) {
      localStorage.setItem('req_auth_token', token);
      localStorage.setItem('req_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('req_auth_token');
      localStorage.removeItem('req_auth_user');
      // Clear user-specific browser cache
      sessionStorage.clear();
    }
    this.notify();
  }

  logout() {
    this.setAuth(null, null);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener({ token: this.token, user: this.user });
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let res;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        res = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });
        if (![502, 503, 504].includes(res.status) || attempt === 2) break;
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      } catch (err) {
        lastError = err;
        if (attempt === 2) {
          throw new Error('Backend API is not running. Start the application with "npm run dev" and retry.');
        }
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
    if (!res) throw lastError || new Error('Unable to reach the server.');

    const responseText = await res.text();
    let data = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      if (res.status === 404) {
        throw new Error('Backend API endpoint not found (404). Ensure Vercel or backend server is running.');
      }
      if (res.status === 502 || res.status === 503) {
        throw new Error('Backend server is temporarily unavailable (502/503). Please wait a moment and try again.');
      }
      throw new Error(`Server returned an unexpected response (HTTP ${res.status}). Please retry.`);
    }

    if (res.status === 401) {
      if (endpoint === '/auth/login') {
        throw new Error(data.error || 'Invalid username or password.');
      }
      this.logout();
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return data;
  }

  // Auth
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setAuth(data.token, data.user);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async getDemoUsers() {
    return this.request('/auth/demo-users');
  }

  // Master Dropdowns
  async getMasterDropdowns() {
    return this.request('/master');
  }

  // Requisitions
  async getRequisitions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/requisitions${qs ? `?${qs}` : ''}`);
  }

  async getRequisitionById(id) {
    return this.request(`/requisitions/${id}`);
  }

  async submitRequisition(formData, idempotencyKey) {
    const headers = {};
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }
    return this.request('/requisitions', {
      method: 'POST',
      headers,
      body: JSON.stringify(formData),
    });
  }

  async updateStageAction(indentNo, stageName, stageData, expectedVersion) {
    return this.request(`/requisitions/${indentNo}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stageName, stageData, expectedVersion }),
    });
  }

  // Config & Diagnostics (cached in memory for 5 minutes)
  async getConfig(force = false) {
    if (!force && this._cachedConfig && Date.now() - (this._cachedConfigTime || 0) < 300000) {
      return this._cachedConfig;
    }
    const data = await this.request('/config');
    this._cachedConfig = data;
    this._cachedConfigTime = Date.now();
    return data;
  }

  async updateConfig(configData) {
    return this.request('/config', {
      method: 'POST',
      body: JSON.stringify(configData),
    });
  }

  async triggerSync() {
    return this.request('/sync/trigger', {
      method: 'POST',
    });
  }

  // User Administration (Login page sheet)
  async getAdminUsers() {
    return this.request('/admin/users');
  }

  async saveAdminUser(userData) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getAppsScriptCode() {
    return this.request('/admin/apps-script-code');
  }

  // File Upload to Google Drive
  async uploadFile({ fileName, fileData, mimeType, folderId }) {
    return this.request('/upload', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileData, mimeType, folderId }),
    });
  }
}

export const api = new ApiClient();
