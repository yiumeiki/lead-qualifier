import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

export const getLeads = async (industry?: string, size?: number) => {
  const params: any = {};
  if (industry) params.industry = industry;
  if (size) params.size = size;
  const res = await axios.get(`${API_BASE}/leads`, { params });
  return res.data;
};

export const postEvent = async (userId: string, action: string, metadata: any) => {
  await axios.post(`${API_BASE}/events`, {
    userId,
    action,
    metadata,
    timestamp: new Date().toISOString(),
  });
}; 