import api from './auth.service';

export interface ServiceHealth {
  label: string;
  ok: boolean;
  status: string;
  latency: string | null;
}

export interface Alert {
  severity: string;
  message: string;
  time: string;
}

export interface ActivityEntry {
  logId: string;
  userId: string;
  userEmail: string;
  userName: string;
  actionType: string;
  action: string;
  timestamp: string;
}

export interface AdminStats {
  users: number | null;
  predictions: number | null;
  injuries: number | null;
}

export const adminService = {
  async getHealth(): Promise<{ services: ServiceHealth[]; alerts: Alert[]; healthy: boolean }> {
    const { data } = await api.get('/api/admin/health');
    return data;
  },

  async getActivity(): Promise<{ activity: ActivityEntry[] }> {
    const { data } = await api.get('/api/admin/activity');
    return data;
  },

  async getStats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>('/api/admin/stats');
    return data;
  },
};
