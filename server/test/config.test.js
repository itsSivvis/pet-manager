import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('refuses to start in production without JWT_SECRET', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });
  it('refuses short or well-known secrets in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'changeme' })).toThrow(
      /JWT_SECRET/,
    );
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(31) })).toThrow(
      /JWT_SECRET/,
    );
  });
  it('accepts a strong secret in production', () => {
    const c = loadConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'a'.repeat(64),
      CLIENT_URL: 'https://pets.example.com',
    });
    expect(c.isProduction).toBe(true);
    expect(c.clientUrls).toEqual(['https://pets.example.com']);
  });
  it('resolves relative directories to absolute paths (needed by sendFile)', () => {
    const c = loadConfig({ STATIC_DIR: 'client/dist', UPLOAD_DIR: 'data/uploads' });
    expect(c.staticDir.startsWith('/')).toBe(true);
    expect(c.uploadDir.startsWith('/')).toBe(true);
  });
  it('limits API requests per IP generously by default', () => {
    expect(loadConfig({}).apiRateLimit).toBe(1000);
    expect(loadConfig({ API_RATE_LIMIT: '50' }).apiRateLimit).toBe(50);
  });
  it('anonymous mode is off unless explicitly allowed', () => {
    expect(loadConfig({}).allowAnonymousMode).toBe(false);
    expect(loadConfig({ ALLOW_ANONYMOUS_MODE: 'true' }).allowAnonymousMode).toBe(true);
  });
});
