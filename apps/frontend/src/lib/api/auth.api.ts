import { apiClient, tokenStore } from '../api';
export const authApi = {
  login: async (dto:{email:string;password:string}) => {
    const r = await apiClient.post('/api/v1/auth/login', dto);
    return r.data.data;
  },
  register: async (dto:any) => {
    const r = await apiClient.post('/api/v1/auth/register', dto);
    return r.data.data;
  },
  logout: async () => {
    const rt = tokenStore.getRefresh();
    if (rt) try { await apiClient.post('/api/v1/auth/logout',{refreshToken:rt}); } catch{}
    tokenStore.clear();
  },
  getMe: async () => (await apiClient.get('/api/v1/auth/me')).data.data,
};
