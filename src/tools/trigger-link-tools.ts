import { GHLApiClient } from '../clients/ghl-api-client.js';
import {
  MCPGetTriggerLinksParams,
  MCPSearchTriggerLinksParams,
  MCPGetTriggerLinkParams,
  MCPCreateTriggerLinkParams,
  MCPUpdateTriggerLinkParams,
  MCPDeleteTriggerLinkParams
} from '../types/ghl-types.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * TriggerLinkTools class for GoHighLevel Trigger Links API.
 * Trigger links are trackable redirect links used in emails/SMS that can
 * fire "Link Clicked" workflow triggers. Full CRUD + search.
 */
export class TriggerLinkTools {
  constructor(private ghlClient: GHLApiClient) {}

  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_trigger_links',
        description: 'List all trigger links for a sub-account (location).',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Sub-account/location ID (defaults to configured location)' }
          },
          required: []
        }
      },
      {
        name: 'search_trigger_links',
        description: 'Search trigger links by name with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Sub-account/location ID (defaults to configured location)' },
            query: { type: 'string', description: 'Search text matched against link names' },
            skip: { type: 'number', description: 'Number of results to skip', minimum: 0 },
            limit: { type: 'number', description: 'Max results to return' }
          },
          required: []
        }
      },
      {
        name: 'get_trigger_link',
        description: 'Get a single trigger link by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            linkId: { type: 'string', description: 'The trigger link ID' },
            locationId: { type: 'string', description: 'Sub-account/location ID (defaults to configured location)' }
          },
          required: ['linkId']
        }
      },
      {
        name: 'create_trigger_link',
        description: 'Create a trigger link. Provide a name and the destination URL to redirect to.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Sub-account/location ID (defaults to configured location)' },
            name: { type: 'string', description: 'Display name for the link' },
            redirectTo: { type: 'string', description: 'Destination URL the link redirects to' }
          },
          required: ['name', 'redirectTo']
        }
      },
      {
        name: 'update_trigger_link',
        description: 'Update a trigger link name and/or destination URL.',
        inputSchema: {
          type: 'object',
          properties: {
            linkId: { type: 'string', description: 'The trigger link ID to update' },
            name: { type: 'string', description: 'New display name' },
            redirectTo: { type: 'string', description: 'New destination URL' }
          },
          required: ['linkId']
        }
      },
      {
        name: 'delete_trigger_link',
        description: 'Delete a trigger link by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            linkId: { type: 'string', description: 'The trigger link ID to delete' }
          },
          required: ['linkId']
        }
      }
    ];
  }

  async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'get_trigger_links':
        return this.getTriggerLinks(args as MCPGetTriggerLinksParams);
      case 'search_trigger_links':
        return this.searchTriggerLinks(args as MCPSearchTriggerLinksParams);
      case 'get_trigger_link':
        return this.getTriggerLink(args as MCPGetTriggerLinkParams);
      case 'create_trigger_link':
        return this.createTriggerLink(args as MCPCreateTriggerLinkParams);
      case 'update_trigger_link':
        return this.updateTriggerLink(args as MCPUpdateTriggerLinkParams);
      case 'delete_trigger_link':
        return this.deleteTriggerLink(args as MCPDeleteTriggerLinkParams);
      default:
        throw new Error(`Unknown trigger link tool: ${name}`);
    }
  }

  private async getTriggerLinks(params: MCPGetTriggerLinksParams = {}): Promise<any> {
    const response = await this.ghlClient.getTriggerLinks(params.locationId);
    if (!response.success || !response.data) {
      throw new Error(`Failed to get trigger links: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }

  private async searchTriggerLinks(params: MCPSearchTriggerLinksParams = {}): Promise<any> {
    const response = await this.ghlClient.searchTriggerLinks(params);
    if (!response.success || !response.data) {
      throw new Error(`Failed to search trigger links: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }

  private async getTriggerLink(params: MCPGetTriggerLinkParams): Promise<any> {
    const response = await this.ghlClient.getTriggerLink(params.linkId, params.locationId);
    if (!response.success || !response.data) {
      throw new Error(`Failed to get trigger link: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }

  private async createTriggerLink(params: MCPCreateTriggerLinkParams): Promise<any> {
    const response = await this.ghlClient.createTriggerLink(params);
    if (!response.success || !response.data) {
      throw new Error(`Failed to create trigger link: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }

  private async updateTriggerLink(params: MCPUpdateTriggerLinkParams): Promise<any> {
    const response = await this.ghlClient.updateTriggerLink(params);
    if (!response.success || !response.data) {
      throw new Error(`Failed to update trigger link: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }

  private async deleteTriggerLink(params: MCPDeleteTriggerLinkParams): Promise<any> {
    const response = await this.ghlClient.deleteTriggerLink(params.linkId);
    if (!response.success) {
      throw new Error(`Failed to delete trigger link: ${response.error?.message || 'Unknown error'}`);
    }
    return { success: true, message: `Trigger link ${params.linkId} deleted` };
  }
}
