import { jsPDF } from 'jspdf';
import { ImageAdjustment } from '../types';

// Helper to convert Canvas to Blob
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas conversion failed'));
      }
    }, type, quality);
  });
}

/**
 * Injects 200 DPI (or any other DPI value) metadata directly into the JFIF segment of a JPEG ArrayBuffer.
 * This ensures official upload portals like NSDL, UTIITSL validate the DPI requirement correctly.
 */
export function changeDpiInJpeg(arrayBuffer: ArrayBuffer, dpi: number): ArrayBuffer {
  const view = new DataView(arrayBuffer);
  if (view.getUint16(0) !== 0xFFD8) {
    // Not a valid JPEG
    return arrayBuffer;
  }
  
  // Look for the APP0 marker at offset 2
  if (view.getUint16(2) === 0xFFE0 && view.getUint32(6) === 0x4A464946 && view.getUint8(10) === 0x00) {
    // APP0 JFIF block found. We can patch Units (offset 13), Xdensity (offset 14-15), and Ydensity (offset 16-17)
    const copy = arrayBuffer.slice(0);
    const copyView = new DataView(copy);
    copyView.setUint8(13, 1); // 1 = Dots per Inch (DPI)
    copyView.setUint16(14, dpi); // X resolution
    copyView.setUint16(16, dpi); // Y resolution
    return copy;
  } else {
    // APP0 JFIF marker is absent. We inject a fresh 18-byte APP0 block right after the SOI (FF D8) marker.
    const srcBytes = new Uint8Array(arrayBuffer);
    const dstBytes = new Uint8Array(arrayBuffer.byteLength + 18);
    
    // Copy SOI (FF D8)
    dstBytes[0] = srcBytes[0];
    dstBytes[1] = srcBytes[1];
    
    // Inject APP0 Header
    dstBytes[2] = 0xFF;
    dstBytes[3] = 0xE0;
    dstBytes[4] = 0x00;
    dstBytes[5] = 0x10; // APP0 segment length = 16 bytes
    dstBytes[6] = 0x4A; // J
    dstBytes[7] = 0x46; // F
    dstBytes[8] = 0x49; // I
    dstBytes[9] = 0x46; // F
    dstBytes[10] = 0x00; // \0
    dstBytes[11] = 0x01; // Major version 1
    dstBytes[12] = 0x01; // Minor version 1
    dstBytes[13] = 0x01; // Units: 1 = DPI
    
    dstBytes[14] = (dpi >> 8) & 0xFF; // Xdensity High
    dstBytes[15] = dpi & 0xFF;        // Xdensity Low
    dstBytes[16] = (dpi >> 8) & 0xFF; // Ydensity High
    dstBytes[17] = dpi & 0xFF;        // Ydensity Low
    
    // Copy the remaining bytes of original JPEG starting from offset 2
    dstBytes.set(srcBytes.subarray(2), 18);
    
    return dstBytes.buffer;
  }
}

/**
 * Smart compressor that performs JPEG quality compression in a loop to ensure the final
 * output file size stays strictly under the target KB limit without losing text readability.
 */
export async function compressImageToLimit(
  canvas: HTMLCanvasElement,
  targetSizeKB: number,
  dpi: number,
  format: 'jpeg' | 'png'
): Promise<Blob> {
  const targetBytes = targetSizeKB * 1024;
  
  if (format === 'png') {
    // PNG is lossless, so we compress by adjusting image dimensions in steps of 5%
    let scale = 1.0;
    let currentCanvas = canvas;
    let blob = await canvasToBlob(currentCanvas, 'image/png');
    
    while (blob.size > targetBytes && scale > 0.15) {
      scale -= 0.05;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = Math.round(canvas.width * scale);
      tempCanvas.height = Math.round(canvas.height * scale);
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        currentCanvas = tempCanvas;
        blob = await canvasToBlob(currentCanvas, 'image/png');
      }
    }
    return blob;
  } else {
    // JPEG Smart Compression
    let quality = 0.95;
    let scale = 1.0;
    let currentCanvas = canvas;
    
    let blob = await canvasToBlob(currentCanvas, 'image/jpeg', quality);
    
    // Phase 1: Keep original dimension, reduce JPEG quality factor incrementally
    while (blob.size > targetBytes && quality > 0.15) {
      quality -= 0.05;
      blob = await canvasToBlob(currentCanvas, 'image/jpeg', quality);
    }
    
    // Phase 2: If still too large, downscale dimension slightly and repeat quality search
    while (blob.size > targetBytes && scale > 0.2) {
      scale -= 0.05;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = Math.round(canvas.width * scale);
      tempCanvas.height = Math.round(canvas.height * scale);
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        currentCanvas = tempCanvas;
        
        quality = 0.90; // Reset quality to a high point for downscaled canvas
        blob = await canvasToBlob(currentCanvas, 'image/jpeg', quality);
        while (blob.size > targetBytes && quality > 0.15) {
          quality -= 0.05;
          blob = await canvasToBlob(currentCanvas, 'image/jpeg', quality);
        }
      }
    }
    
    // Inject custom DPI metadata into JPEG binary stream
    const arrayBuffer = await blob.arrayBuffer();
    const dpiAdjustedBuffer = changeDpiInJpeg(arrayBuffer, dpi);
    return new Blob([dpiAdjustedBuffer], { type: 'image/jpeg' });
  }
}

/**
 * Helper to draw an image into a card box using specified custom adjustments.
 */
function drawAdjustedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  targetWidthPx: number,
  targetHeightPx: number,
  adjust?: ImageAdjustment
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, targetWidthPx, targetHeightPx);
  ctx.clip();

  // Default to neutral values if no adjustments specified
  const adj = adjust || {
    zoom: 100,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    brightness: 100,
    contrast: 100,
    colorMode: 'original'
  };

  // Translate to the middle of the clipping box so rotation is around the pivot/center
  ctx.translate(x + targetWidthPx / 2, y + targetHeightPx / 2);
  ctx.rotate((adj.rotation * Math.PI) / 180);

  // Apply filters (CSS filter strings on 2D context)
  const filterParts = [];
  if (adj.brightness !== 100) filterParts.push(`brightness(${adj.brightness}%)`);
  if (adj.contrast !== 100) filterParts.push(`contrast(${adj.contrast}%)`);
  if (adj.colorMode === 'grayscale') filterParts.push('grayscale(100%)');
  else if (adj.colorMode === 'monochrome') filterParts.push('grayscale(100%) contrast(250%)');
  
  ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';

  // Calculate scaling to fill target dimensions (cover)
  const imageRatio = img.width / img.height;
  const canvasRatio = targetWidthPx / targetHeightPx;

  let renderWidth = targetWidthPx;
  let renderHeight = targetHeightPx;

  if (imageRatio > canvasRatio) {
    renderWidth = targetHeightPx * imageRatio;
  } else {
    renderHeight = targetWidthPx / imageRatio;
  }

  // Apply user-defined zoom
  const scaleFactor = adj.zoom / 100;
  renderWidth *= scaleFactor;
  renderHeight *= scaleFactor;

  // Since origin is center of target box, draw at offset relative to (-width/2, -height/2)
  ctx.drawImage(
    img,
    -renderWidth / 2 + adj.offsetX,
    -renderHeight / 2 + adj.offsetY,
    renderWidth,
    renderHeight
  );

  ctx.restore();
}

/**
 * Merges Front and Back images of an Aadhaar card or document copy into a single Canvas
 * with clean alignment, background, and a dashed separator line.
 */
export async function mergeFrontAndBack(
  frontDataUrl: string,
  backDataUrl: string,
  layout: 'vertical' | 'horizontal',
  dpi: number,
  frontAdjust?: ImageAdjustment,
  backAdjust?: ImageAdjustment
): Promise<HTMLCanvasElement> {
  const loadImg = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Failed to load image for merging: ' + e));
      img.src = url;
    });
  };

  const [frontImg, backImg] = await Promise.all([
    loadImg(frontDataUrl),
    loadImg(backDataUrl)
  ]);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Aadhaar ID card standard is ~8.5 cm width and ~5.5 cm height
  const pxPerCm = dpi / 2.54;
  const cardWidthCm = 8.5;
  const cardHeightCm = 5.5;
  
  const cardWidthPx = Math.round(cardWidthCm * pxPerCm);
  const cardHeightPx = Math.round(cardHeightCm * pxPerCm);
  const gapPx = Math.round(0.4 * pxPerCm); // ~0.4 cm gap spacer (dashed line in middle)
  
  const outerPaddingPx = Math.round(0.3 * pxPerCm); // Outer borders padding

  if (layout === 'vertical') {
    canvas.width = cardWidthPx + (outerPaddingPx * 2);
    canvas.height = (cardHeightPx * 2) + gapPx + (outerPaddingPx * 2);
    
    // Paint beautiful white clean card stock background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Front
    drawAdjustedImage(ctx, frontImg, outerPaddingPx, outerPaddingPx, cardWidthPx, cardHeightPx, frontAdjust);
    
    // Draw Back
    drawAdjustedImage(ctx, backImg, outerPaddingPx, outerPaddingPx + cardHeightPx + gapPx, cardWidthPx, cardHeightPx, backAdjust);
    
    // Draw subtle, dashed grey separator
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(outerPaddingPx + 10, outerPaddingPx + cardHeightPx + (gapPx / 2));
    ctx.lineTo(canvas.width - outerPaddingPx - 10, outerPaddingPx + cardHeightPx + (gapPx / 2));
    ctx.stroke();
  } else {
    canvas.width = (cardWidthPx * 2) + gapPx + (outerPaddingPx * 2);
    canvas.height = cardHeightPx + (outerPaddingPx * 2);
    
    // Fill background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Front
    drawAdjustedImage(ctx, frontImg, outerPaddingPx, outerPaddingPx, cardWidthPx, cardHeightPx, frontAdjust);
    
    // Draw Back
    drawAdjustedImage(ctx, backImg, outerPaddingPx + cardWidthPx + gapPx, outerPaddingPx, cardWidthPx, cardHeightPx, backAdjust);
    
    // Draw separator
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(outerPaddingPx + cardWidthPx + (gapPx / 2), outerPaddingPx + 10);
    ctx.lineTo(outerPaddingPx + cardWidthPx + (gapPx / 2), canvas.height - outerPaddingPx - 10);
    ctx.stroke();
  }

  return canvas;
}

/**
 * Downloads a canvas as a PDF document matching the visual dimensions and layout exactly.
 */
export function downloadCanvasAsPdf(canvas: HTMLCanvasElement, fileName: string, dpi: number) {
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  
  // Calculate size in Centimeters for PDF format
  const widthCm = canvas.width / (dpi / 2.54);
  const heightCm = canvas.height / (dpi / 2.54);
  
  const pdf = new jsPDF({
    orientation: widthCm > heightCm ? 'landscape' : 'portrait',
    unit: 'cm',
    format: [widthCm, heightCm]
  });
  
  pdf.addImage(imgData, 'JPEG', 0, 0, widthCm, heightCm);
  pdf.save(fileName);
}
