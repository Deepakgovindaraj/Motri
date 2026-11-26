import { ApiResponse, DocumentCategory, VehicleDocumentItem } from '../types';
import { apiClient } from './apiClient';

export const documentService = {
  async list(params: { vehicleId?: string; documentType?: DocumentCategory | '' } = {}): Promise<
    VehicleDocumentItem[]
  > {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined),
    );
    const res = await apiClient.get<ApiResponse<VehicleDocumentItem[]>>('/documents', {
      params: clean,
    });
    return res.data.data;
  },

  async create(payload: {
    vehicleId?: string;
    documentType: DocumentCategory;
    title: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    fileUrl?: string;
    fileName?: string;
    notes?: string;
  }): Promise<VehicleDocumentItem> {
    const res = await apiClient.post<ApiResponse<VehicleDocumentItem>>('/documents', payload);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },
};
