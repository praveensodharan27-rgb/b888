'use client';

import { useState, useCallback, useEffect } from 'react';

interface ImageResizeInputProps {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  required?: boolean;
  previewUrl?: string | null;
  label?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  className?: string;
}

const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1080;
const DEFAULT_QUALITY = 0.85;

async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width <= maxWidth && height <= maxHeight) {
        resolve(file);
        return;
      }

      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const resizedFile = new File([blob], file.name, {
            type: file.type || 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        },
        file.type || 'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

export default function ImageResizeInput({
  value,
  onChange,
  accept = 'image/*',
  required = false,
  previewUrl,
  label = 'Image',
  maxWidth = DEFAULT_MAX_WIDTH,
  maxHeight = DEFAULT_MAX_HEIGHT,
  quality = DEFAULT_QUALITY,
  className = '',
}: ImageResizeInputProps) {
  const [resizeEnabled, setResizeEnabled] = useState(true);
  const [customMaxWidth, setCustomMaxWidth] = useState(maxWidth);
  const [customMaxHeight, setCustomMaxHeight] = useState(maxHeight);
  const [customQuality, setCustomQuality] = useState(quality);
  const [isResizing, setIsResizing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (previewUrl && !value) {
      setPreview(null);
    }
  }, [previewUrl, value]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        onChange(null);
        if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
        setPreview(null);
        return;
      }

      if (!file.type.startsWith('image/')) {
        onChange(file);
        if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(file));
        return;
      }

      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));

      if (!resizeEnabled) {
        onChange(file);
        return;
      }

      setIsResizing(true);
      try {
        const resized = await resizeImage(
          file,
          customMaxWidth,
          customMaxHeight,
          customQuality
        );
        onChange(resized);
      } catch {
        onChange(file);
      } finally {
        setIsResizing(false);
      }
    },
    [
      onChange,
      resizeEnabled,
      customMaxWidth,
      customMaxHeight,
      customQuality,
      preview,
    ]
  );

  const displayPreview = preview || previewUrl;

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-sm font-medium mb-1">{label}</label>
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          required={required}
          disabled={isResizing}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        {isResizing && (
          <p className="text-xs text-blue-600 mt-1">Resizing image...</p>
        )}
      </div>

      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={resizeEnabled}
            onChange={(e) => setResizeEnabled(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium">Resize before upload</span>
        </label>

        {resizeEnabled && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Width (px)</label>
              <input
                type="number"
                min="100"
                max="4000"
                value={customMaxWidth}
                onChange={(e) => setCustomMaxWidth(parseInt(e.target.value) || 1920)}
                className="w-full px-2 py-1.5 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Height (px)</label>
              <input
                type="number"
                min="100"
                max="4000"
                value={customMaxHeight}
                onChange={(e) => setCustomMaxHeight(parseInt(e.target.value) || 1080)}
                className="w-full px-2 py-1.5 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Quality (0.1-1)</label>
              <input
                type="number"
                min="0.1"
                max="1"
                step="0.1"
                value={customQuality}
                onChange={(e) => setCustomQuality(parseFloat(e.target.value) || 0.85)}
                className="w-full px-2 py-1.5 border rounded text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {displayPreview && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">Preview</p>
          <img
            src={displayPreview}
            alt="Preview"
            className="h-24 object-cover rounded border"
          />
        </div>
      )}
    </div>
  );
}
