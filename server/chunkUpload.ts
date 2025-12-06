import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Initialize upload session
router.post('/upload/init', async (req, res) => {
  try {
    const { userId, fileName } = req.body;
    if (!userId || !fileName) {
      return res.status(400).json({ error: 'Missing userId or fileName' });
    }

    const fileId = `${userId}_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const uploadPath = path.join(UPLOAD_DIR, fileId);

    // Create directory for this specific upload to store chunks
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    res.json({ uploadId: fileId });
  } catch (error) {
    console.error('Upload init error:', error);
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});

// Handle individual chunk
router.post('/upload/chunk', async (req, res) => {
  try {
    const uploadId = req.headers['x-upload-id'] || req.query.uploadId;
    const chunkIndex = req.headers['x-chunk-index'] || req.query.chunkIndex;

    if (!uploadId || chunkIndex === undefined) {
      return res.status(400).json({ error: 'Missing uploadId or chunkIndex' });
    }

    const chunkPath = path.join(UPLOAD_DIR, String(uploadId), `part_${chunkIndex}`);
    const writeStream = fs.createWriteStream(chunkPath);

    req.pipe(writeStream);

    req.on('end', () => {
      res.json({ success: true });
    });

    req.on('error', (err) => {
      console.error('Chunk upload error:', err);
      res.status(500).json({ error: 'Chunk upload failed' });
    });
  } catch (error) {
    console.error('Upload chunk error:', error);
    res.status(500).json({ error: 'Failed to upload chunk' });
  }
});

// Complete upload and assemble file
router.post('/upload/complete', async (req, res) => {
  try {
    const { uploadId, totalChunks } = req.body;

    if (!uploadId || totalChunks === undefined) {
      return res.status(400).json({ error: 'Missing uploadId or totalChunks' });
    }

    const uploadPath = path.join(UPLOAD_DIR, String(uploadId));
    const finalFilePath = path.join(UPLOAD_DIR, `${uploadId}.mp4`); // Assuming mp4, ideally get from init metadata
    const writeStream = fs.createWriteStream(finalFilePath);

    let currentChunk = 0;

    const processNextChunk = () => {
      if (currentChunk >= totalChunks) {
        writeStream.end();
        // Cleanup chunks directory
        fs.rm(uploadPath, { recursive: true, force: true }, (err) => {
          if (err) console.error('Error cleaning up chunks:', err);
        });

        return res.json({
          success: true,
          filePath: `/uploads/${uploadId}.mp4`,
          absolutePath: finalFilePath,
          uploadId: uploadId
        });
      }

      const chunkPath = path.join(uploadPath, `part_${currentChunk}`);
      if (!fs.existsSync(chunkPath)) {
        return res.status(400).json({ error: `Missing chunk ${currentChunk}` });
      }

      const readStream = fs.createReadStream(chunkPath);
      readStream.pipe(writeStream, { end: false });
      readStream.on('end', () => {
        currentChunk++;
        processNextChunk();
      });
      readStream.on('error', (err) => {
        console.error('Stream error:', err);
        res.status(500).json({ error: 'Error assembling file' });
      });
    };

    processNextChunk();

  } catch (error) {
    console.error('Upload complete error:', error);
    res.status(500).json({ error: 'Failed to complete upload' });
  }
});

export default router;