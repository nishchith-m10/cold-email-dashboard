/**
 * Phase 64.B: Email Provider Service Tests
 * 
 * Comprehensive test suite for email provider service
 */

import { EmailProviderService } from '@/lib/genesis/phase64b/email-provider-service';
import {
  EmailProvider,
  SMTPEncryption,
  SaveEmailConfigRequest,
} from '@/lib/genesis/phase64b/email-provider-types';

// Mock database client
class MockDB {
  private data: Map<string, any> = new Map();
  
  from(table: string) {
    return {
      select: () => this.buildQuery(table),
      insert: (data: any) => this.buildInsert(table, data),
      update: (data: any) => this.buildUpdate(table, data),
      delete: () => this.buildDelete(table),
    };
  }
  
  private buildQuery(table: string) {
    const self = this;
    let workspace: string = '';
    
    return {
      eq: (column: string, value: any) => {
        if (column === 'workspace_id') {
          workspace = value;
        }
        return {
          single: async () => {
            const key = `${table}:${workspace}`;
            const data = self.data.get(key);
            return {
              data: data || null,
              error: data ? null : { message: 'Not found' },
            };
          },
        };
      },
    };
  }
  
  private buildInsert(table: string, insertData: any) {
    const self = this;
    
    return {
      single: async () => {
        const key = `${table}:${insertData.workspace_id}`;
        
        // Check for existing
        if (self.data.has(key)) {
          return {
            data: null,
            error: { message: 'Already exists' },
          };
        }
        
        const data = {
          id: 'test-id',
          ...insertData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        self.data.set(key, data);
        
        return { data, error: null };
      },
    };
  }
  
  private buildUpdate(table: string, updateData: any) {
    const self = this;
    let workspace: string = '';
    
    return {
      eq: (column: string, value: any) => {
        if (column === 'workspace_id') {
          workspace = value;
        }
        return {
          single: async () => {
            const key = `${table}:${workspace}`;
            const existing = self.data.get(key);
            
            if (!existing) {
              return {
                data: null,
                error: { message: 'Not found' },
              };
            }
            
            const data = {
              ...existing,
              ...updateData,
              updated_at: new Date().toISOString(),
            };
            
            self.data.set(key, data);
            
            return { data, error: null };
          },
        };
      },
    };
  }
  
  private buildDelete(table: string) {
    const self = this;
    let workspace: string = '';
    
    return {
      eq: (column: string, value: any) => {
        if (column === 'workspace_id') {
          workspace = value;
        }
        return {
          single: async () => {
            const key = `${table}:${workspace}`;
            const existing = self.data.get(key);
            
            if (!existing) {
              return {
                data: null,
                error: { message: 'Not found' },
              };
            }
            
            self.data.delete(key);
            
            return { data: null, error: null };
          },
        };
      },
    };
  }
  
  // Helper for tests
  clear() {
    this.data.clear();
  }
}

describe('EmailProviderService', () => {
  let service: EmailProviderService;
  let mockDB: MockDB;
  
  beforeEach(() => {
    mockDB = new MockDB();
    service = new EmailProviderService(mockDB as any);
  });
  
  describe('saveConfig - Gmail', () => {
    it('should save Gmail configuration', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.GMAIL,
        gmail_email: 'user@gmail.com',
        gmail_credential_id: 'cred-123',
      };
      
      const result = await service.saveConfig('workspace-1', request);
      
      expect(result.provider).toBe(EmailProvider.GMAIL);
      expect((result as any).gmail_email).toBe('user@gmail.com');
      expect((result as any).gmail_credential_id).toBe('cred-123');
    });
    
    it('should reject invalid Gmail email', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.GMAIL,
        gmail_email: 'invalid-email',
      };
      
      await expect(service.saveConfig('workspace-1', request)).rejects.toThrow('Invalid configuration');
    });
    
    it('should reject empty Gmail email', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.GMAIL,
        gmail_email: '',
      };
      
      await expect(service.saveConfig('workspace-1', request)).rejects.toThrow('Gmail email address is required');
    });
  });
  
  describe('saveConfig - SMTP', () => {
    it('should save SMTP configuration', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'user@example.com',
        smtp_password: 'password123',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'John Doe',
        smtp_from_email: 'john@example.com',
      };
      
      const result = await service.saveConfig('workspace-1', request);
      
      expect(result.provider).toBe(EmailProvider.SMTP);
      expect((result as any).smtp_host).toBe('smtp.example.com');
      expect((result as any).smtp_port).toBe(587);
      expect((result as any).smtp_username).toBe('user@example.com');
      expect((result as any).smtp_from_name).toBe('John Doe');
      expect((result as any).smtp_from_email).toBe('john@example.com');
    });
    
    it('should reject SMTP with missing host', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.SMTP,
        smtp_host: '',
        smtp_port: 587,
        smtp_username: 'user@example.com',
        smtp_password: 'password123',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'John Doe',
        smtp_from_email: 'john@example.com',
      };
      
      await expect(service.saveConfig('workspace-1', request)).rejects.toThrow('SMTP host is required');
    });
    
    it('should reject SMTP with invalid port', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp.example.com',
        smtp_port: 70000,
        smtp_username: 'user@example.com',
        smtp_password: 'password123',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'John Doe',
        smtp_from_email: 'john@example.com',
      };
      
      await expect(service.saveConfig('workspace-1', request)).rejects.toThrow('SMTP port must be between 1 and 65535');
    });
    
    it('should reject SMTP with missing username', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: 'password123',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'John Doe',
        smtp_from_email: 'john@example.com',
      };
      
      await expect(service.saveConfig('workspace-1', request)).rejects.toThrow('SMTP username is required');
    });
    
    it('should reject SMTP with missing password', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'user@example.com',
        smtp_password: '',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'John Doe',
        smtp_from_email: 'john@example.com',
      };
      
      await expect(service.saveConfig('workspace-1', request)).rejects.toThrow('SMTP password is required');
    });
  });
  
  describe('saveConfig - SendGrid', () => {
    it('should save SendGrid configuration', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.SENDGRID,
        sendgrid_api_key: 'SG.1234567890abcdefghijklmnopqrstuvwxyz',
        sendgrid_from_email: 'sender@example.com',
        sendgrid_from_name: 'Sender Name',
      };
      
      const result = await service.saveConfig('workspace-1', request);
      
      expect(result.provider).toBe(EmailProvider.SENDGRID);
      expect((result as any).sendgrid_from_email).toBe('sender@example.com');
      expect((result as any).sendgrid_from_name).toBe('Sender Name');
    });
    
    it('should reject SendGrid with invalid API key', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.SENDGRID,
        sendgrid_api_key: 'invalid-key',
        sendgrid_from_email: 'sender@example.com',
      };
      
      await expect(service.saveConfig('workspace-1', request)).rejects.toThrow('Invalid SendGrid API key format');
    });
    
    it('should reject SendGrid with invalid from email', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.SENDGRID,
        sendgrid_api_key: 'SG.1234567890abcdefghijklmnopqrstuvwxyz',
        sendgrid_from_email: 'not-an-email',
      };
      
      await expect(service.saveConfig('workspace-1', request)).rejects.toThrow('Invalid from email format');
    });
  });
  
  describe('getConfig', () => {
    it('should return null if config does not exist', async () => {
      const result = await service.getConfig('workspace-999');
      expect(result).toBeNull();
    });
    
    it('should return saved configuration', async () => {
      // Save a config first
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.GMAIL,
        gmail_email: 'user@gmail.com',
      };
      
      await service.saveConfig('workspace-1', request);
      
      // Retrieve it
      const result = await service.getConfig('workspace-1');
      
      expect(result).not.toBeNull();
      expect(result?.provider).toBe(EmailProvider.GMAIL);
      expect((result as any)?.gmail_email).toBe('user@gmail.com');
    });
  });
  
  describe('getDecryptedConfig', () => {
    it('should return decrypted SMTP configuration', async () => {
      // Save SMTP config
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'user@example.com',
        smtp_password: 'secret123',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'John',
        smtp_from_email: 'john@example.com',
      };
      
      await service.saveConfig('workspace-1', request);
      
      // Get decrypted config
      const result = await service.getDecryptedConfig('workspace-1');
      
      expect(result).not.toBeNull();
      expect(result?.provider).toBe(EmailProvider.SMTP);
      expect(result?.smtp_password).toBe('secret123');
      expect(result?.from_name).toBe('John');
      expect(result?.from_email).toBe('john@example.com');
    });
    
    it('should return null if config does not exist', async () => {
      const result = await service.getDecryptedConfig('workspace-999');
      expect(result).toBeNull();
    });
  });
  
  describe('deleteConfig', () => {
    it('should delete existing configuration', async () => {
      // Save a config
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.GMAIL,
        gmail_email: 'user@gmail.com',
      };
      
      await service.saveConfig('workspace-1', request);
      
      // Verify it exists
      let config = await service.getConfig('workspace-1');
      expect(config).not.toBeNull();
      
      // Delete it
      await service.deleteConfig('workspace-1');
      
      // Verify it's gone
      config = await service.getConfig('workspace-1');
      expect(config).toBeNull();
    });
    
    it('should throw error when deleting non-existent config', async () => {
      await expect(service.deleteConfig('workspace-999')).rejects.toThrow('Failed to delete email config');
    });
  });
  
  describe('testConnection', () => {
    it('should test Gmail configuration', async () => {
      const request: any = {
        provider: EmailProvider.GMAIL,
        gmail_email: 'user@gmail.com',
      };
      
      const result = await service.testConnection(request);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Gmail configuration valid');
    });
    
    it('should test SMTP configuration', async () => {
      const request: any = {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'user@example.com',
        smtp_password: 'password123',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'John',
        smtp_from_email: 'john@example.com',
      };
      
      const result = await service.testConnection(request);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('SMTP connection successful');
    });
    
    it('should test SendGrid configuration', async () => {
      const request: any = {
        provider: EmailProvider.SENDGRID,
        sendgrid_api_key: 'SG.1234567890abcdefghijklmnopqrstuvwxyz',
        sendgrid_from_email: 'sender@example.com',
      };
      
      const result = await service.testConnection(request);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('SendGrid connection successful');
    });
    
    it('should return error for unsupported provider', async () => {
      const request: any = {
        provider: 'unsupported' as any,
      };
      
      const result = await service.testConnection(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not yet supported');
    });
  });
  
  describe('update existing config', () => {
    it('should update existing configuration', async () => {
      // Save initial config
      const initialRequest: SaveEmailConfigRequest = {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp1.example.com',
        smtp_port: 587,
        smtp_username: 'user1@example.com',
        smtp_password: 'pass1',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'User One',
        smtp_from_email: 'user1@example.com',
      };
      
      await service.saveConfig('workspace-1', initialRequest);
      
      // Update it
      const updateRequest: SaveEmailConfigRequest = {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp2.example.com',
        smtp_port: 465,
        smtp_username: 'user2@example.com',
        smtp_password: 'pass2',
        smtp_encryption: SMTPEncryption.SSL,
        smtp_from_name: 'User Two',
        smtp_from_email: 'user2@example.com',
      };
      
      const result = await service.saveConfig('workspace-1', updateRequest);
      
      expect((result as any).smtp_host).toBe('smtp2.example.com');
      expect((result as any).smtp_port).toBe(465);
      expect((result as any).smtp_username).toBe('user2@example.com');
      expect((result as any).smtp_from_name).toBe('User Two');
    });
  });
});
