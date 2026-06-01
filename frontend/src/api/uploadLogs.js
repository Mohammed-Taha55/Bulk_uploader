import apiClient from './client.js';

export async function listUploadLogs({ page = 1, limit = 20, upload_type } = {}) {
  const params = { page, limit };
  if (upload_type) params.upload_type = upload_type;
  const { data } = await apiClient.get('/upload-logs', { params });
  return data;
}

export async function getUploadLog(id) {
  const { data } = await apiClient.get(`/upload-logs/${id}`);
  return data;
}
