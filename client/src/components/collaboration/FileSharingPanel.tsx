import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../../services/socketService';
import {
  getSharedFilesApi,
  uploadSharedFileApi,
  deleteSharedFileApi,
  downloadSharedFileApi,
  SharedFileItem,
} from '../../services/collaborationApi';
import {
  UploadCloud,
  File,
  FileText,
  FileCode,
  FileArchive,
  Image,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface FileSharingPanelProps {
  meetingId: string;
  currentUserId: string;
  isHost: boolean;
}

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs',
  '.js', '.mjs', '.jar', '.bin', '.msi', '.dll'
];

export const FileSharingPanel: React.FC<FileSharingPanelProps> = ({
  meetingId,
  currentUserId,
  isHost,
}) => {
  const [files, setFiles] = useState<SharedFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    if (!meetingId) return;
    try {
      setIsLoading(true);
      const data = await getSharedFilesApi(meetingId);
      setFiles(data);
    } catch (err: any) {
      console.error('[Files] Failed to load files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();

    const socket = socketService.getSocket();

    const handleFileShared = (newFile: SharedFileItem) => {
      setFiles((prev) => {
        if (prev.some((f) => f.id === newFile.id)) return prev;
        return [newFile, ...prev];
      });
    };

    const handleFileDeleted = ({ fileId }: { fileId: string }) => {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    };

    socket.on('file:shared', handleFileShared);
    socket.on('file:deleted', handleFileDeleted);

    return () => {
      socket.off('file:shared', handleFileShared);
      socket.off('file:deleted', handleFileDeleted);
    };
  }, [meetingId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Reset messages
    setUploadError(null);
    setSuccessMessage(null);

    // Client-side validation
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      setUploadError(`Executable files (${ext}) are not permitted for security reasons.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15MB upload limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploading(true);
      await uploadSharedFileApi(meetingId, selectedFile);
      setSuccessMessage(`${selectedFile.name} uploaded successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadFiles();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (file: SharedFileItem) => {
    try {
      await downloadSharedFileApi(meetingId, file.id, file.originalName);
    } catch (err: any) {
      alert(err.message || 'Failed to download file');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to remove this file?')) return;
    try {
      await deleteSharedFileApi(meetingId, fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string, _mime?: string) => {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
      return <Image className="w-4 h-4 text-emerald-400" />;
    }
    if (['.pdf', '.txt', '.doc', '.docx', '.md'].includes(ext)) {
      return <FileText className="w-4 h-4 text-sky-400" />;
    }
    if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
      return <FileArchive className="w-4 h-4 text-amber-400" />;
    }
    if (['.html', '.css', '.json', '.xml', '.ts', '.py', '.java', '.c'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-indigo-400" />;
    }
    return <File className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl overflow-hidden p-3 gap-3">
      {/* Upload Drop Area */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed border-slate-700/80 hover:border-brand-500/80 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-800/40 hover:bg-slate-800/80 ${
          isUploading ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-1.5">
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
          ) : (
            <UploadCloud className="w-6 h-6 text-brand-400" />
          )}
          <span className="text-xs font-semibold text-white">
            {isUploading ? 'Uploading file...' : 'Share a file with this meeting'}
          </span>
          <span className="text-[10px] text-slate-400">
            Click to browse (Up to 15MB &bull; Encrypted transfer)
          </span>
        </div>
      </div>

      {/* Upload Feedback Messages */}
      {uploadError && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Files List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
            <span className="text-xs">Loading shared files...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-slate-500">
            <File className="w-6 h-6 text-slate-600 mb-1" />
            <p className="text-xs font-semibold text-slate-400">No files shared yet</p>
            <p className="text-[10px] text-slate-500">Upload documents or images to share with attendees</p>
          </div>
        ) : (
          files.map((file) => {
            const canDelete = isHost || file.uploaderId === currentUserId;
            return (
              <div
                key={file.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-900 flex-shrink-0">
                    {getFileIcon(file.originalName, file.fileType)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate" title={file.originalName}>
                      {file.originalName}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>&bull;</span>
                      <span className="truncate">
                        by {file.uploader?.name || (file.uploaderId === currentUserId ? 'You' : 'Participant')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-700/60 transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
