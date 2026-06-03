/**
 * Unit Tests for GHL API Client
 *
 * The client takes an explicit GHLConfig (env-based defaults live in the server
 * entry points, not here). axios is mocked with a callable instance so the
 * response interceptor — which holds the 429 retry and error formatting — can be
 * captured and exercised directly.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('axios', () => {
  const create = jest.fn();
  return {
    __esModule: true,
    default: { create, isAxiosError: jest.fn() }
  };
});

import axios from 'axios';
import { GHLApiClient } from '../../src/clients/ghl-api-client.js';

const mockedCreate = (axios as any).create as jest.Mock;

const TEST_CONFIG = {
  accessToken: 'test_api_key_123',
  baseUrl: 'https://test.leadconnectorhq.com',
  version: '2021-07-28',
  locationId: 'test_location_123'
};

function makeMockInstance(): any {
  // Callable so the retry path (`this.axiosInstance(config)`) works.
  const instance: any = jest.fn();
  instance.get = jest.fn();
  instance.post = jest.fn();
  instance.put = jest.fn();
  instance.delete = jest.fn();
  instance.patch = jest.fn();
  instance.defaults = { headers: {} };
  instance.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  };
  return instance;
}

describe('GHLApiClient', () => {
  let mockInstance: any;
  let client: GHLApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Tiny backoff so the retry test runs fast (read at construction time).
    process.env.GHL_RETRY_BASE_DELAY_MS = '1';
    process.env.GHL_MAX_RETRIES = '3';

    mockInstance = makeMockInstance();
    mockedCreate.mockReturnValue(mockInstance);
    client = new GHLApiClient({ ...TEST_CONFIG });
  });

  // The onRejected handler the client registered on the response interceptor.
  const getResponseErrorHandler = (): ((error: any) => Promise<any>) =>
    mockInstance.interceptors.response.use.mock.calls[0][1];

  describe('constructor', () => {
    it('creates an axios instance with the configured baseURL and auth header', () => {
      expect(mockedCreate).toHaveBeenCalledTimes(1);
      const args = mockedCreate.mock.calls[0][0];
      expect(args.baseURL).toBe(TEST_CONFIG.baseUrl);
      expect(args.headers.Authorization).toBe(`Bearer ${TEST_CONFIG.accessToken}`);
      expect(args.headers.Version).toBe(TEST_CONFIG.version);
    });

    it('registers request and response interceptors', () => {
      expect(mockInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(mockInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConfig', () => {
    it('returns a copy of the current configuration', () => {
      expect(client.getConfig()).toEqual(TEST_CONFIG);
    });
  });

  describe('updateAccessToken', () => {
    it('updates the token in config and on the axios default headers', () => {
      client.updateAccessToken('new_token_456');

      expect(client.getConfig().accessToken).toBe('new_token_456');
      expect(mockInstance.defaults.headers.Authorization).toBe('Bearer new_token_456');
    });
  });

  describe('testConnection', () => {
    it('hits the location endpoint and reports connected', async () => {
      mockInstance.get.mockResolvedValueOnce({ data: {}, status: 200 });

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ status: 'connected', locationId: TEST_CONFIG.locationId });
      expect(mockInstance.get).toHaveBeenCalledWith(`/locations/${TEST_CONFIG.locationId}`);
    });

    it('throws a descriptive error on failure', async () => {
      mockInstance.get.mockRejectedValueOnce(new Error('boom'));
      await expect(client.testConnection()).rejects.toThrow('GHL API connection test failed');
    });
  });

  describe('contact methods', () => {
    it('createContact posts to /contacts/ and unwraps the contact', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: { contact: { id: 'contact_123', email: 'john@example.com' } }
      });

      const result = await client.createContact({ email: 'john@example.com' });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('contact_123');
      const [url, payload] = mockInstance.post.mock.calls[0];
      expect(url).toBe('/contacts/');
      // locationId is injected from config when not supplied
      expect(payload.locationId).toBe(TEST_CONFIG.locationId);
    });

    it('getContact gets /contacts/{id} and unwraps the contact', async () => {
      mockInstance.get.mockResolvedValueOnce({
        data: { contact: { id: 'contact_123' } }
      });

      const result = await client.getContact('contact_123');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('contact_123');
      expect(mockInstance.get).toHaveBeenCalledWith('/contacts/contact_123');
    });
  });

  describe('response interceptor: error formatting', () => {
    it('formats API errors as "GHL API Error (status): message"', async () => {
      const onRejected = getResponseErrorHandler();
      const err = {
        config: { url: '/contacts/' },
        response: { status: 400, data: { message: 'Invalid email' } }
      };

      await expect(onRejected(err)).rejects.toThrow('GHL API Error (400): Invalid email');
    });
  });

  describe('response interceptor: 429 retry', () => {
    it('retries a rate-limited request and succeeds', async () => {
      const onRejected = getResponseErrorHandler();
      mockInstance.mockResolvedValueOnce({ data: 'ok' }); // the retried call

      const err: any = {
        config: { url: '/contacts/' },
        response: { status: 429, headers: {} }
      };

      const result = await onRejected(err);

      expect(result).toEqual({ data: 'ok' });
      expect(mockInstance).toHaveBeenCalledWith(err.config); // request was re-issued
      expect(err.config._retryCount).toBe(1);
    });

    it('gives up after maxRetries and rejects with a formatted error', async () => {
      const onRejected = getResponseErrorHandler();
      const err: any = {
        config: { url: '/contacts/', _retryCount: 3 }, // already at max (3)
        response: { status: 429, headers: {}, data: { message: 'Too Many Requests' } }
      };

      await expect(onRejected(err)).rejects.toThrow('GHL API Error (429)');
      expect(mockInstance).not.toHaveBeenCalled(); // no further retry
    });
  });
});
