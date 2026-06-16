import { createMocks } from 'node-mocks-http';
import { GET } from './route';

describe('GET /api/status', () => {
  it('returns HTTP 200 status code', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('returns application/json content type', async () => {
    const response = await GET();
    const contentType = response.headers.get('content-type');
    expect(contentType).toContain('application/json');
  });

  it('returns a JSON body with a status field', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });

  it('returns a non-empty status string', async () => {
    const response = await GET();
    const body = await response.json();
    expect(typeof body.status).toBe('string');
    expect(body.status.length).toBeGreaterThan(0);
  });

  it('returns a timestamp field in ISO 8601 format', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body).toHaveProperty('timestamp');
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
    expect(body.timestamp).toMatch(iso8601Regex);
  });

  it('returns a timestamp representing UTC time', async () => {
    const response = await GET();
    const body = await response.json();
    const utcSuffixRegex = /(Z|[+-]00:00)$/;
    expect(body.timestamp).toMatch(utcSuffixRegex);
  });

  it('returns an uptime field as a non-negative number', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body).toHaveProperty('uptime');
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('returns a version field as a non-empty string', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body).toHaveProperty('version');
    expect(typeof body.version).toBe('string');
    expect(body.version.length).toBeGreaterThan(0);
  });

  it('second timestamp is greater than or equal to first timestamp on sequential requests', async () => {
    const firstResponse = await GET();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const secondResponse = await GET();

    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();

    const firstTime = new Date(firstBody.timestamp).getTime();
    const secondTime = new Date(secondBody.timestamp).getTime();

    expect(secondTime).toBeGreaterThanOrEqual(firstTime);
  });

  it('status field is consistent across multiple successive calls', async () => {
    const firstResponse = await GET();
    const secondResponse = await GET();

    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();

    expect(firstBody.status).toBe(secondBody.status);
  });

  it('returns a valid JSON body that can be parsed without errors', async () => {
    const response = await GET();
    const parseBody = async () => await response.json();
    await expect(parseBody()).resolves.not.toThrow();
  });

  it('response body does not contain unexpected null fields for required keys', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.status).not.toBeNull();
    expect(body.timestamp).not.toBeNull();
  });
});