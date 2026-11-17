import { formatBytes, isNewerTag, parseTag } from '../src/lib/releases';

describe('parseTag', () => {
  it('reads v-prefixed and bare tags', () => {
    expect(parseTag('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseTag('1.2.3')).toEqual([1, 2, 3]);
  });

  it('rejects prerelease and junk shapes', () => {
    expect(parseTag('v1.2.3-rc.1')).toBeNull();
    expect(parseTag('latest')).toBeNull();
    expect(parseTag('')).toBeNull();
  });
});

describe('isNewerTag', () => {
  it('compares numerically across every field', () => {
    expect(isNewerTag('v1.0.1', 'v1.0.0')).toBe(true);
    expect(isNewerTag('v1.1.0', 'v1.0.9')).toBe(true);
    expect(isNewerTag('v2.0.0', 'v1.9.9')).toBe(true);
    expect(isNewerTag('v1.0.0', 'v1.0.0')).toBe(false);
    expect(isNewerTag('v1.0.0', 'v1.0.1')).toBe(false);
    expect(isNewerTag('v0.9.9', 'v1.0.0')).toBe(false);
  });

  it('never flags unreadable tags', () => {
    expect(isNewerTag('nonsense', 'v1.0.0')).toBe(false);
    expect(isNewerTag('v1.0.0', 'nonsense')).toBe(false);
  });
});

describe('formatBytes', () => {
  it('scales to human units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(77_146_748)).toBe('73.6 MB');
  });
});
