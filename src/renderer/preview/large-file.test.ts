import { describe, expect, it } from 'vitest';
import { computeLargeFilePolicy, formatTruncationBanner } from './large-file';

describe('computeLargeFilePolicy', () => {
  it('does not truncate a file at or under the 10MB threshold', () => {
    const policy = computeLargeFilePolicy(5 * 1024 * 1024);
    expect(policy.isTruncated).toBe(false);
    expect(policy.displayBytes).toBe(5 * 1024 * 1024);
  });

  it('truncates to the 1MB display size for a file over the threshold', () => {
    const policy = computeLargeFilePolicy(50 * 1024 * 1024);
    expect(policy.isTruncated).toBe(true);
    expect(policy.displayBytes).toBe(1024 * 1024);
    expect(policy.totalBytes).toBe(50 * 1024 * 1024);
  });
});

describe('formatTruncationBanner', () => {
  it('returns null when not truncated', () => {
    expect(formatTruncationBanner(computeLargeFilePolicy(100))).toBeNull();
  });

  it('reports total and shown size in MB when truncated', () => {
    const banner = formatTruncationBanner(computeLargeFilePolicy(50 * 1024 * 1024));
    expect(banner).toContain('50.0MB');
    expect(banner).toContain('1.0MB');
  });
});
