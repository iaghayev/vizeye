import { apiGet } from '../api';
export const dashboardApi = {
  getOrgStats:     () => apiGet<any>('/api/v1/org/stats'),
  getAlertSummary: () => apiGet<any>('/api/v1/alerts/events/summary'),
  getIncidentStats:() => apiGet<any>('/api/v1/incidents/stats'),
  getRecentAlerts: (limit=8) => apiGet<any>('/api/v1/alerts/events',{limit,page:1}),
  getOpenIncidents:(limit=8) => apiGet<any>('/api/v1/incidents',{status:'open',limit,page:1}),
};
