import { isSupported, recognizeText } from 'expo-mlkit-ocr';

import { parseLabelText, type OcrLine } from './parseLabel';
import { prepareOcrImages } from './prepareOcrImage';
import type { ExtractedLabel, LabelExtractor } from './types';

type OcrBox = { x?: number; y?: number; width?: number; height?: number };

type OcrResult = {
  text?: string;
  blocks?: Array<{
    text?: string;
    boundingBox?: OcrBox;
    lines?: Array<{
      text?: string;
      boundingBox?: OcrBox;
    }>;
  }>;
};

function linesFrom(result: OcrResult | null): OcrLine[] {
  if (!result) return [];

  const fromBlocks: OcrLine[] = [];
  for (const block of result.blocks ?? []) {
    const blockLines = block.lines ?? [];
    if (blockLines.length > 0) {
      for (const line of blockLines) {
        const text = line.text?.trim();
        if (!text) continue;
        fromBlocks.push({
          text,
          y: line.boundingBox?.y ?? 0,
          height: line.boundingBox?.height ?? 0,
          width: line.boundingBox?.width ?? 0,
        });
      }
    } else if (block.text?.trim()) {
      fromBlocks.push({
        text: block.text.trim(),
        y: block.boundingBox?.y ?? 0,
        height: block.boundingBox?.height ?? 0,
        width: block.boundingBox?.width ?? 0,
      });
    }
  }

  if (fromBlocks.length > 0) return fromBlocks;

  return (result.text ?? '')
    .split(/\r?\n/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, y) => ({ text, y, height: 0, width: 0 }));
}

async function recognizeSafe(uri: string): Promise<OcrResult | null> {
  try {
    return (await recognizeText(uri)) as OcrResult;
  } catch {
    return null;
  }
}

/**
 * On-device OCR via ML Kit / Apple Vision.
 * Free and offline — no API key required, images are not uploaded.
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
      const prepared = await prepareOcrImages(imageUri);
      const [full, crop] = await Promise.all([
        recognizeSafe(prepared.ocrUri),
        prepared.dateCropUri
          ? recognizeSafe(prepared.dateCropUri)
          : Promise.resolve(null),
      ]);
      const lines = [...linesFrom(full), ...linesFrom(crop)];

      const rawText = Array.from(
        new Set(
          lines
            .map((l) => l.text.trim())
            .filter(Boolean)
            .concat(full?.text?.trim() ? [full.text.trim()] : []),
        ),
      ).join('\n');

      const parsed = parseLabelText(rawText, lines);
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
