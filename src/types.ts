export type DocumentType = 'PAN_PHOTO' | 'PAN_SIGNATURE' | 'AADHAAR_COPY';

export interface DocumentSpecification {
  id: DocumentType;
  name: string;
  subLabel: string;
  dimensionsText: string;
  maxSizeKB: number;
  recommendedDpi: number;
  widthCm: number;
  heightCm: number;
  aspectRatio: number; // width / height
}

export interface ImageFile {
  name: string;
  dataUrl: string;
  size: number; // bytes
  type: string; // e.g. image/jpeg, image/png
}

export interface CropArea {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
}

export interface ProcessingSettings {
  documentType: DocumentType;
  customWidthCm: number;
  customHeightCm: number;
  targetSizeKB: number;
  dpi: number;
  format: 'jpeg' | 'png' | 'pdf';
  keepAspectRatio: boolean;
  aadhaarLayout: 'vertical' | 'horizontal';
}

export interface ImageAdjustment {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  brightness: number;
  contrast: number;
  colorMode: 'original' | 'grayscale' | 'monochrome';
}

