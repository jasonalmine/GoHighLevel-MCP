/**
 * Unit Tests for Contact Tools
 * Tests the contact management MCP tools. ContactTools.executeTool returns the
 * raw GHL object from the underlying client (no { success, message } envelope).
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ContactTools } from '../../src/tools/contact-tools.js';
import { MockGHLApiClient, mockContact } from '../mocks/ghl-api-client.mock.js';

const CORE_CONTACT_TOOLS = [
  'create_contact',
  'search_contacts',
  'get_contact',
  'update_contact',
  'add_contact_tags',
  'remove_contact_tags',
  'delete_contact'
];

describe('ContactTools', () => {
  let contactTools: ContactTools;
  let mockGhlClient: MockGHLApiClient;

  beforeEach(() => {
    mockGhlClient = new MockGHLApiClient();
    contactTools = new ContactTools(mockGhlClient as any);
  });

  describe('getToolDefinitions', () => {
    it('should return all contact tool definitions', () => {
      const tools = contactTools.getToolDefinitions();
      expect(tools).toHaveLength(31);

      const toolNames = tools.map(tool => tool.name);
      expect(toolNames).toEqual(expect.arrayContaining(CORE_CONTACT_TOOLS));
    });

    it('should have proper schema definitions for all tools', () => {
      const tools = contactTools.getToolDefinitions();

      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe('executeTool', () => {
    it('should route tool calls correctly', async () => {
      const createSpy = jest.spyOn(contactTools as any, 'createContact');
      const getSpy = jest.spyOn(contactTools as any, 'getContact');

      await contactTools.executeTool('create_contact', { email: 'test@example.com' });
      await contactTools.executeTool('get_contact', { contactId: 'contact_123' });

      expect(createSpy).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(getSpy).toHaveBeenCalledWith('contact_123');
    });

    it('should throw error for unknown tool', async () => {
      await expect(
        contactTools.executeTool('unknown_tool', {})
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('create_contact', () => {
    it('should create contact successfully', async () => {
      const contactData = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '+1-555-987-6543'
      };

      const result = await contactTools.executeTool('create_contact', contactData);

      expect(result.id).toBeDefined();
      expect(result.email).toBe(contactData.email);
    });

    it('should propagate API errors from the client', async () => {
      const mockError = new Error('GHL API Error (400): Invalid email');
      jest.spyOn(mockGhlClient, 'createContact').mockRejectedValueOnce(mockError);

      await expect(
        contactTools.executeTool('create_contact', { email: 'invalid-email' })
      ).rejects.toThrow('Invalid email');
    });

    it('should forward provided fields and the configured location to the client', async () => {
      const spy = jest.spyOn(mockGhlClient, 'createContact');

      await contactTools.executeTool('create_contact', {
        firstName: 'John',
        email: 'john@example.com'
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com',
          firstName: 'John',
          locationId: 'test_location_123'
        })
      );
    });
  });

  describe('search_contacts', () => {
    it('should search contacts successfully', async () => {
      const result = await contactTools.executeTool('search_contacts', {
        query: 'John Doe',
        limit: 10
      });

      expect(result.contacts).toBeDefined();
      expect(Array.isArray(result.contacts)).toBe(true);
      expect(result.total).toBeDefined();
    });

    it('should forward the query to the client', async () => {
      const spy = jest.spyOn(mockGhlClient, 'searchContacts');

      await contactTools.executeTool('search_contacts', { query: 'test' });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'test' })
      );
    });

    it('should handle search with email filter', async () => {
      const result = await contactTools.executeTool('search_contacts', {
        email: 'john@example.com'
      });

      expect(result.contacts).toBeDefined();
    });
  });

  describe('get_contact', () => {
    it('should get contact by ID successfully', async () => {
      const result = await contactTools.executeTool('get_contact', {
        contactId: 'contact_123'
      });

      expect(result.id).toBe('contact_123');
    });

    it('should propagate not-found errors', async () => {
      await expect(
        contactTools.executeTool('get_contact', { contactId: 'not_found' })
      ).rejects.toThrow('Contact not found');
    });
  });

  describe('update_contact', () => {
    it('should update contact successfully', async () => {
      const result = await contactTools.executeTool('update_contact', {
        contactId: 'contact_123',
        firstName: 'Updated',
        lastName: 'Name'
      });

      expect(result.firstName).toBe('Updated');
    });

    it('should handle partial updates', async () => {
      const spy = jest.spyOn(mockGhlClient, 'updateContact');

      await contactTools.executeTool('update_contact', {
        contactId: 'contact_123',
        email: 'newemail@example.com'
      });

      expect(spy).toHaveBeenCalledWith('contact_123', {
        email: 'newemail@example.com'
      });
    });
  });

  describe('add_contact_tags', () => {
    it('should add tags successfully', async () => {
      const result = await contactTools.executeTool('add_contact_tags', {
        contactId: 'contact_123',
        tags: ['vip', 'premium']
      });

      expect(result.tags).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('should validate required parameters', async () => {
      await expect(
        contactTools.executeTool('add_contact_tags', { contactId: 'contact_123' })
      ).rejects.toThrow();
    });
  });

  describe('remove_contact_tags', () => {
    it('should remove tags successfully', async () => {
      const result = await contactTools.executeTool('remove_contact_tags', {
        contactId: 'contact_123',
        tags: ['old-tag']
      });

      expect(result.tags).toBeDefined();
    });

    it('should handle empty tags array', async () => {
      const spy = jest.spyOn(mockGhlClient, 'removeContactTags');

      await contactTools.executeTool('remove_contact_tags', {
        contactId: 'contact_123',
        tags: []
      });

      expect(spy).toHaveBeenCalledWith('contact_123', []);
    });
  });

  describe('delete_contact', () => {
    it('should delete contact successfully', async () => {
      const result = await contactTools.executeTool('delete_contact', {
        contactId: 'contact_123'
      });

      expect(result.succeded).toBe(true);
    });

    it('should propagate deletion errors', async () => {
      const mockError = new Error('GHL API Error (404): Contact not found');
      jest.spyOn(mockGhlClient, 'deleteContact').mockRejectedValueOnce(mockError);

      await expect(
        contactTools.executeTool('delete_contact', { contactId: 'not_found' })
      ).rejects.toThrow('Contact not found');
    });
  });

  describe('error handling', () => {
    it('should propagate API client errors', async () => {
      const mockError = new Error('Network error');
      jest.spyOn(mockGhlClient, 'createContact').mockRejectedValueOnce(mockError);

      await expect(
        contactTools.executeTool('create_contact', { email: 'test@example.com' })
      ).rejects.toThrow('Network error');
    });
  });

  describe('input validation', () => {
    it('should expose an email property on create_contact', () => {
      const tools = contactTools.getToolDefinitions();
      const createContactTool = tools.find(tool => tool.name === 'create_contact');

      expect(createContactTool?.inputSchema.properties.email.type).toBe('string');
    });

    it('should require email on create_contact', () => {
      const tools = contactTools.getToolDefinitions();
      const createContactTool = tools.find(tool => tool.name === 'create_contact');

      expect(createContactTool?.inputSchema.required).toEqual(['email']);
    });
  });
});
