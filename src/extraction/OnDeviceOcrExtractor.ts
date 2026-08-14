import { isSupported, recognizeText } from 'expo-mlkit-ocr';

import { parseLabelText } from './parseLabel';
import type { ExtractedLabel, LabelExtractor } from './types';

/**
 * On-device OCR via ML Kit / Apple Vision.
 * Free and offline — no API key required.
 */
export class OnDeviceOcrExtractor implements LabelExtractor {
  async extract(imageUri: string): Promise<ExtractedLabel> {
    if (!isSupported()) {
      return {
        name: null,
        expirationDate: null,
        rawText: '',
        source: 'on-device-ocr',
      };
    }

    try {
      const result = await recognizeText(imageUri);
      const rawText = result.text?.trim() ?? '';
      const parsed = parseLabelText(rawText);
      return {
        name: parsed.name,
        expirationDate: parsed.expirationDate,
        rawText,
        source: 'on-device-ocr',
      };
    } catch {
      return {
        name: null,
        expirationDate: null,
        rawText: '',
        source: 'on-device-ocr',
      };
    }
  }
}
