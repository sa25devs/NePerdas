import type { ExtractedLabel, LabelExtractor } from './types';

/**
 * STUB — not wired in v1.
 *
 * Future paid option: call Gemini via Firebase AI Logic + App Check.
 * This incurs cloud usage / billing. Keep the API key on the Firebase
 * proxy; never embed a Google AI Studio key in the app.
 *
 * To enable later:
 * 1. Add @react-native-firebase/app, /ai, /app-check
 * 2. Configure Firebase + App Check
 * 3. Implement extract() below
 * 4. Return this from getLabelExtractor() instead of OnDeviceOcrExtractor
 */
export class FirebaseAiExtractor implements LabelExtractor {
  async extract(_imageUri: string): Promise<ExtractedLabel> {
    throw new Error(
      'FirebaseAiExtractor is not implemented. v1 uses on-device OCR only.',
    );
  }
}
