import { OnDeviceOcrExtractor } from './OnDeviceOcrExtractor';
import type { LabelExtractor } from './types';

const onDevice = new OnDeviceOcrExtractor();

/**
 * Returns the active label extractor.
 *
 * v1: always on-device OCR (free, offline).
 *
 * Later (optional, not cost-free): swap in a FirebaseAiExtractor via
 * Firebase AI Logic + App Check. That path uses Gemini cloud inference
 * and incurs usage/billing — treat as a paid upgrade, not the default.
 *
 * Example future switch:
 *   if (USE_FIREBASE_AI) return new FirebaseAiExtractor();
 */
export function getLabelExtractor(): LabelExtractor {
  return onDevice;
}
