import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Sliders, 
  Download, 
  Settings2, 
  RefreshCw, 
  Scale, 
  FileText, 
  Layers, 
  Sparkles,
  Info,
  CheckCircle,
  HelpCircle,
  RotateCw,
  Sun,
  Contrast,
  Palette
} from 'lucide-react';
import { ImageFile, DocumentType, ProcessingSettings, ImageAdjustment } from '../types';
import { compressImageToLimit, mergeFrontAndBack, downloadCanvasAsPdf } from '../utils/imageUtils';

interface CropperPreviewProps {
  documentType: DocumentType;
  frontFile: ImageFile | null;
  backFile: ImageFile | null;
  singleFile: ImageFile | null;
  settings: ProcessingSettings;
  onUpdateSettings: (settings: Partial<ProcessingSettings>) => void;
}

export default function CropperPreview({
  documentType,
  frontFile,
  backFile,
  singleFile,
  settings,
  onUpdateSettings,
}: CropperPreviewProps) {
  const isAadhaar = documentType === 'AADHAAR_COPY';
  const hasSingle = !!singleFile;
  const hasAadhaar = !!(frontFile && backFile);
  const isReady = isAadhaar ? hasAadhaar : hasSingle;

  // Cropping & Adjustment States
  const [singleAdjust, setSingleAdjust] = useState<ImageAdjustment>({
    zoom: 100,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    brightness: 100,
    contrast: 100,
    colorMode: 'original'
  });

  const [frontAdjust, setFrontAdjust] = useState<ImageAdjustment>({
    zoom: 100,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    brightness: 100,
    contrast: 100,
    colorMode: 'original'
  });

  const [backAdjust, setBackAdjust] = useState<ImageAdjustment>({
    zoom: 100,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    brightness: 100,
    contrast: 100,
    colorMode: 'original'
  });

  const [activeAadhaarTab, setActiveAadhaarTab] = useState<'front' | 'back'>('front');

  const currentAdjust = isAadhaar 
    ? (activeAadhaarTab === 'front' ? frontAdjust : backAdjust)
    : singleAdjust;

  const updateAdjust = (key: keyof ImageAdjustment, value: any) => {
    if (isAadhaar) {
      if (activeAadhaarTab === 'front') {
        setFrontAdjust(prev => ({ ...prev, [key]: value }));
      } else {
        setBackAdjust(prev => ({ ...prev, [key]: value }));
      }
    } else {
      setSingleAdjust(prev => ({ ...prev, [key]: value }));
    }
  };

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedDetails, setProcessedDetails] = useState<{
    fileSizeKB: number;
    widthPx: number;
    heightPx: number;
    dpi: number;
    format: string;
  } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Reset sliders when document type or active file changes
  useEffect(() => {
    const defaultAdjust: ImageAdjustment = {
      zoom: 100,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      brightness: 100,
      contrast: 100,
      colorMode: 'original'
    };
    setSingleAdjust(defaultAdjust);
    setFrontAdjust(defaultAdjust);
    setBackAdjust(defaultAdjust);
    setProcessedDetails(null);
  }, [documentType, singleFile, frontFile, backFile]);

  // Load Image for non-Aadhaar
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!isAadhaar && singleFile) {
      const img = new Image();
      img.onload = () => {
        setImgElement(img);
      };
      img.src = singleFile.dataUrl;
    } else {
      setImgElement(null);
    }
  }, [singleFile, isAadhaar]);

  // Real-time canvas preview rendering
  useEffect(() => {
    if (!isReady) return;

    const renderPreview = async () => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (isAadhaar && frontFile && backFile) {
        // Merge front and back
        try {
          const mergedCanvas = await mergeFrontAndBack(
            frontFile.dataUrl,
            backFile.dataUrl,
            settings.aadhaarLayout,
            settings.dpi,
            frontAdjust,
            backAdjust
          );
          
          canvas.width = mergedCanvas.width;
          canvas.height = mergedCanvas.height;
          ctx.drawImage(mergedCanvas, 0, 0);

          setProcessedDetails({
            fileSizeKB: Math.round((canvas.toDataURL('image/jpeg', 0.85).length * 3) / 4 / 1024),
            widthPx: canvas.width,
            heightPx: canvas.height,
            dpi: settings.dpi,
            format: settings.format,
          });
        } catch (error) {
          console.error('Error rendering Aadhaar merge:', error);
        }
      } else if (imgElement) {
        // Calculate crop-scale logic
        // Standard physical specifications -> convert to pixels at target DPI
        const pxPerCm = settings.dpi / 2.54;
        const targetWidthPx = Math.round(settings.customWidthCm * pxPerCm);
        const targetHeightPx = Math.round(settings.customHeightCm * pxPerCm);

        canvas.width = targetWidthPx;
        canvas.height = targetHeightPx;

        // Clear canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidthPx, targetHeightPx);

        // Aspect Ratio calculations
        const imageRatio = imgElement.width / imgElement.height;
        const canvasRatio = targetWidthPx / targetHeightPx;

        let renderWidth = targetWidthPx;
        let renderHeight = targetHeightPx;

        // Scale to fill canvas initially (cover option)
        if (imageRatio > canvasRatio) {
          renderWidth = targetHeightPx * imageRatio;
        } else {
          renderHeight = targetWidthPx / imageRatio;
        }

        // Apply custom user zoom
        const scaleFactor = singleAdjust.zoom / 100;
        renderWidth *= scaleFactor;
        renderHeight *= scaleFactor;

        // Save context and clip
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, targetWidthPx, targetHeightPx);
        ctx.clip();

        // Translate to cropbox center for nice pivot rotation
        ctx.translate(targetWidthPx / 2, targetHeightPx / 2);
        ctx.rotate((singleAdjust.rotation * Math.PI) / 180);

        // Apply visual adjustment filters (very useful for official document scans!)
        const filterParts = [];
        if (singleAdjust.brightness !== 100) filterParts.push(`brightness(${singleAdjust.brightness}%)`);
        if (singleAdjust.contrast !== 100) filterParts.push(`contrast(${singleAdjust.contrast}%)`);
        if (singleAdjust.colorMode === 'grayscale') filterParts.push('grayscale(100%)');
        else if (singleAdjust.colorMode === 'monochrome') filterParts.push('grayscale(100%) contrast(250%)');
        
        ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';

        // Draw image centered relative to the translated origin with offsets applied
        ctx.drawImage(imgElement, -renderWidth / 2 + singleAdjust.offsetX, -renderHeight / 2 + singleAdjust.offsetY, renderWidth, renderHeight);
        ctx.restore();

        // Real-time quick size estimate
        const mime = settings.format === 'png' ? 'image/png' : 'image/jpeg';
        const sampleQuality = 0.8;
        const sampleUrl = canvas.toDataURL(mime, sampleQuality);
        const estimatedSizeKB = Math.round((sampleUrl.length * 3) / 4 / 1024);

        setProcessedDetails({
          fileSizeKB: Math.min(estimatedSizeKB, settings.targetSizeKB),
          widthPx: targetWidthPx,
          heightPx: targetHeightPx,
          dpi: settings.dpi,
          format: settings.format,
        });
      }
    };

    renderPreview();
  }, [
    isReady,
    isAadhaar,
    frontFile,
    backFile,
    imgElement,
    singleAdjust,
    frontAdjust,
    backAdjust,
    settings.dpi,
    settings.customWidthCm,
    settings.customHeightCm,
    settings.format,
    settings.aadhaarLayout,
  ]);

  const handleDownload = async () => {
    if (!isReady) return;
    setIsProcessing(true);

    try {
      let finalCanvas: HTMLCanvasElement;

      if (isAadhaar && frontFile && backFile) {
        finalCanvas = await mergeFrontAndBack(
          frontFile.dataUrl,
          backFile.dataUrl,
          settings.aadhaarLayout,
          settings.dpi,
          frontAdjust,
          backAdjust
        );
      } else {
        // Create full scale high-res offscreen canvas
        finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        if (!ctx || !imgElement) throw new Error('Failed to create drawing context');

        const pxPerCm = settings.dpi / 2.54;
        const targetWidthPx = Math.round(settings.customWidthCm * pxPerCm);
        const targetHeightPx = Math.round(settings.customHeightCm * pxPerCm);

        finalCanvas.width = targetWidthPx;
        finalCanvas.height = targetHeightPx;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidthPx, targetHeightPx);

        const imageRatio = imgElement.width / imgElement.height;
        const canvasRatio = targetWidthPx / targetHeightPx;

        let renderWidth = targetWidthPx;
        let renderHeight = targetHeightPx;

        if (imageRatio > canvasRatio) {
          renderWidth = targetHeightPx * imageRatio;
        } else {
          renderHeight = targetWidthPx / imageRatio;
        }

        const scaleFactor = singleAdjust.zoom / 100;
        renderWidth *= scaleFactor;
        renderHeight *= scaleFactor;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, targetWidthPx, targetHeightPx);
        ctx.clip();

        // Translate to cropbox center for nice pivot rotation
        ctx.translate(targetWidthPx / 2, targetHeightPx / 2);
        ctx.rotate((singleAdjust.rotation * Math.PI) / 180);

        // Apply visual adjustment filters (very useful for official document scans!)
        const filterParts = [];
        if (singleAdjust.brightness !== 100) filterParts.push(`brightness(${singleAdjust.brightness}%)`);
        if (singleAdjust.contrast !== 100) filterParts.push(`contrast(${singleAdjust.contrast}%)`);
        if (singleAdjust.colorMode === 'grayscale') filterParts.push('grayscale(100%)');
        else if (singleAdjust.colorMode === 'monochrome') filterParts.push('grayscale(100%) contrast(250%)');
        
        ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';

        // Draw image centered relative to the translated origin with offsets applied
        ctx.drawImage(imgElement, -renderWidth / 2 + singleAdjust.offsetX, -renderHeight / 2 + singleAdjust.offsetY, renderWidth, renderHeight);
        ctx.restore();
      }

      const originalName = isAadhaar 
        ? (frontFile?.name || 'document') 
        : (singleFile?.name || 'image');
      const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
      
      if (settings.format === 'pdf') {
        // Export to PDF
        const filename = `${baseName}_resized_200dpi.pdf`;
        downloadCanvasAsPdf(finalCanvas, filename, settings.dpi);
      } else {
        // Perform Smart Compression
        const compressedBlob = await compressImageToLimit(
          finalCanvas,
          settings.targetSizeKB,
          settings.dpi,
          settings.format
        );

        // Download Blob
        const url = URL.createObjectURL(compressedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_resized_200dpi.${settings.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error during download generation:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetSliders = () => {
    const defaultAdjust: ImageAdjustment = {
      zoom: 100,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      brightness: 100,
      contrast: 100,
      colorMode: 'original'
    };
    if (isAadhaar) {
      if (activeAadhaarTab === 'front') {
        setFrontAdjust(defaultAdjust);
      } else {
        setBackAdjust(defaultAdjust);
      }
    } else {
      setSingleAdjust(defaultAdjust);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col h-full" id="cropper-preview-container">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Sliders className="w-4 h-4" />
          </div>
          <h3 className="font-display font-semibold text-slate-900 text-base">
            2. Crop & Customize
          </h3>
        </div>
        {isReady && (
          <button
            onClick={handleResetSliders}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors bg-blue-50/50 hover:bg-blue-50 px-2 py-1 rounded cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Reset {isAadhaar ? (activeAadhaarTab === 'front' ? 'Front' : 'Back') : 'Crop'}
          </button>
        )}
      </div>

      {!isReady ? (
        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30 p-8 text-center text-slate-400">
          <Settings2 className="w-10 h-10 stroke-[1.2] mb-3 text-slate-300 animate-pulse" />
          <h4 className="font-medium text-slate-700 mb-1">Preview Awaiting Upload</h4>
          <p className="text-xs max-w-[240px]">
            {isAadhaar 
              ? 'Please upload both front and back images to view the merged document copy.'
              : 'Please upload an image to access interactive cropping, auto-sizing, and download settings.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6">
          {/* Interactive Preview Frame */}
          <div className="relative rounded-xl border border-slate-200 bg-slate-950 p-4 flex items-center justify-center overflow-hidden min-h-[260px] max-h-[340px] shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-50" />
            
            {/* The canvas displays current cropped bounds */}
            <canvas
              ref={previewCanvasRef}
              className="max-h-[240px] max-w-full object-contain shadow-2xl rounded border border-white/10"
              style={{
                // Let custom margins show off elegant card boundaries
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
            />

            {/* Micro badge indicator */}
            <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-md border border-slate-800 text-[10px] text-slate-300 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>DPI-Optimized NSDL Preview</span>
            </div>
          </div>

          {/* Quick Specifications Dashboard */}
          {processedDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-400 font-medium">Output Size</span>
                <span className="font-mono font-bold text-slate-800">
                  {settings.customWidthCm} × {settings.customHeightCm} cm
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 font-medium">Resolution</span>
                <span className="font-mono font-bold text-slate-800">
                  {processedDetails.widthPx} × {processedDetails.heightPx} px
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 font-medium">File Resolution</span>
                <span className="font-mono font-bold text-blue-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" /> {processedDetails.dpi} DPI
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 font-medium">Max Limit / Est.</span>
                <span className="font-mono font-bold text-emerald-600">
                  &lt; {settings.targetSizeKB}KB / ~{processedDetails.fileSizeKB}KB
                </span>
              </div>
            </div>
          )}

          {/* Side Select Tab Control (Only for Aadhaar / Multi-page IDs) */}
          {isAadhaar && (
            <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100 animate-fade-in">
              <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Select ID Side to Adjust
              </h4>
              <div className="flex bg-slate-200/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveAadhaarTab('front')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeAadhaarTab === 'front'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Front Side of ID
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAadhaarTab('back')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeAadhaarTab === 'back'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Back Side of ID
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium text-center">
                Select a side above to adjust its individual alignment, rotation, and filters independently.
              </p>
            </div>
          )}

          {/* Position & Zoom Controls */}
          {((!isAadhaar && imgElement) || (isAadhaar && hasAadhaar)) && (
            <>
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Scale className="w-3.5 h-3.5 text-blue-600" /> Position & Zoom Controls {isAadhaar && `(${activeAadhaarTab === 'front' ? 'Front Side' : 'Back Side'})`}
                </h4>

                <div className="grid gap-3.5 text-xs">
                  {/* Zoom */}
                  <div>
                    <div className="flex justify-between mb-1 text-slate-600">
                      <span className="font-medium">Zoom Factor</span>
                      <span className="font-mono text-slate-400">{currentAdjust.zoom}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      value={currentAdjust.zoom}
                      onChange={(e) => updateAdjust('zoom', Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* X Offset */}
                  <div>
                    <div className="flex justify-between mb-1 text-slate-600">
                      <span className="font-medium">Move Horizontal</span>
                      <span className="font-mono text-slate-400">{currentAdjust.offsetX} px</span>
                    </div>
                    <input
                      type="range"
                      min="-200"
                      max="200"
                      value={currentAdjust.offsetX}
                      onChange={(e) => updateAdjust('offsetX', Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Y Offset */}
                  <div>
                    <div className="flex justify-between mb-1 text-slate-600">
                      <span className="font-medium">Move Vertical</span>
                      <span className="font-mono text-slate-400">{currentAdjust.offsetY} px</span>
                    </div>
                    <input
                      type="range"
                      min="-200"
                      max="200"
                      value={currentAdjust.offsetY}
                      onChange={(e) => updateAdjust('offsetY', Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Image Adjustments & Filters */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 animate-fade-in">
                <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" /> Image Adjustments & Filters {isAadhaar && `(${activeAadhaarTab === 'front' ? 'Front Side' : 'Back Side'})`}
                </h4>

                <div className="grid gap-3.5 text-xs">
                  {/* Fine Rotation */}
                  <div>
                    <div className="flex justify-between mb-1 text-slate-600">
                      <span className="font-medium flex items-center gap-1">
                        <RotateCw className="w-3.5 h-3.5 text-slate-400" /> Straighten / Rotate
                      </span>
                      <span className="font-mono text-slate-400">{currentAdjust.rotation}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={currentAdjust.rotation}
                        onChange={(e) => updateAdjust('rotation', Number(e.target.value))}
                        className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = currentAdjust.rotation + 90;
                          updateAdjust('rotation', next >= 180 ? next - 360 : next);
                        }}
                        className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded text-[10px] font-semibold text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Rotate 90° clockwise"
                      >
                        +90°
                      </button>
                    </div>
                  </div>

                  {/* Brightness */}
                  <div>
                    <div className="flex justify-between mb-1 text-slate-600">
                      <span className="font-medium flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-slate-400" /> Brightness (Remove Shadows)
                      </span>
                      <span className="font-mono text-slate-400">{currentAdjust.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={currentAdjust.brightness}
                      onChange={(e) => updateAdjust('brightness', Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex justify-between mb-1 text-slate-600">
                      <span className="font-medium flex items-center gap-1">
                        <Contrast className="w-3.5 h-3.5 text-slate-400" /> Contrast (Enhance Text)
                      </span>
                      <span className="font-mono text-slate-400">{currentAdjust.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={currentAdjust.contrast}
                      onChange={(e) => updateAdjust('contrast', Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Scan Color Mode */}
                  <div>
                    <span className="block font-medium text-slate-600 mb-2 flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 text-slate-400" /> Official Scan Optimizations
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['original', 'grayscale', 'monochrome'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateAdjust('colorMode', mode)}
                          className={`py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            currentAdjust.colorMode === mode
                              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs font-semibold'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {mode === 'original' && 'Color'}
                          {mode === 'grayscale' && 'Grayscale'}
                          {mode === 'monochrome' && 'Scribble/B&W'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Aadhaar Layout Toggle */}
          {isAadhaar && (
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Merging Layout
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ aadhaarLayout: 'vertical' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center justify-center gap-1.5 transition-all ${
                    settings.aadhaarLayout === 'vertical'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="w-3 h-6 border-2 border-dashed rounded bg-slate-100 flex flex-col gap-0.5 p-0.5 justify-between">
                    <div className="h-1.5 bg-slate-300 rounded-xs" />
                    <div className="h-1.5 bg-slate-300 rounded-xs" />
                  </div>
                  Vertical Align (Stacked)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ aadhaarLayout: 'horizontal' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center justify-center gap-1.5 transition-all ${
                    settings.aadhaarLayout === 'horizontal'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="w-6 h-3.5 border-2 border-dashed rounded bg-slate-100 flex gap-0.5 p-0.5 justify-between">
                    <div className="w-2 bg-slate-300 rounded-xs" />
                    <div className="w-2 bg-slate-300 rounded-xs" />
                  </div>
                  Horizontal Align (Side-by-side)
                </button>
              </div>
            </div>
          )}

          {/* Settings Customizers Accordion */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <Settings2 className="w-3.5 h-3.5 text-slate-400" /> Export Configuration
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {/* Output Format */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">File Format</label>
                <select
                  value={settings.format}
                  onChange={(e) => onUpdateSettings({ format: e.target.value as any })}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="jpeg">JPEG (.jpg)</option>
                  <option value="png">PNG (.png)</option>
                  {isAadhaar && <option value="pdf">PDF Document (.pdf)</option>}
                </select>
              </div>

              {/* Compression size target */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Max File Size (KB)</label>
                <input
                  type="number"
                  min="10"
                  max="2000"
                  value={settings.targetSizeKB}
                  onChange={(e) => onUpdateSettings({ targetSizeKB: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              {/* Resolution DPI */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target Resolution</label>
                <select
                  value={settings.dpi}
                  onChange={(e) => onUpdateSettings({ dpi: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="200">200 DPI (NSDL Standard)</option>
                  <option value="300">300 DPI (High Clarity)</option>
                  <option value="600">600 DPI (Ultra Premium)</option>
                </select>
              </div>
            </div>

            {/* Custom CM overrides (for non-Aadhaar) */}
            {!isAadhaar && (
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Target Width (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="30"
                    value={settings.customWidthCm}
                    onChange={(e) => onUpdateSettings({ customWidthCm: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Target Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="30"
                    value={settings.customHeightCm}
                    onChange={(e) => onUpdateSettings({ customHeightCm: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Download Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isProcessing}
              className={`w-full py-3.5 rounded-xl text-white font-display font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer ${
                isProcessing 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Compressing & Injecting DPI...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download Optimized {settings.format.toUpperCase()}
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
              <Info className="w-3 h-3 text-blue-500" />
              Auto-adds 200 DPI metadata chunk directly inside JPEG file header.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
