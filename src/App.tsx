import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileImage, 
  PenTool, 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  Compass, 
  HelpCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { DocumentType, ImageFile, ProcessingSettings, DocumentSpecification } from './types';
import UploadZone from './components/UploadZone';
import CropperPreview from './components/CropperPreview';

const DOC_SPECS: Record<DocumentType, DocumentSpecification> = {
  PAN_PHOTO: {
    id: 'PAN_PHOTO',
    name: 'PAN Card Photo',
    subLabel: 'NSDL / UTIITSL Mandated',
    dimensionsText: '3.5 × 2.5 cm (Portrait)',
    maxSizeKB: 50,
    recommendedDpi: 200,
    widthCm: 2.5, // NSDL official standard is 2.5 cm width by 3.5 cm height
    heightCm: 3.5,
    aspectRatio: 2.5 / 3.5,
  },
  PAN_SIGNATURE: {
    id: 'PAN_SIGNATURE',
    name: 'PAN Card Signature',
    subLabel: 'NSDL / UTIITSL Mandated',
    dimensionsText: '4.5 × 2.0 cm (Landscape)',
    maxSizeKB: 20,
    recommendedDpi: 200,
    widthCm: 4.5,
    heightCm: 2.0,
    aspectRatio: 4.5 / 2.0,
  },
  AADHAAR_COPY: {
    id: 'AADHAAR_COPY',
    name: 'Aadhaar / Document Copy',
    subLabel: 'Front & Back Auto-Merge',
    dimensionsText: 'Front & Back Merged',
    maxSizeKB: 300,
    recommendedDpi: 200,
    widthCm: 8.5, // Standard card ID dimension
    heightCm: 5.5,
    aspectRatio: 8.5 / 5.5,
  },
};

export default function App() {
  const [documentType, setDocumentType] = useState<DocumentType>('PAN_PHOTO');
  const [frontFile, setFrontFile] = useState<ImageFile | null>(null);
  const [backFile, setBackFile] = useState<ImageFile | null>(null);
  const [singleFile, setSingleFile] = useState<ImageFile | null>(null);

  const [settings, setSettings] = useState<ProcessingSettings>({
    documentType: 'PAN_PHOTO',
    customWidthCm: 2.5,
    customHeightCm: 3.5,
    targetSizeKB: 50,
    dpi: 200,
    format: 'jpeg',
    keepAspectRatio: true,
    aadhaarLayout: 'vertical',
  });

  // Automatically update settings when document type changes
  useEffect(() => {
    const spec = DOC_SPECS[documentType];
    setSettings((prev) => ({
      ...prev,
      documentType,
      customWidthCm: spec.widthCm,
      customHeightCm: spec.heightCm,
      targetSizeKB: spec.maxSizeKB,
      dpi: spec.recommendedDpi,
      format: documentType === 'AADHAAR_COPY' ? 'jpeg' : 'jpeg', // default both to jpeg
    }));
  }, [documentType]);

  const handleFileSelect = (file: File, side: 'front' | 'back' | 'single') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const imgFile: ImageFile = {
          name: file.name,
          dataUrl: e.target.result as string,
          size: file.size,
          type: file.type,
        };

        if (side === 'front') {
          setFrontFile(imgFile);
        } else if (side === 'back') {
          setBackFile(imgFile);
        } else {
          setSingleFile(imgFile);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClear = (side: 'front' | 'back' | 'single') => {
    if (side === 'front') {
      setFrontFile(null);
    } else if (side === 'back') {
      setBackFile(null);
    } else {
      setSingleFile(null);
    }
  };

  const handleUpdateSettings = (newSettings: Partial<ProcessingSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans flex flex-col justify-between selection:bg-[#EFF6FF] selection:text-[#2563EB]">
      
      {/* Header Bar */}
      <header className="h-[70px] bg-white border-b border-[#E2E8F0] sticky top-0 z-40" id="main-header">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center border border-[#EFF6FF] shadow-xs">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 8h10M7 12h10M7 16h6" />
              </svg>
            </div>
            <div>
              <h1 className="font-display font-bold text-[#1E293B] text-base sm:text-lg leading-tight tracking-tight">
                DocResize Pro
              </h1>
              <p className="text-[10px] text-[#64748B] font-medium tracking-wide uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#2563EB]" /> Instant Browser-Safe Tool
              </p>
            </div>
          </div>
          
          {/* Progress Steps Indicators from Clean Minimalism Spec */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold">
            <div className="flex items-center gap-2 text-[#2563EB]">
              <span className="w-6 h-6 bg-[#2563EB] text-white rounded-full flex items-center justify-center font-bold text-[11px]">1</span>
              <span>Upload</span>
            </div>
            <div className="w-6 h-px bg-[#E2E8F0]" />
            <div className="flex items-center gap-2 text-[#2563EB]">
              <span className="w-6 h-6 bg-[#2563EB] text-white rounded-full flex items-center justify-center font-bold text-[11px]">2</span>
              <span>Adjust Document</span>
            </div>
            <div className="w-6 h-px bg-[#E2E8F0]" />
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <span className="w-6 h-6 bg-[#E2E8F0] text-[#64748B] rounded-full flex items-center justify-center font-bold text-[11px]">3</span>
              <span>Download</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Secure Sandbox
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-8 sm:py-12 flex-1 w-full" id="main-content-area">
        
        {/* Headline Section */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold tracking-wider uppercase border border-[#E2E8F0] inline-block mb-3">
              Government Specification Compliant
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#1E293B] tracking-tight leading-none mb-4">
              PAN Card & Aadhaar Document Resizer
            </h2>
            <p className="text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto font-sans leading-relaxed">
              Crop, resize, and download your Photo, Signature, and Aadhaar card instantly to meet official government specifications.
            </p>
          </motion.div>
        </div>

        {/* Core Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
          
          {/* LEFT COLUMN: Controls & Upload (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Document Selector Widget */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-[#EFF6FF] text-[#2563EB] rounded-lg">
                  <Compass className="w-4 h-4" />
                </div>
                <h3 className="font-display font-semibold text-[#1E293B] text-base">
                  Select Document Type to Auto-Format
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* PAN Photo */}
                <button
                  type="button"
                  onClick={() => setDocumentType('PAN_PHOTO')}
                  className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all cursor-pointer ${
                    documentType === 'PAN_PHOTO'
                      ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                      : 'border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${
                      documentType === 'PAN_PHOTO' ? 'bg-[#2563EB] text-white' : 'bg-white text-slate-500 border border-[#E2E8F0]'
                    }`}>
                      <FileImage className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#1E293B] text-sm">PAN Card Photo</h4>
                      <p className="text-xs text-[#64748B] mt-0.5">Required: {DOC_SPECS.PAN_PHOTO.dimensionsText}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[#1E293B] font-bold">MAX 50KB</span>
                    <span className="text-[#2563EB] font-semibold">200 DPI</span>
                  </div>
                </button>

                {/* PAN Signature */}
                <button
                  type="button"
                  onClick={() => setDocumentType('PAN_SIGNATURE')}
                  className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all cursor-pointer ${
                    documentType === 'PAN_SIGNATURE'
                      ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                      : 'border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${
                      documentType === 'PAN_SIGNATURE' ? 'bg-[#2563EB] text-white' : 'bg-white text-slate-500 border border-[#E2E8F0]'
                    }`}>
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#1E293B] text-sm">PAN Card Signature</h4>
                      <p className="text-xs text-[#64748B] mt-0.5">Required: {DOC_SPECS.PAN_SIGNATURE.dimensionsText}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[#1E293B] font-bold">MAX 20KB</span>
                    <span className="text-[#2563EB] font-semibold">200 DPI</span>
                  </div>
                </button>

                {/* Aadhaar Copy */}
                <button
                  type="button"
                  onClick={() => setDocumentType('AADHAAR_COPY')}
                  className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all cursor-pointer ${
                    documentType === 'AADHAAR_COPY'
                      ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                      : 'border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${
                      documentType === 'AADHAAR_COPY' ? 'bg-[#2563EB] text-white' : 'bg-white text-slate-500 border border-[#E2E8F0]'
                    }`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#1E293B] text-sm">Aadhaar / Document Copy</h4>
                      <p className="text-xs text-[#64748B] mt-0.5">{DOC_SPECS.AADHAAR_COPY.dimensionsText}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[#1E293B] font-bold">MAX 300KB</span>
                    <span className="text-[#2563EB] font-semibold">PDF / JPEG</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Dynamic File Upload Zone */}
            <UploadZone
              documentType={documentType}
              frontFile={frontFile}
              backFile={backFile}
              singleFile={singleFile}
              onFileSelect={handleFileSelect}
              onClear={handleClear}
            />
          </div>

          {/* RIGHT COLUMN: Interactive Crop Preview & Settings (5 Cols) */}
          <div className="lg:col-span-5">
            <CropperPreview
              documentType={documentType}
              frontFile={frontFile}
              backFile={backFile}
              singleFile={singleFile}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          </div>
        </div>

        {/* Highlights / Features Grid section */}
        <div className="max-w-5xl mx-auto mt-16 sm:mt-24 border-t border-[#E2E8F0] pt-12">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h3 className="text-2xl font-display font-bold text-[#1E293B]">
              Key Features Crafted for Official Submissions
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              Guaranteed acceptance on NSDL, UTIITSL, and UIDAI upload portals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Secure feature */}
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center flex-shrink-0 border border-[#EFF6FF]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-[#1E293B] text-sm">100% Client-Side Security</h4>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  All cropping, merging, and compression operations occur purely within your browser memory. Your highly sensitive ID documents are never transmitted or stored on any external server.
                </p>
              </div>
            </div>

            {/* DPI converter */}
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center flex-shrink-0 border border-[#EFF6FF]">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-[#1E293B] text-sm">Auto-DPI Converter</h4>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  The tool automatically rewrites the binary JFIF metadata in the JPEG file to exactly 200 DPI, bypassing strict rejection errors on government portals.
                </p>
              </div>
            </div>

            {/* Smart compression */}
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center flex-shrink-0 border border-[#EFF6FF]">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-[#1E293B] text-sm">Smart Binary Compression</h4>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Recursively evaluates and reduces file size (under 20KB or 50KB) while ensuring essential signature curves and text readability remain crystal clear.
                </p>
              </div>
            </div>

            {/* Instant Preview */}
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center flex-shrink-0 border border-[#EFF6FF]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-[#1E293B] text-sm">Instant Preview Sandbox</h4>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Watch resolution parameters and file output estimates update dynamically as you tweak sliders, ensuring perfect precision before hitting download.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* NSDL/UIDAI Official Guidelines Info Card */}
        <div className="max-w-5xl mx-auto mt-10 bg-[#EFF6FF] rounded-lg border border-[#E2E8F0] p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="p-2.5 rounded-lg bg-[#2563EB] text-white flex-shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-xs text-[#64748B] leading-relaxed">
            <strong className="text-[#1E293B] block mb-0.5">Official NSDL/UTIITSL Requirements Reminder:</strong>
            Photo size must be exactly 3.5cm x 2.5cm, under 50KB, at 200 DPI resolution. Signature must be exactly 4.5cm x 2.0cm, under 20KB, at 200 DPI. Aadhaar document or PAN proof copy must be under 300KB and clear enough for text verification. This tool guarantees exact compliance.
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] py-6 mt-16 text-center text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 DocResize Pro — PAN & Aadhaar Document Resizer. Developed by Mik Chaudhari.</p>
          <div className="flex gap-4 font-semibold text-[#64748B]">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure Processing Sandbox</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
