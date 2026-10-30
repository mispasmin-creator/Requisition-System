import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FolderSymlink,
  Link2,
} from 'lucide-react';

const DRIVE_FOLDER_URL = '';

/**
 * DriveFileUpload Component
 * Uploads images (PNG, JPG, WEBP) or PDFs directly to the designated Google Drive folder
 * and saves the generated Google Drive share link.
 */
export function DriveFileUpload({
  value = '',
  onChange,
  label = 'Attachment (Bill / Quotation / Receipt)',
  hint = '',
  disabled = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef(null);

  // Derive file type and status if value exists
  const isPdf = value.toLowerCase().includes('.pdf') || uploadedFileName.toLowerCase().endsWith('.pdf');
  const isDriveLink = value.includes('drive.google.com');

  const handleFileProcess = async (file) => {
    setError('');
    if (!file) return;

    // Validate size (max 15MB)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is 15MB.`);
      return;
    }

    // Validate mime type
    const isImage = file.type.startsWith('image/');
    const isDocPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isDocPdf) {
      setError('Invalid file format. Please upload an Image (PNG, JPG, WEBP) or PDF file.');
      return;
    }

    setUploading(true);
    setUploadProgress(20);
    setUploadedFileName(file.name);

    try {
      // Read file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          setUploadProgress(50);
          const base64Data = reader.result;

          const res = await api.uploadFile({
            fileName: file.name,
            fileData: base64Data,
            mimeType: file.type || (isDocPdf ? 'application/pdf' : 'image/jpeg'),
          });

          setUploadProgress(100);
          if (res && res.fileUrl) {
            onChange(res.fileUrl);
          } else {
            throw new Error('Upload succeeded but no file URL was returned from Drive.');
          }
        } catch (uploadErr) {
          setError(uploadErr.message || 'Failed to upload file to Google Drive.');
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read file from your device.');
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during upload.');
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleClear = () => {
    onChange('');
    setUploadedFileName('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Label & Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{label}</span>
          <a
            href={DRIVE_FOLDER_URL}
            style={{ display: 'none' }}
            target="_blank"
            rel="noopener noreferrer"
            title="Open designated Google Drive folder in a new tab"
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '6px',
              backgroundColor: '#eef2ff',
              color: '#4f46e5',
              fontSize: '0.72rem',
              fontWeight: 600,
              textDecoration: 'none',
              marginLeft: '4px',
            }}
          >
            <FolderSymlink size={11} />
            <span>Attachment storage</span>
          </a>
        </label>

        {/* Toggle Manual Link vs Direct File Upload */}
        <button
          style={{ display: 'none' }}
          type="button"
          onClick={() => setManualMode(!manualMode)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.74rem',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 4px',
            borderRadius: '4px',
          }}
        >
          <Link2 size={12} />
          <span>Upload options</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#dc2626',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden native file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />

      {/* Manual URL Input Mode */}
      {manualMode ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 12px',
            borderRadius: '12px',
            border: '1px solid var(--border-light)',
            backgroundColor: 'var(--surface-subtle)',
          }}
        >
          <Link2 size={15} color="var(--text-muted)" />
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.86rem',
              color: 'var(--text-primary)',
            }}
          />
          {value && (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--accent-sage-dark)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
              title="Open link in new tab"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      ) : value ? (
        /* Successfully Uploaded / Attached Card */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '12px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
                flexShrink: 0,
              }}
            >
              {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#15803d',
                }}
              >
                <CheckCircle2 size={14} color="#16a34a" />
                <span
                  style={{
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    maxWidth: '240px',
                  }}
                >
                  {uploadedFileName || (isPdf ? 'Document.pdf' : 'Attachment File')}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.73rem',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '1px',
                }}
              >
                <span>Attachment uploaded successfully</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* View File in Google Drive */}
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #86efac',
                color: '#15803d',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              <ExternalLink size={13} />
              <span>Open in Drive</span>
            </a>

            {/* Replace Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Replace
            </button>

            {/* Remove / Clear */}
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled || uploading}
              title="Remove Attachment"
              style={{
                padding: '6px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Empty Dropzone Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            position: 'relative',
            padding: '20px 16px',
            borderRadius: '14px',
            border: isDragging ? '2px dashed #4f46e5' : '1.5px dashed var(--border-light)',
            backgroundColor: isDragging
              ? 'rgba(79, 70, 229, 0.05)'
              : uploading
              ? '#fafafa'
              : '#fcfdfa',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: uploading || disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.18s ease',
            textAlign: 'center',
          }}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={26} color="var(--accent-sage-dark)" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Uploading file... {uploadProgress > 0 && `${uploadProgress}%`}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Please wait
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(136, 163, 131, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-sage-dark)',
                }}
              >
                <UploadCloud size={22} />
              </div>

              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Click to upload image or PDF
                </span>{' '}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  display: 'none',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>PNG, JPG, WEBP, or PDF (Max 15MB)</span>
                <span>•</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Helper text */}
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
        {false && hint}
      </span>
    </div>
  );
}
