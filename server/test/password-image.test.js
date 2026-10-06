import { describe, it, expect } from 'vitest';
import { checkPasswordPolicy } from '../src/lib/password.js';
import { detectImageType } from '../src/lib/image.js';

describe('checkPasswordPolicy', () => {
  it('enforces length limits', () => {
    expect(checkPasswordPolicy('short')).toBe('PASSWORD_TOO_SHORT');
    expect(checkPasswordPolicy('ä'.repeat(40))).toBe('PASSWORD_TOO_LONG'); // 80 bytes
    expect(checkPasswordPolicy('a sensible passphrase')).toBeNull();
  });
  it('rejects trivial passwords', () => {
    expect(checkPasswordPolicy('aaaaaaaaaaaa')).toBe('PASSWORD_TOO_WEAK');
    expect(checkPasswordPolicy('me@example.com', { email: 'ME@example.com' })).toBe(
      'PASSWORD_EQUALS_EMAIL',
    );
  });
});

describe('detectImageType', () => {
  const pad = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);
  it('detects real image signatures', () => {
    expect(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe('jpg');
    expect(detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe('png');
    expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'binary'))?.ext).toBe('webp');
  });
  it('rejects HTML/SVG disguised as images', () => {
    expect(
      detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')),
    ).toBeNull();
    expect(detectImageType(Buffer.from('<html><body>hi</body></html>'))).toBeNull();
  });
});
