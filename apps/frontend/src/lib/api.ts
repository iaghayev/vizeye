import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';

const TOKEN_KEY   = 'vizeye_access';
const REFRESH_KEY = 'vizeye_refresh';

export const tokenStore = {
  getAccess:  () => (typeof window !== 'undefined' ? Cookies.get(TOKEN_KEY)   || localStorage.getItem(TOKEN_KEY)   : null),
  getRefresh: () => (typeof window !== 'undefined' ? Cookies.get(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY) : null),
  set: (tokens: any) => {
    const exp = new Date(Date.now() + 7*24*60*60*1000);
    Cookies.set(TOKEN_KEY,   tokens.accessToken,  { expires:exp, sameSite:'strict' });
    Cookies.set(REFRESH_KEY, tokens.refreshToken, { expires:exp, sameSite:'strict' });
    localStorage.setItem(TOKEN_KEY,   tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear: () => {
    Cookies.remove(TOKEN_KEY); Cookies.remove(REFRESH_KEY);
    localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY);
  },
};

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(cfg => {
  const t = tokenStore.getAccess();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

let refreshing = false;
apiClient.interceptors.response.use(r=>r, async (err: AxiosError) => {
  const orig = err.config as any;
  if (err.response?.status === 401 && !orig._retry && !refreshing) {
    orig._retry = true; refreshing = true;
    const rt = tokenStore.getRefresh();
    if (!rt) { tokenStore.clear(); window.location.href='/login'; return Promise.reject(err); }
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,{refreshToken:rt});
      tokenStore.set(res.data.data.tokens);
      orig.headers.Authorization=`Bearer ${res.data.data.tokens.accessToken}`;
      return apiClient(orig);
    } catch { tokenStore.clear(); window.location.href='/login'; }
    finally { refreshing = false; }
  }
  return Promise.reject(err);
});

export const apiGet    = async <T>(url:string,p?:any): Promise<T> => (await apiClient.get<any>(url,{params:p})).data.data;
export const apiPost   = async <T>(url:string,d?:any): Promise<T> => (await apiClient.post<any>(url,d)).data.data;
export const apiPatch  = async <T>(url:string,d?:any): Promise<T> => (await apiClient.patch<any>(url,d)).data.data;
export const apiDelete = async (url:string): Promise<void> => { await apiClient.delete(url); };
export const extractError = (e:unknown) => { if(e instanceof AxiosError){ const m=(e.response?.data as any)?.error?.message; return Array.isArray(m)?m.join(', '):m||e.message; } return 'Unexpected error'; };
