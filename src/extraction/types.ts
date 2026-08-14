export type ExtractedLabel = {
  name: string | null;
  expirationDate: string | null; // YYYY-MM-DD
  rawText: string;
  source: 'on-device-ocr' | 'firebase-ai';
};

export interface LabelExtractor {
  extract(imageUri: string): Promise<ExtractedLabel>;
}
