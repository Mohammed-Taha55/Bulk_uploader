import apiClient from './client.js';

export async function uploadRecipients(file, onUploadProgress) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post('/recipients/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return data;
}

export async function listRecipients({ page = 1, limit = 50, status, tag } = {}) {
  const params = { page, limit };
  if (status) params.status = status;
  if (tag)    params.tag    = tag;
  const { data } = await apiClient.get('/recipients', { params });
  return data;
}

export async function updateRecipientStatus(id, status) {
  const { data } = await apiClient.patch(`/recipients/${id}/status`, { status });
  return data;
}
