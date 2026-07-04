import { PREVIEW_LARGE_FILE_THRESHOLD_BYTES, PREVIEW_DISPLAY_BYTES } from '../../shared/preview-types';

export interface LargeFilePolicy {
  isTruncated: boolean;
  displayBytes: number;
  totalBytes: number;
}

export function computeLargeFilePolicy(totalBytes: number): LargeFilePolicy {
  if (totalBytes <= PREVIEW_LARGE_FILE_THRESHOLD_BYTES) {
    return { isTruncated: false, displayBytes: totalBytes, totalBytes };
  }
  return { isTruncated: true, displayBytes: PREVIEW_DISPLAY_BYTES, totalBytes };
}

function toMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export function formatTruncationBanner(policy: LargeFilePolicy): string | null {
  if (!policy.isTruncated) return null;
  return `파일이 커서 앞부분만 표시합니다 (전체 ${toMb(policy.totalBytes)}MB 중 ${toMb(policy.displayBytes)}MB)`;
}
