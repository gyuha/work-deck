// docs/features/preview.md 3.1 draft values: threshold 10MB, show the first 1MB when exceeded.
export const PREVIEW_LARGE_FILE_THRESHOLD_BYTES = 10 * 1024 * 1024;
export const PREVIEW_DISPLAY_BYTES = 1 * 1024 * 1024;

export interface FileContentResult {
  bytes: Uint8Array;
  totalSize: number;
}
