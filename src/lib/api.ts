const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '请求失败');
  return data.data;
}

export const api = {
  getDashboard: () => request<any>('/dashboard'),
  getTransfers: (params?: string) => request<any>(`/transfers${params ? '?' + params : ''}`),
  getTransfer: (id: number) => request<any>(`/transfers/${id}`),
  createTransfer: (data: any) => request<any>('/transfers', { method: 'POST', body: JSON.stringify(data) }),
  updateTransfer: (id: number, data: any) => request<any>(`/transfers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  batchImportTransfers: (data: any) => request<any>('/transfers/batch-import', { method: 'POST', body: JSON.stringify(data) }),
  importLogisticsNodes: (id: number, data: any) => request<any>(`/transfers/${id}/logistics-nodes`, { method: 'POST', body: JSON.stringify(data) }),
  updateAbnormal: (id: number, data: any) => request<any>(`/transfers/${id}/abnormal`, { method: 'POST', body: JSON.stringify(data) }),
  updateFreight: (id: number, data: any) => request<any>(`/transfers/${id}/freight`, { method: 'POST', body: JSON.stringify(data) }),
  reconcileTransfer: (id: number) => request<any>(`/transfers/${id}/reconcile`, { method: 'PUT' }),
  payTransfer: (id: number) => request<any>(`/transfers/${id}/pay`, { method: 'PUT' }),
  getTransitOverview: () => request<any>('/transit/overview'),
  getTransitList: (params?: string) => request<any>(`/transit/list${params ? '?' + params : ''}`),
  getTransitByWarehouse: () => request<any>('/transit/by-warehouse'),
  getTransitByCarrier: () => request<any>('/transit/by-carrier'),
  getTransitAbnormal: (params?: string) => request<any>(`/transit/abnormal${params ? '?' + params : ''}`),
  getCarriers: () => request<any>('/carriers'),
  createCarrier: (data: any) => request<any>('/carriers', { method: 'POST', body: JSON.stringify(data) }),
  updateCarrier: (id: number, data: any) => request<any>(`/carriers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getWarehouses: () => request<any>('/warehouses'),
  createWarehouse: (data: any) => request<any>('/warehouses', { method: 'POST', body: JSON.stringify(data) }),
  updateWarehouse: (id: number, data: any) => request<any>(`/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getTeams: () => request<any>('/teams'),
  createTeam: (data: any) => request<any>('/teams', { method: 'POST', body: JSON.stringify(data) }),
  getSlaRules: () => request<any>('/sla-rules'),
  createSlaRule: (data: any) => request<any>('/sla-rules', { method: 'POST', body: JSON.stringify(data) }),
  deleteSlaRule: (id: number) => request<any>(`/sla-rules/${id}`, { method: 'DELETE' }),
  getUsers: () => request<any>('/users'),
  createUser: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: any) => request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
