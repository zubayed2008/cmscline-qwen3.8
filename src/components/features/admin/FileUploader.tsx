'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  previewUrl?: string | null;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

/**
 * FileUploader Component
 *
 * A reusable file upload component with preview functionality.
 * Supports drag-and-drop and click-to-select.
 *
 * Props:
 * - onFileSelect: Callback when a file is selected
 * - selectedFile: The currently selected file (for controlled mode)
 * - previewUrl: URL to display as preview (for existing images)
 * - accept: Comma-separated list of accepted file types
 * - maxSizeMB: Maximum file size in MB (default: 2)
 * - className: Additional CSS classes
 */
export default function FileUploader({
  onFileSelect,
  selectedFile,
  previewUrl,
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  maxSizeMB = 2,
  className = '',
}: FileUploaderProps) {
  const [preview, setPreview] = useState<string | null>(previewUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = useCallback(
    (file: File): boolean => {
      setError(null);

      // Check file size
      if (file.size > maxSizeBytes) {
        setError(`File size exceeds maximum limit of ${maxSizeMB}MB`);
        return false;
      }

      // Check file type
      const allowedTypes = accept.split(',').map((type) => type.trim());
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
        return false;
      }

      return true;
    },
    [maxSizeBytes, maxSizeMB, accept]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (validateFile(file)) {
        onFileSelect(file);
        // Create preview URL
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
      }

      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onFileSelect, validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      if (validateFile(file)) {
        onFileSelect(file);
        // Create preview URL
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
      }
    },
    [onFileSelect, validateFile]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">Image Upload</label>

      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        {preview ? (
          <div className="space-y-2">
            <div className="relative w-full h-48 flex items-center justify-center">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <p className="text-sm text-gray-600">
              {selectedFile?.name || 'Image selected'}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-blue-600 hover:text-blue-700">
                Click to upload
              </span>{' '}
              or drag and drop
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF, WEBP up to {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}