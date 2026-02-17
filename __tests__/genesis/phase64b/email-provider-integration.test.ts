/**
 * Phase 64.B: Email Provider Service Integration Tests
 * 
 * Additional tests for edge cases and branch coverage
 */

import { EmailProviderService } from '@/lib/genesis/phase64b/email-provider-service';
import {
  EmailProvider,
  SMTPEncryption,
  SaveEmailConfigRequest,
  TestEmailRequest,
} from '@/lib/genesis/phase64b/email-provider-types';

// Reuse MockDB from the main test file
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
      select: (columns?: string) => ({
        single: async () => {
          const key = `${table}:${insertData.workspace_id}`;
          
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
      }),
      single: async () => {
        const key = `${table}:${insertData.workspace_id}`;
        
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
          select: (columns?: string) => ({
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
          }),
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
}

describe('EmailProviderService - Integration Tests', () => {
  let service: EmailProviderService;
  let mockDB: MockDB;
  
  beforeEach(() => {
    mockDB = new MockDB();
    service = new EmailProviderService(mockDB as any);
  });
  
  describe('provider switching', () => {
    it('should switch from Gmail to SMTP', async () => {
      // Start with Gmail
      await service.saveConfig('workspace-1', {
        provider: EmailProvider.GMAIL,
        gmail_email: 'user@gmail.com',
      });
      
      let config = await service.getConfig('workspace-1');
      expect(config?.provider).toBe(EmailProvider.GMAIL);
      
      // Switch to SMTP
      await service.saveConfig('workspace-1', {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'user@example.com',
        smtp_password: 'pass',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'User',
        smtp_from_email: 'user@example.com',
      });
      
      config = await service.getConfig('workspace-1');
      expect(config?.provider).toBe(EmailProvider.SMTP);
    });
    
    it('should switch from SMTP to SendGrid', async () => {
      // Start with SMTP
      await service.saveConfig('workspace-1', {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'user@example.com',
        smtp_password: 'pass',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'User',
        smtp_from_email: 'user@example.com',
      });
      
      // Switch to SendGrid
      await service.saveConfig('workspace-1', {
        provider: EmailProvider.SENDGRID,
        sendgrid_api_key: 'SG.1234567890abcdefghijklmnopqrstuvwxyz',
        sendgrid_from_email: 'sender@example.com',
      });
      
      const config = await service.getConfig('workspace-1');
      expect(config?.provider).toBe(EmailProvider.SENDGRID);
    });
  });
  
  describe('edge cases', () => {
    it('should handle multiple workspaces independently', async () => {
      // Workspace 1: Gmail
      await service.saveConfig('workspace-1', {
        provider: EmailProvider.GMAIL,
        gmail_email: 'user1@gmail.com',
      });
      
      // Workspace 2: SMTP
      await service.saveConfig('workspace-2', {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'user2@example.com',
        smtp_password: 'pass',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'User 2',
        smtp_from_email: 'user2@example.com',
      });
      
      const config1 = await service.getConfig('workspace-1');
      const config2 = await service.getConfig('workspace-2');
      
      expect(config1?.provider).toBe(EmailProvider.GMAIL);
      expect(config2?.provider).toBe(EmailProvider.SMTP);
    });
    
    it('should handle SMTP with SSL encryption', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp.example.com',
        smtp_port: 465,
        smtp_username: 'user@example.com',
        smtp_password: 'password',
        smtp_encryption: SMTPEncryption.SSL,
        smtp_from_name: 'User',
        smtp_from_email: 'user@example.com',
      };
      
      const result = await service.saveConfig('workspace-1', request);
      expect((result as any).smtp_encryption).toBe(SMTPEncryption.SSL);
    });
    
    it('should handle SMTP with no encryption', async () => {
      const request: SaveEmailConfigRequest = {
        provider: EmailProvider.SMTP,
        smtp_host: 'smtp.example.com',
        smtp_port: 25,
        smtp_username: 'user@example.com',
        smtp_password: 'password',
        smtp_encryption: SMTPEncryption.NONE,
        smtp_from_name: 'User',
        smtp_from_email: 'user@example.com',
      };
      
      const result = await service.saveConfig('workspace-1', request);
      expect((result as any).smtp_encryption).toBe(SMTPEncryption.NONE);
    });
  });
  
  describe('validation edge cases', () => {
    it('should reject unsupported provider', async () => {
      const request: any = {
        provider: 'unsupported-provider',
      };
      
      await expect(service.saveConfig('workspace-1', request)).rejects.toThrow('not yet supported');
    });
    
    it('should test connection for invalid Gmail', async () => {
      const request: TestEmailRequest = {
        provider: EmailProvider.GMAIL,
        gmail_email: 'invalid',
      };
      
      const result = await service.testConnection(request);
      expect(result.success).toBe(false);
    });
    
    it('should test connection for invalid SMTP', async () => {
      const request: TestEmailRequest = {
        provider: EmailProvider.SMTP,
        smtp_host: '',
        smtp_port: 587,
        smtp_username: 'user',
        smtp_password: 'pass',
        smtp_encryption: SMTPEncryption.STARTTLS,
        smtp_from_name: 'User',
        smtp_from_email: 'user@example.com',
      };
      
      const result = await service.testConnection(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP host is required');
    });
    
    it('should test connection for invalid SendGrid', async () => {
      const request: TestEmailRequest = {
        provider: EmailProvider.SENDGRID,
        sendgrid_api_key: 'invalid',
        sendgrid_from_email: 'sender@example.com',
      };
      
      const result = await service.testConnection(request);
      expect(result.success).toBe(false);
    });
  });
  
  describe('decrypted config variations', () => {
    it('should decrypt Gmail config', async () => {
      await service.saveConfig('workspace-1', {
        provider: EmailProvider.GMAIL,
        gmail_email: 'user@gmail.com',
        gmail_credential_id: 'cred-123',
      });
      
      const decrypted = await service.getDecryptedConfig('workspace-1');
      expect(decrypted?.provider).toBe(EmailProvider.GMAIL);
      expect(decrypted?.gmail_email).toBe('user@gmail.com');
    });
    
    it('should decrypt SendGrid config', async () => {
      await service.saveConfig('workspace-1', {
        provider: EmailProvider.SENDGRID,
        sendgrid_api_key: 'SG.1234567890abcdefghijklmnopqrstuvwxyz',
        sendgrid_from_email: 'sender@example.com',
        sendgrid_from_name: 'Sender',
      });
      
      const decrypted = await service.getDecryptedConfig('workspace-1');
      expect(decrypted?.provider).toBe(EmailProvider.SENDGRID);
      expect(decrypted?.sendgrid_api_key).toBe('SG.1234567890abcdefghijklmnopqrstuvwxyz');
    });
  });
});
