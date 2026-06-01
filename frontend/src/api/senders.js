import apiClient from './client.js';

export async function uploadSenders(file, onUploadProgress) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post('/senders/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return data;
}

export async function listSenders({ page = 1, limit = 50, status } = {}) {
  const params = { page, limit };
  if (status) params.status = status;
  const { data } = await apiClient.get('/senders', { params });
  return data;
}

export async function deleteSender(id) {
  const { data } = await apiClient.delete(`/senders/${id}`);
  return data;
}
