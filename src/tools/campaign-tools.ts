import { GHLApiClient } from '../clients/ghl-api-client.js';
import { MCPGetCampaignsParams } from '../types/ghl-types.js';

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
 * CampaignTools class for GoHighLevel Campaigns API.
 * Read-only: list campaigns (e.g. to resolve a campaign ID for
 * add_contact_to_campaign in the contact tools).
 */
export class CampaignTools {
  constructor(private ghlClient: GHLApiClient) {}

  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_campaigns',
        description: 'List marketing campaigns for a sub-account (location). Useful to find a campaignId to enroll contacts into.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Sub-account/location ID (defaults to configured location)' },
            status: { type: 'string', description: "Filter by status (e.g. 'draft', 'active', 'paused', 'archived')" }
          },
          required: []
        }
      }
    ];
  }

  async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'get_campaigns':
        return this.getCampaigns(args as MCPGetCampaignsParams);
      default:
        throw new Error(`Unknown campaign tool: ${name}`);
    }
  }

  private async getCampaigns(params: MCPGetCampaignsParams = {}): Promise<any> {
    const response = await this.ghlClient.getCampaigns(params);
    if (!response.success || !response.data) {
      throw new Error(`Failed to get campaigns: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }
}
