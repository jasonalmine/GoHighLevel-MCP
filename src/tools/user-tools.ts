import { GHLApiClient } from '../clients/ghl-api-client.js';
import {
  MCPGetUsersByLocationParams,
  MCPGetUserParams,
  MCPCreateUserParams,
  MCPUpdateUserParams,
  MCPDeleteUserParams,
  MCPSearchUsersParams
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
 * UserTools class for GoHighLevel Users API endpoints.
 * Manage staff/agency users: list, get, search, create, update, delete.
 * Note: create/update/delete require a token with users.write scope
 * (usually agency-level); a location PIT key may only support reads.
 */
export class UserTools {
  constructor(private ghlClient: GHLApiClient) {}

  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_users_by_location',
        description: 'List all users belonging to a sub-account (location). Uses the default location if not provided.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Sub-account/location ID (defaults to configured location)' }
          },
          required: []
        }
      },
      {
        name: 'get_user',
        description: 'Get a single user by their user ID.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'The user ID to retrieve' }
          },
          required: ['userId']
        }
      },
      {
        name: 'search_users',
        description: 'Search users across a company/agency with optional filters. Requires companyId for agency-wide search.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: { type: 'string', description: 'Agency/company ID to search within' },
            locationId: { type: 'string', description: 'Restrict to a specific location' },
            query: { type: 'string', description: 'Free-text search (name/email)' },
            skip: { type: 'number', description: 'Number of results to skip', minimum: 0 },
            limit: { type: 'number', description: 'Max results to return' },
            type: { type: 'string', description: "Filter by user type ('account' or 'agency')" },
            role: { type: 'string', description: "Filter by role ('admin' or 'user')" },
            sort: { type: 'string', description: 'Field to sort by' },
            sortDirection: { type: 'string', description: 'asc or desc', enum: ['asc', 'desc'] }
          },
          required: []
        }
      },
      {
        name: 'create_user',
        description: 'Create a new user. Requires users.write scope (agency-level). companyId, type and role typically required by GHL.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: { type: 'string', description: 'Agency/company ID' },
            firstName: { type: 'string', description: 'First name' },
            lastName: { type: 'string', description: 'Last name' },
            email: { type: 'string', description: 'Email address (login)' },
            password: { type: 'string', description: 'Initial password' },
            phone: { type: 'string', description: 'Phone number' },
            type: { type: 'string', description: "User type: 'account' or 'agency'", enum: ['account', 'agency'] },
            role: { type: 'string', description: "Role: 'admin' or 'user'", enum: ['admin', 'user'] },
            locationIds: { type: 'array', items: { type: 'string' }, description: 'Locations the user can access' },
            permissions: { type: 'object', description: 'Permission flags map' }
          },
          required: ['firstName', 'lastName', 'email']
        }
      },
      {
        name: 'update_user',
        description: 'Update an existing user. Pass userId plus any fields to change.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'The user ID to update' },
            firstName: { type: 'string', description: 'First name' },
            lastName: { type: 'string', description: 'Last name' },
            email: { type: 'string', description: 'Email address' },
            phone: { type: 'string', description: 'Phone number' },
            type: { type: 'string', description: "User type: 'account' or 'agency'" },
            role: { type: 'string', description: "Role: 'admin' or 'user'" },
            locationIds: { type: 'array', items: { type: 'string' }, description: 'Locations the user can access' },
            permissions: { type: 'object', description: 'Permission flags map' }
          },
          required: ['userId']
        }
      },
      {
        name: 'delete_user',
        description: 'Delete a user by their user ID. Requires users.write scope.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'The user ID to delete' }
          },
          required: ['userId']
        }
      }
    ];
  }

  async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'get_users_by_location':
        return this.getUsersByLocation(args as MCPGetUsersByLocationParams);
      case 'get_user':
        return this.getUser(args as MCPGetUserParams);
      case 'search_users':
        return this.searchUsers(args as MCPSearchUsersParams);
      case 'create_user':
        return this.createUser(args as MCPCreateUserParams);
      case 'update_user':
        return this.updateUser(args as MCPUpdateUserParams);
      case 'delete_user':
        return this.deleteUser(args as MCPDeleteUserParams);
      default:
        throw new Error(`Unknown user tool: ${name}`);
    }
  }

  private async getUsersByLocation(params: MCPGetUsersByLocationParams = {}): Promise<any> {
    const response = await this.ghlClient.getUsersByLocation(params.locationId);
    if (!response.success || !response.data) {
      throw new Error(`Failed to get users: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }

  private async getUser(params: MCPGetUserParams): Promise<any> {
    const response = await this.ghlClient.getUser(params.userId);
    if (!response.success || !response.data) {
      throw new Error(`Failed to get user: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }

  private async searchUsers(params: MCPSearchUsersParams): Promise<any> {
    const response = await this.ghlClient.searchUsers(params);
    if (!response.success || !response.data) {
      throw new Error(`Failed to search users: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }

  private async createUser(params: MCPCreateUserParams): Promise<any> {
    const response = await this.ghlClient.createUser(params);
    if (!response.success || !response.data) {
      throw new Error(`Failed to create user: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }

  private async updateUser(params: MCPUpdateUserParams): Promise<any> {
    const { userId, ...updates } = params;
    const response = await this.ghlClient.updateUser(userId, updates);
    if (!response.success || !response.data) {
      throw new Error(`Failed to update user: ${response.error?.message || 'Unknown error'}`);
    }
    return response.data;
  }

  private async deleteUser(params: MCPDeleteUserParams): Promise<any> {
    const response = await this.ghlClient.deleteUser(params.userId);
    if (!response.success) {
      throw new Error(`Failed to delete user: ${response.error?.message || 'Unknown error'}`);
    }
    return { success: true, message: `User ${params.userId} deleted` };
  }
}
