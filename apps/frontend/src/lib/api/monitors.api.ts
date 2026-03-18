import { apiGet, apiPost, apiPatch, apiDelete } from '../api';
export const monitorsApi = {
  list:       (p?:any)    => apiGet<any>('/api/v1/monitors',p),
  get:        (id:string) => apiGet<any>(`/api/v1/monitors/${id}`),
  create:     (d:any)     => apiPost<any>('/api/v1/monitors',d),
  update:     (id:string,d:any) => apiPatch<any>(`/api/v1/monitors/${id}`,d),
  remove:     (id:string) => apiDelete(`/api/v1/monitors/${id}`),
  getUptime:  (id:string,hours?:number) => apiGet<any>(`/api/v1/monitors/${id}/uptime`,{hours}),
  getResults: (id:string,p?:any) => apiGet<any>(`/api/v1/monitors/${id}/results`,p),
};
