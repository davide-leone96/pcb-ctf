'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileIcon, Loader2 } from 'lucide-react';

interface HintFilesUploadProps {
  files: string[];
  onChange: (files: string[]) => void;
}

/** Extracts the original file name from the stored path (strips hint-<timestamp>- prefix). */
function displayName(filePath: string): string {
  const name = filePath.split('/').pop() || filePath;
  // hint-1234567890-originalname.ext → originalname.ext
  return name.replace(/^hint-[a-z0-9]+-/, '');
}

export default function HintFilesUpload({ files, onChange }: HintFilesUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < selected.length; i++) {
        formData.append('files', selected[i]);
      }

      const res = await fetch('/api/hints/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success && data.files) {
        const newPaths = data.files.map((f: { path: string }) => f.path);
        onChange([...files, ...newPaths]);
      }
    } catch (err) {
      console.error('Hint file upload failed:', err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async (filePath: string) => {
    try {
      await fetch('/api/hints/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
    } catch { /* ignore delete errors */ }
    onChange(files.filter(f => f !== filePath));
  };

  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">Hint Files</label>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1 mb-1.5">
          {files.map(f => (
            <div key={f} className="flex items-center gap-1.5 bg-gray-700/30 rounded px-2 py-1 group">
              <FileIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-300 truncate flex-1" title={displayName(f)}>
                {displayName(f)}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(f)}
                className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Upload className="h-3 w-3" />
        )}
        {uploading ? 'Uploading...' : 'Upload files'}
      </button>
    </div>
  );
}
