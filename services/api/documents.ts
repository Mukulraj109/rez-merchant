// Document generation service for merchant app

import { getApiUrl } from '../../config/api';
import { storageService } from '../storage';
import {
  Document,
  DocumentType,
  DocumentStatus,
  DocumentFilters,
  DocumentListResponse,
  GenerateDocumentRequest,
  DocumentGenerationResponse,
  EmailDocumentRequest,
  BulkGenerateDocumentsRequest,
  BulkGenerateDocumentsResponse,
  DocumentAnalytics,
  DocumentSettings,
  InvoiceData,
  ShippingLabelData,
  PackingSlipData,
  ShippingCarrier,
  DocumentGenerationOptions
} from '../../types/documents';
import { validateDocumentData, formatInvoiceNumber, calculateExpiryDate } from '../../utils/documentHelpers';

/**
 * Documents Service
 * Handles all document generation and management operations
 */
class DocumentsService {
  private get baseUrl() {
    return getApiUrl('merchant/documents');
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoice(
    orderId: string,
    options?: DocumentGenerationOptions
  ): Promise<DocumentGenerationResponse> {
    try {
      console.log(`📄 Generating invoice for order: ${orderId}`);

      // Validate required data
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const requestData: GenerateDocumentRequest = {
        type: DocumentType.INVOICE,
        orderId,
        templateId: options?.template,
        options
      };

      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('✅ Invoice generated successfully');
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to generate invoice');
      }
    } catch (error: any) {
      console.error('❌ Generate invoice error:', error);
      throw new Error(error.message || 'Failed to generate invoice');
    }
  }

  /**
   * Generate shipping label PDF
   */
  async generateShippingLabel(
    orderId: string,
    carrier: ShippingCarrier,
    options?: DocumentGenerationOptions
  ): Promise<DocumentGenerationResponse> {
    try {
      console.log(`📦 Generating shipping label for order: ${orderId}`);

      // Validate required data
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      if (!carrier) {
        throw new Error('Shipping carrier is required');
      }

      const requestData: GenerateDocumentRequest = {
        type: DocumentType.SHIPPING_LABEL,
        orderId,
        options: {
          ...options,
          carrier
        }
      };

      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('✅ Shipping label generated successfully');
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to generate shipping label');
      }
    } catch (error: any) {
      console.error('❌ Generate shipping label error:', error);
      throw new Error(error.message || 'Failed to generate shipping label');
    }
  }

  /**
   * Generate packing slip PDF
   */
  async generatePackingSlip(
    orderId: string,
    options?: DocumentGenerationOptions
  ): Promise<DocumentGenerationResponse> {
    try {
      console.log(`📋 Generating packing slip for order: ${orderId}`);

      // Validate required data
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const requestData: GenerateDocumentRequest = {
        type: DocumentType.PACKING_SLIP,
        orderId,
        options
      };

      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('✅ Packing slip generated successfully');
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to generate packing slip');
      }
    } catch (error: any) {
      console.error('❌ Generate packing slip error:', error);
      throw new Error(error.message || 'Failed to generate packing slip');
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<Document> {
    try {
      console.log(`🔍 Fetching document: ${documentId}`);

      const response = await fetch(`${this.baseUrl}/${documentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('✅ Document fetched successfully');
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get document');
      }
    } catch (error: any) {
      console.error('❌ Get document error:', error);
      throw new Error(error.message || 'Failed to get document');
    }
  }

  /**
   * List documents with filters
   */
  async listDocuments(filters?: DocumentFilters): Promise<DocumentListResponse> {
    try {
      console.log('📚 Fetching documents list');

      const searchParams = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
      }

      const response = await fetch(
        `${this.baseUrl}?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log(`✅ Found ${data.data.totalCount} documents`);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to list documents');
      }
    } catch (error: any) {
      console.error('❌ List documents error:', error);
      throw new Error(error.message || 'Failed to list documents');
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🗑️ Deleting document: ${documentId}`);

      const response = await fetch(`${this.baseUrl}/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Document deleted successfully');
        return { success: true, message: data.message || 'Document deleted' };
      } else {
        throw new Error(data.message || 'Failed to delete document');
      }
    } catch (error: any) {
      console.error('❌ Delete document error:', error);
      throw new Error(error.message || 'Failed to delete document');
    }
  }

  /**
   * Email document to recipients
   */
  async emailDocument(
    documentId: string,
    recipients: string[],
    options?: {
      subject?: string;
      message?: string;
      attachmentName?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`📧 Emailing document: ${documentId}`);

      // Validate recipients
      if (!recipients || recipients.length === 0) {
        throw new Error('At least one recipient is required');
      }

      const requestData: EmailDocumentRequest = {
        documentId,
        recipients,
        subject: options?.subject,
        message: options?.message,
        attachmentName: options?.attachmentName
      };

      const response = await fetch(`${this.baseUrl}/${documentId}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Document emailed successfully');
        return { success: true, message: data.message || 'Document emailed' };
      } else {
        throw new Error(data.message || 'Failed to email document');
      }
    } catch (error: any) {
      console.error('❌ Email document error:', error);
      throw new Error(error.message || 'Failed to email document');
    }
  }

  /**
   * Download document (get download URL)
   */
  async downloadDocument(documentId: string): Promise<{ url: string; filename: string }> {
    try {
      console.log(`⬇️ Getting download URL for document: ${documentId}`);

      const response = await fetch(`${this.baseUrl}/${documentId}/download`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('✅ Download URL retrieved successfully');
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get download URL');
      }
    } catch (error: any) {
      console.error('❌ Download document error:', error);
      throw new Error(error.message || 'Failed to download document');
    }
  }

  /**
   * Bulk generate documents
   */
  async bulkGenerateDocuments(
    request: BulkGenerateDocumentsRequest
  ): Promise<BulkGenerateDocumentsResponse> {
    try {
      console.log(`📦 Bulk generating ${request.type} for ${request.orderIds.length} orders`);

      // Validate request
      if (!request.orderIds || request.orderIds.length === 0) {
        throw new Error('At least one order ID is required');
      }

      const response = await fetch(`${this.baseUrl}/bulk-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log(`✅ Bulk generation complete: ${data.data.summary.successful}/${data.data.summary.total} successful`);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to bulk generate documents');
      }
    } catch (error: any) {
      console.error('❌ Bulk generate documents error:', error);
      throw new Error(error.message || 'Failed to bulk generate documents');
    }
  }

  /**
   * Get document analytics
   */
  async getAnalytics(
    dateStart?: string,
    dateEnd?: string
  ): Promise<DocumentAnalytics> {
    try {
      console.log('📊 Fetching document analytics');

      const searchParams = new URLSearchParams();
      if (dateStart) searchParams.append('dateStart', dateStart);
      if (dateEnd) searchParams.append('dateEnd', dateEnd);

      const response = await fetch(
        `${this.baseUrl}/analytics?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('✅ Analytics fetched successfully');
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get analytics');
      }
    } catch (error: any) {
      console.error('❌ Get analytics error:', error);
      // Return default analytics on error
      return {
        totalDocuments: 0,
        documentsByType: {} as any,
        documentsByStatus: {} as any,
        totalDownloads: 0,
        totalEmailsSent: 0,
        averageGenerationTime: 0,
        storageUsed: 0,
        topDocumentTypes: [],
        recentActivity: []
      };
    }
  }

  /**
   * Get document settings
   */
  async getSettings(): Promise<DocumentSettings> {
    try {
      console.log('⚙️ Fetching document settings');

      const response = await fetch(`${this.baseUrl}/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('✅ Settings fetched successfully');
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get settings');
      }
    } catch (error: any) {
      console.error('❌ Get settings error:', error);
      throw new Error(error.message || 'Failed to get settings');
    }
  }

  /**
   * Update document settings
   */
  async updateSettings(
    settings: Partial<DocumentSettings>
  ): Promise<DocumentSettings> {
    try {
      console.log('⚙️ Updating document settings');

      const response = await fetch(`${this.baseUrl}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('✅ Settings updated successfully');
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update settings');
      }
    } catch (error: any) {
      console.error('❌ Update settings error:', error);
      throw new Error(error.message || 'Failed to update settings');
    }
  }

  /**
   * Get documents by order
   */
  async getDocumentsByOrder(orderId: string): Promise<Document[]> {
    try {
      console.log(`📄 Fetching documents for order: ${orderId}`);

      const result = await this.listDocuments({
        orderId,
        sortBy: 'created',
        sortOrder: 'desc'
      });

      return result.documents;
    } catch (error: any) {
      console.error('❌ Get documents by order error:', error);
      return [];
    }
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(
    type: DocumentType,
    page: number = 1,
    limit: number = 20
  ): Promise<DocumentListResponse> {
    try {
      console.log(`📄 Fetching ${type} documents`);

      return await this.listDocuments({
        type,
        page,
        limit,
        sortBy: 'created',
        sortOrder: 'desc'
      });
    } catch (error: any) {
      console.error('❌ Get documents by type error:', error);
      throw error;
    }
  }

  /**
   * Check document generation status
   */
  async checkGenerationStatus(documentId: string): Promise<{
    status: DocumentStatus;
    progress?: number;
    message?: string;
  }> {
    try {
      console.log(`🔍 Checking generation status: ${documentId}`);

      const response = await fetch(`${this.baseUrl}/${documentId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to check status');
      }
    } catch (error: any) {
      console.error('❌ Check generation status error:', error);
      throw new Error(error.message || 'Failed to check generation status');
    }
  }

  /**
   * Helper method to get auth token
   */
  private async getAuthToken(): Promise<string> {
    return (await storageService.getAuthToken()) || '';
  }
}

// Create and export singleton instance
export const documentsService = new DocumentsService();
export default documentsService;
