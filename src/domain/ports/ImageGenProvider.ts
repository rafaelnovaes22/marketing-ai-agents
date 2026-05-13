// Port: Image Generation Provider
// Imagen 4 (Google) + Ideogram v2 implementam.

export interface ImageGenInput {
  prompt: string;
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
  size: '1024x1024' | '1080x1080' | '1080x1350' | '1080x1920';
  brandColors?: string[];        // Para enforcement via prompt
  brandFont?: string;
  hasTextOverlay?: boolean;
  textOverlayContent?: string;
  metadata?: Record<string, string>;
}

export interface ImageGenOutput {
  imageUrl: string;              // URL ou data URI
  imageBase64?: string;
  costBrl: number;
  latencyMs: number;
  providerName: 'imagen_4' | 'ideogram_v2';
  modelVersion: string;
}

export interface ImageGenProvider {
  generate(input: ImageGenInput): Promise<ImageGenOutput>;
  providerName(): 'imagen_4' | 'ideogram_v2';
}
