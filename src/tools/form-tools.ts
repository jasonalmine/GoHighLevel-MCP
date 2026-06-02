import { GHLApiClient } from '../clients/ghl-api-client.js';
import {
  MCPGetFormsParams,
  MCPGetFormSubmissionsParams
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
 * FormTools class for GoHighLevel Forms API endpoints.
 * Read-only: list forms and read submissions.
 * (Custom-file upload to submissions requires multipart binary and is not
 * exposed over the MCP text interface.)
 */
export class FormTools {
  constructor(private ghlClient: GHLApiClient) {}

  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_forms',
        description: 'List forms for a sub-account (location). Uses the default location if not provided.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Sub-account/location ID (defaults to configured location)' },
            limit: { type: 'number', description: 'Max forms to return' },
            skip: { type: 'number', description: 'Number of forms to skip', minimum: 0 },
            type: { type: 'string', description: 'Filter by form type' }
          },
          required: []
        }
      },
      {
        name: 'get_form_submissions',
        description: 'Get form submissions for a location, optionally filtered by form and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Sub-account/location ID (defaults to configured location)' },
            formId: { type: 'string', description: 'Restrict to submissions for a single form' },
            q: { type: 'string', description: 'Free-text search (e.g. contact name/email)' },
            page: { type: 'number', description: 'Page number (1-indexed)', minimum: 1 },
            limit: { type: 'number', description: 'Results per page' },
            startAt: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
            endAt: { type: 'string', description: 'End date filter (YYYY-MM-DD)' }
          },
          required: []
        }
      }
    ];
  }

  async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'get_forms':
        return this.getForms(args as MCPGetFormsParams);
      case 'get_form_submissions':
        return this.getFormSubmissions(args as MCPGetFormSubmissionsParams);
      default:
        throw new Error(`Unknown form tool: ${name}`);
    }
  }

  private async getForms(params: MCPGetFormsParams = {}): Promise<any> {
    const response = await this.ghlClient.getForms(params);
    if (!response.success || !response.data) {
      throw new Error(`Failed to get forms: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }

  private async getFormSubmissions(params: MCPGetFormSubmissionsParams = {}): Promise<any> {
    const response = await this.ghlClient.getFormSubmissions(params);
    if (!response.success || !response.data) {
      throw new Error(`Failed to get form submissions: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }
}
