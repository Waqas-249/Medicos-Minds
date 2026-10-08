/**
 * High-Speed Chunked PDF Uploader for Large Files (20 MB up to 3 GB)
 * Features:
 * - Dynamic chunk sizing (5 MB - 20 MB)
 * - Parallel pipelined streaming (2 concurrent connections)
 * - Automatic chunk-level retry with backoff on network glitch
 * - Real-time progress, byte counters, MB/s transfer speed, and ETA estimation
 * - Memory-safe file slicing (never buffers 3 GB files in browser RAM)
 */

export interface ChunkUploadProgress {
  status: 'idle' | 'initializing' | 'uploading' | 'verifying' | 'completed' | 'error' | 'aborted';
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  currentChunk: number;
  totalChunks: number;
  error?: string;
  result?: ChunkUploadResult;
}

export interface ChunkUploadResult {
  pdf_file: string;
  pdf_original_name: string;
  pdf_size: number;
}

export class ChunkUploader {
  private file: File;
  private adminToken: string;
  private onProgress: (progress: ChunkUploadProgress) => void;
  private abortController: AbortController | null = null;
  private isAborted = false;
  private uploadId: string | null = null;

  constructor(file: File, adminToken: string, onProgress: (progress: ChunkUploadProgress) => void) {
    this.file = file;
    this.adminToken = adminToken;
    this.onProgress = onProgress;
  }

  public static determineChunkSize(fileSize: number): number {
    if (fileSize <= 50 * 1024 * 1024) {
      return 5 * 1024 * 1024; // 5 MB chunks for files <= 50 MB
    } else if (fileSize <= 300 * 1024 * 1024) {
      return 10 * 1024 * 1024; // 10 MB chunks for files <= 300 MB
    } else {
      return 20 * 1024 * 1024; // 20 MB chunks for large files up to 3 GB
    }
  }

  public async start(): Promise<ChunkUploadResult> {
    this.isAborted = false;
    this.abortController = new AbortController();

    const fileSize = this.file.size;
    const chunkSize = ChunkUploader.determineChunkSize(fileSize);
    const totalChunks = Math.ceil(fileSize / chunkSize);

    this.onProgress({
      status: 'initializing',
      percent: 0,
      uploadedBytes: 0,
      totalBytes: fileSize,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      currentChunk: 0,
      totalChunks,
    });

    // 1. Initialize upload session
    const initRes = await fetch('/api/admin/upload-chunk/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.adminToken}`,
      },
      signal: this.abortController.signal,
      body: JSON.stringify({
        filename: this.file.name,
        fileSize,
        totalChunks,
        chunkSize,
      }),
    });

    if (!initRes.ok) {
      const errData = await initRes.json().catch(() => ({}));
      const msg = errData.error || 'Failed to initialize upload session.';
      this.onProgress({
        status: 'error',
        percent: 0,
        uploadedBytes: 0,
        totalBytes: fileSize,
        speedBytesPerSec: 0,
        etaSeconds: 0,
        currentChunk: 0,
        totalChunks,
        error: msg,
      });
      throw new Error(msg);
    }

    const initData = await initRes.json();
    this.uploadId = initData.uploadId;
    const uploadId = initData.uploadId;

    // 2. Prepare chunk upload queue with speed tracking
    let completedBytes = 0;
    const chunkBytesUploaded = new Array(totalChunks).fill(0);
    const startTime = Date.now();
    let lastTime = startTime;
    let lastBytes = 0;
    let smoothedSpeed = 0;

    const updateStats = () => {
      const now = Date.now();
      const currentTotalUploaded = chunkBytesUploaded.reduce((acc, bytes) => acc + bytes, 0);
      const timeDiff = (now - lastTime) / 1000;

      if (timeDiff >= 0.5) {
        const bytesDiff = currentTotalUploaded - lastBytes;
        const currentSpeed = bytesDiff / timeDiff;
        smoothedSpeed = smoothedSpeed === 0 ? currentSpeed : smoothedSpeed * 0.7 + currentSpeed * 0.3;
        lastTime = now;
        lastBytes = currentTotalUploaded;
      }

      const remainingBytes = Math.max(0, fileSize - currentTotalUploaded);
      const effectiveSpeed = smoothedSpeed > 0 ? smoothedSpeed : (currentTotalUploaded / Math.max(0.1, (now - startTime) / 1000));
      const eta = effectiveSpeed > 0 ? Math.round(remainingBytes / effectiveSpeed) : 0;
      const percent = Math.min(99, Math.round((currentTotalUploaded / fileSize) * 100));

      this.onProgress({
        status: 'uploading',
        percent,
        uploadedBytes: currentTotalUploaded,
        totalBytes: fileSize,
        speedBytesPerSec: Math.round(effectiveSpeed),
        etaSeconds: eta,
        currentChunk: Math.min(totalChunks, Math.floor(currentTotalUploaded / chunkSize) + 1),
        totalChunks,
      });
    };

    // 3. Worker queue with concurrency = 2
    const queue = Array.from({ length: totalChunks }, (_, i) => i);
    const CONCURRENCY = 2;

    const uploadChunkWithRetry = async (chunkIndex: number, maxRetries = 3): Promise<void> => {
      const start = chunkIndex * chunkSize;
      const end = Math.min(fileSize, (chunkIndex + 1) * chunkSize);
      const chunkBlob = this.file.slice(start, end);
      const thisChunkSize = end - start;

      let attempt = 0;
      while (attempt <= maxRetries) {
        if (this.isAborted) throw new Error('Upload aborted');

        try {
          const res = await fetch(`/api/admin/upload-chunk/${uploadId}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.adminToken}`,
              'x-chunk-index': String(chunkIndex),
              'x-chunk-offset': String(start),
              'x-chunk-size': String(thisChunkSize),
              'Content-Type': 'application/octet-stream',
            },
            signal: this.abortController?.signal,
            body: chunkBlob,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Chunk ${chunkIndex} failed with status ${res.status}`);
          }

          // Chunk succeeded
          chunkBytesUploaded[chunkIndex] = thisChunkSize;
          completedBytes += thisChunkSize;
          updateStats();
          return;
        } catch (err: any) {
          if (this.isAborted) throw err;
          attempt++;
          if (attempt > maxRetries) {
            throw new Error(`Failed to upload chunk ${chunkIndex + 1} of ${totalChunks} after ${maxRetries} retries: ${err.message}`);
          }
          // Exponential backoff retry
          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, totalChunks) }, async () => {
      while (queue.length > 0) {
        if (this.isAborted) break;
        const chunkIndex = queue.shift();
        if (chunkIndex !== undefined) {
          await uploadChunkWithRetry(chunkIndex);
        }
      }
    });

    await Promise.all(workers);

    if (this.isAborted) {
      throw new Error('Upload was cancelled.');
    }

    // 4. Verification and completion
    this.onProgress({
      status: 'verifying',
      percent: 99,
      uploadedBytes: fileSize,
      totalBytes: fileSize,
      speedBytesPerSec: smoothedSpeed,
      etaSeconds: 1,
      currentChunk: totalChunks,
      totalChunks,
    });

    const compRes = await fetch(`/api/admin/upload-chunk/${uploadId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.adminToken}`,
      },
      signal: this.abortController?.signal,
      body: JSON.stringify({ uploadId }),
    });

    if (!compRes.ok) {
      const errData = await compRes.json().catch(() => ({}));
      const msg = errData.error || 'Failed to assemble uploaded PDF file.';
      this.onProgress({
        status: 'error',
        percent: 99,
        uploadedBytes: fileSize,
        totalBytes: fileSize,
        speedBytesPerSec: 0,
        etaSeconds: 0,
        currentChunk: totalChunks,
        totalChunks,
        error: msg,
      });
      throw new Error(msg);
    }

    const compData: ChunkUploadResult = await compRes.json();

    const finalResult: ChunkUploadProgress = {
      status: 'completed',
      percent: 100,
      uploadedBytes: fileSize,
      totalBytes: fileSize,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      currentChunk: totalChunks,
      totalChunks,
      result: compData,
    };
    this.onProgress(finalResult);

    return compData;
  }

  public abort(): void {
    this.isAborted = true;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.uploadId) {
      fetch(`/api/admin/upload-chunk/${this.uploadId}/abort`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.adminToken}`,
        },
      }).catch(() => {});
      this.uploadId = null;
    }
    this.onProgress({
      status: 'aborted',
      percent: 0,
      uploadedBytes: 0,
      totalBytes: this.file.size,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      currentChunk: 0,
      totalChunks: 0,
    });
  }
}
