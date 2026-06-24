import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileImage, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ImageFile, DocumentType } from '../types';

interface UploadZoneProps {
  documentType: DocumentType;
  frontFile: ImageFile | null;
  backFile: ImageFile | null;
  singleFile: ImageFile | null;
  onFileSelect: (file: File, side: 'front' | 'back' | 'single') => void;
  onClear: (side: 'front' | 'back' | 'single') => void;
}

export default function UploadZone({
  documentType,
  frontFile,
  backFile,
  singleFile,
  onFileSelect,
  onClear,
}: UploadZoneProps) {
  const isAadhaar = documentType === 'AADHAAR_COPY';

  const singleInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState<{ [key: string]: boolean }>({
    single: false,
    front: false,
    back: false,
  });

  const handleDragOver = (e: React.DragEvent, key: 'single' | 'front' | 'back') => {
    e.preventDefault();
    setDragOver((prev) => ({ ...prev, [key]: true }));
  };

  const handleDragLeave = (key: 'single' | 'front' | 'back') => {
    setDragOver((prev) => ({ ...prev, [key]: false }));
  };

  const handleDrop = (e: React.DragEvent, key: 'single' | 'front' | 'back') => {
    e.preventDefault();
    setDragOver((prev) => ({ ...prev, [key]: false }));
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onFileSelect(file, key);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: 'single' | 'front' | 'back') => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0], key);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const renderDropZone = (
    key: 'single' | 'front' | 'back',
    label: string,
    description: string,
    uploadedFile: ImageFile | null,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const isOver = dragOver[key];

    return (
      <div className="flex flex-col h-full" id={`upload-container-${key}`}>
        <label className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          {uploadedFile && (
            <span className="text-emerald-600 text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Loaded
            </span>
          )}
        </label>
        
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleFileChange(e, key)}
        />

        <div
          onDragOver={(e) => handleDragOver(e, key)}
          onDragLeave={() => handleDragLeave(key)}
          onDrop={(e) => handleDrop(e, key)}
          onClick={() => inputRef.current?.click()}
          className={`flex-1 min-h-[220px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all relative overflow-hidden ${
            uploadedFile
              ? 'border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50/40'
              : isOver
              ? 'border-blue-500 bg-blue-50/50 scale-[0.98]'
              : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
          }`}
        >
          <AnimatePresence mode="wait">
            {uploadedFile ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center w-full h-full justify-between"
              >
                <div className="flex flex-col items-center justify-center flex-1 py-2">
                  <div className="w-20 h-20 rounded-lg overflow-hidden shadow-sm border border-emerald-100 bg-white p-1 mb-3 flex items-center justify-center">
                    <img
                      src={uploadedFile.dataUrl}
                      alt="Uploaded Preview"
                      className="max-w-full max-h-full object-contain rounded"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-xs font-mono text-slate-600 max-w-[180px] truncate mb-0.5">
                    {uploadedFile.name}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400">
                    {formatSize(uploadedFile.size)}
                  </p>
                </div>

                <div className="flex gap-2 w-full mt-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onClear(key)}
                    className="w-full py-1.5 px-3 bg-white text-rose-600 border border-rose-200 rounded-lg text-xs font-medium hover:bg-rose-50 hover:border-rose-300 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className={`p-4 rounded-full mb-3.5 transition-colors ${
                  isOver ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-slate-100 text-slate-500'
                }`}>
                  {key === 'single' && documentType === 'PAN_SIGNATURE' ? (
                    <FileImage className="w-6 h-6 stroke-[1.5]" />
                  ) : (
                    <Upload className="w-6 h-6 stroke-[1.5]" />
                  )}
                </div>
                <p className="text-sm font-medium text-slate-800 mb-1">
                  Drag & drop your file here, or <span className="text-blue-600 font-semibold">browse</span>
                </p>
                <p className="text-xs text-slate-400 max-w-[200px]">
                  {description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md/50 transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
          <Upload className="w-4 h-4" />
        </div>
        <h3 className="font-display font-semibold text-slate-900 text-base">
          1. Upload Documents
        </h3>
      </div>

      <div className="grid gap-5">
        {isAadhaar ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderDropZone(
              'front',
              'Front Side of ID',
              'Supports JPEG, PNG up to 10MB',
              frontFile,
              frontInputRef
            )}
            {renderDropZone(
              'back',
              'Back Side of ID',
              'Supports JPEG, PNG up to 10MB',
              backFile,
              backInputRef
            )}
          </div>
        ) : (
          renderDropZone(
            'single',
            documentType === 'PAN_PHOTO' ? 'Applicant Photo' : 'Applicant Signature',
            'Supports JPEG, PNG up to 10MB',
            singleFile,
            singleInputRef
          )
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2.5 text-slate-500 text-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span>
          <strong>100% Client-Side Processing:</strong> Your files never leave your device. All rendering, cropping, and compression are completed locally inside your browser.
        </span>
      </div>
    </div>
  );
}
