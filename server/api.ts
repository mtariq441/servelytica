// Express API middleware for handling database requests
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import os from 'os';
import {
  profileRoutes,
  videoRoutes,
  coachRoutes,
  userRoleRoutes,
  subscriptionRoutes,
  videoFeedbackRoutes,
  commentRoutes,
  reactionRoutes,
  bookmarkRoutes,
  surveyRoutes,
  connectionRequestRoutes,
  connectionRoutes,
  analysisSessionRoutes,
  featuredCoachesRoutes,
  videoAnalysisRoutes,
} from './routes';

const sendJson = (res: any, data: any, status = 200) => {
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(status);
  res.end(JSON.stringify(data));
};

const sendError = (res: any, error: any, status = 400) => {
  sendJson(res, { error: error instanceof Error ? error.message : 'Unknown error' }, status);
};

export function setupApiRoutes(app: any) {
  // Profile endpoints
  app.get('/api/profiles/:userId', async (req: any, res: any) => {
    try {
      const profile = await profileRoutes.getProfile(req.params.userId);
      if (!profile) {
        return sendError(res, 'Profile not found', 404);
      }
      sendJson(res, profile);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/profiles/:userId', async (req: any, res: any) => {
    try {
      const profile = await profileRoutes.updateProfile(req.params.userId, req.body);
      sendJson(res, profile);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/profiles', async (req: any, res: any) => {
    try {
      const profile = await profileRoutes.createProfile(req.body);
      sendJson(res, profile, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Video endpoints
  app.get('/api/videos', async (req: any, res: any) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return sendError(res, 'userId query parameter required', 400);
      }
      const videos = await videoRoutes.getVideos(userId);
      sendJson(res, videos);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/videos/:videoId', async (req: any, res: any) => {
    try {
      const video = await videoRoutes.getVideo(req.params.videoId);
      if (!video) {
        return sendError(res, 'Video not found', 404);
      }
      sendJson(res, video);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Video upload endpoint - handles file uploads via base64 and AUTOMATIC AI-BASED MOTION ANALYSIS
  // NOTE: Frontend verifies user via Supabase auth before calling this endpoint
  // AI Analysis: Automatically analyzes uploaded videos for technique, footwork, and game performance
  app.post('/api/videos/upload', async (req: any, res: any) => {
    let videoData: any = null;
    let tempFilePath: string | null = null;

    try {
      const { file, fileName, fileSize, userId, title, description, focusArea, coachIds } = req.body;

      if (!file || !userId) {
        return sendError(res, 'Missing file or userId', 400);
      }

      if (!fileName) {
        return sendError(res, 'Missing fileName', 400);
      }

      // Basic validation: userId should be a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return sendError(res, 'Invalid userId format', 400);
      }

      // Decode base64 to buffer
      let fileData;
      try {
        fileData = Buffer.from(file, 'base64');
      } catch (e) {
        return sendError(res, 'Invalid base64 encoded file', 400);
      }

      // Create filename with timestamp
      const timestamp = Date.now();
      const ext = fileName.split('.').pop() || 'bin';
      const filePath = `${userId}/${timestamp}.${ext}`;

      // Create temp directory for video storage
      const os = await import('os');
      const tmpDir = os.tmpdir();
      tempFilePath = `${tmpDir}/video_${timestamp}.${ext}`;

      console.log(`[UPLOAD] Processing video upload: ${filePath} (${fileData.length} bytes)`);
      console.log(`[UPLOAD] Saving to temporary path: ${tempFilePath}`);

      // Save video file temporarily for AI analysis
      fs.writeFileSync(tempFilePath, fileData);

      // Create video record in database with "analyzing" status
      videoData = {
        userId: userId,
        filePath: filePath,
        fileName: fileName,
        fileSize: fileData.length,
        title: title || null,
        description: description || null,
        focusArea: focusArea || null,
        analyzed: false,
        uploadedAt: new Date()
      };

      console.log(`[UPLOAD] Video data to insert:`, videoData);

      let createdVideo;
      try {
        createdVideo = await videoRoutes.createVideo(videoData);
      } catch (dbError) {
        console.error(`[UPLOAD] Database error creating video:`, dbError);
        throw new Error(`Failed to create video record: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }

      if (!createdVideo) {
        throw new Error('Failed to create video record in database - returned null');
      }

      console.log(`[UPLOAD] Video record created with ID: ${createdVideo.id}`);

      // AUTOMATIC AI-BASED MOTION ANALYSIS
      let motionAnalysis = null;
      try {
        const { analyzeMotionAndGameVideo } = await import('./motion-analysis');
        console.log(`[UPLOAD] Starting automatic motion analysis for video ${createdVideo.id}...`);

        motionAnalysis = await analyzeMotionAndGameVideo(tempFilePath, {
          title,
          description,
          focusArea
        });

        console.log(`[UPLOAD] Motion analysis completed. Score: ${motionAnalysis.overallScore}`);

        // Update video with analysis results
        await videoRoutes.updateVideo(createdVideo.id, {
          analyzed: true
        });

        createdVideo.analyzed = true;

        console.log(`[UPLOAD] Video analysis results saved to database`);
      } catch (analysisError) {
        console.warn('[UPLOAD] Warning: Automatic motion analysis failed, but video was created:', analysisError);
        // Don't fail the upload - video is still created successfully
      }

      // Assign coaches if provided
      if (coachIds && Array.isArray(coachIds) && coachIds.length > 0) {
        try {
          const { db } = await import('./db');
          const { videoCoaches } = await import('@shared/schema');

          const coachAssignments = coachIds.map((coachId: string) => ({
            videoId: createdVideo.id,
            coachId: coachId,
            status: 'pending'
          }));

          console.log(`[UPLOAD] Assigning coaches:`, coachAssignments);
          await db.insert(videoCoaches).values(coachAssignments);
          console.log(`[UPLOAD] Coaches assigned successfully`);
        } catch (coachError) {
          console.warn('[UPLOAD] Warning: Failed to assign coaches, but video was created:', coachError);
          // Don't fail the entire upload if coach assignment fails
        }
      }

      const response = {
        success: true,
        video: createdVideo,
        filePath: filePath,
        fileName: fileName,
        size: fileData.length,
        analysis: motionAnalysis || null
      };

      console.log(`[UPLOAD] Sending response with analysis data`);
      sendJson(res, response, 201);
    } catch (error) {
      console.error('[UPLOAD] Error uploading file:', error);
      console.error('[UPLOAD] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      sendError(res, error, 500);
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`[UPLOAD] Temporary video file cleaned up`);
        } catch (cleanupError) {
          console.warn('[UPLOAD] Failed to clean up temporary file:', cleanupError);
        }
      }
    }
  });

  // Configure multer for streaming uploads (no memory buffering)
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const tmpDir = os.tmpdir();
      cb(null, tmpDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `video_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 10GB limit - supports large training videos
  });

  // Chunked video upload endpoint - supports large files (5GB+) via streaming
  // Uses multipart/form-data instead of base64 to avoid memory issues
  app.post('/api/videos/upload-chunked', upload.single('video'), async (req: any, res: any) => {
    try {
      // AUTHENTICATION: Verify authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Clean up uploaded file if authentication fails
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return sendError(res, 'Unauthorized: Missing or invalid authorization token', 401);
      }

      const token = authHeader.substring(7);

      // Verify token with Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('[CHUNKED-UPLOAD] Missing Supabase configuration');
        // Clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return sendError(res, 'Server configuration error', 500);
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        // Clean up uploaded file if authentication fails
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return sendError(res, 'Unauthorized: Invalid token', 401);
      }

      const { userId, title, description, focusArea, coachIds } = req.body;
      const uploadedFile = req.file;
      
      if (!uploadedFile) {
        return sendError(res, 'No video file uploaded', 400);
      }
      
      if (!userId) {
        // Clean up uploaded file
        if (fs.existsSync(uploadedFile.path)) {
          fs.unlinkSync(uploadedFile.path);
        }
        return sendError(res, 'Missing userId', 400);
      }
      
      // AUTHORIZATION: Verify the userId matches the authenticated user
      if (userId !== user.id) {
        // Clean up uploaded file
        if (fs.existsSync(uploadedFile.path)) {
          fs.unlinkSync(uploadedFile.path);
        }
        return sendError(res, 'Forbidden: Cannot upload video for another user', 403);
      }
      
      // Validate userId format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        // Clean up uploaded file
        if (fs.existsSync(uploadedFile.path)) {
          fs.unlinkSync(uploadedFile.path);
        }
        return sendError(res, 'Invalid userId format', 400);
      }
      
      const tempFilePath = uploadedFile.path;
      const fileName = uploadedFile.originalname;
      const fileSize = uploadedFile.size;
      
      console.log(`[CHUNKED-UPLOAD] Processing video: ${fileName} (${fileSize} bytes)`);
      console.log(`[CHUNKED-UPLOAD] Temporary path: ${tempFilePath}`);
      
      // Create permanent storage directory
      const storageDir = path.join(process.cwd(), 'uploaded_videos', userId);
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      
      // Create filename with timestamp
      const timestamp = Date.now();
      const ext = fileName.split('.').pop() || 'bin';
      const permanentFileName = `${timestamp}.${ext}`;
      const permanentFilePath = path.join(storageDir, permanentFileName);
      const relativePath = `uploaded_videos/${userId}/${permanentFileName}`;
      
      // Move file from temp to permanent storage
      try {
        fs.renameSync(tempFilePath, permanentFilePath);
        console.log(`[CHUNKED-UPLOAD] Moved file to permanent storage: ${permanentFilePath}`);
      } catch (moveError) {
        console.error(`[CHUNKED-UPLOAD] Failed to move file to permanent storage:`, moveError);
        // Clean up temp file if move failed
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        throw new Error(`Failed to save video file: ${moveError instanceof Error ? moveError.message : String(moveError)}`);
      }
      
      // Create video record in database with permanent path
      const videoData = {
        userId: userId,
        filePath: relativePath,
        fileName: fileName,
        fileSize: fileSize,
        title: title || null,
        description: description || null,
        focusArea: focusArea || null,
        analyzed: false,
        uploadedAt: new Date()
      };
      
      console.log(`[CHUNKED-UPLOAD] Video data to insert:`, videoData);
      
      let createdVideo;
      try {
        createdVideo = await videoRoutes.createVideo(videoData);
      } catch (dbError) {
        console.error(`[CHUNKED-UPLOAD] Database error creating video:`, dbError);
        // Clean up permanent file if DB insert failed
        if (fs.existsSync(permanentFilePath)) {
          fs.unlinkSync(permanentFilePath);
        }
        throw new Error(`Failed to create video record: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }
      
      if (!createdVideo) {
        // Clean up permanent file if DB insert returned null
        if (fs.existsSync(permanentFilePath)) {
          fs.unlinkSync(permanentFilePath);
        }
        throw new Error('Failed to create video record in database - returned null');
      }
      
      console.log(`[CHUNKED-UPLOAD] Video record created with ID: ${createdVideo.id}`);
      
      // AUTOMATIC AI-BASED MOTION ANALYSIS
      // Skip analysis for files larger than 100MB to avoid memory issues
      const MAX_ANALYSIS_SIZE = 100 * 1024 * 1024; // 100MB
      let motionAnalysis = null;
      
      if (fileSize <= MAX_ANALYSIS_SIZE) {
        try {
          const { analyzeMotionAndGameVideo } = await import('./motion-analysis');
          console.log(`[CHUNKED-UPLOAD] Starting automatic motion analysis for video ${createdVideo.id}...`);
          
          motionAnalysis = await analyzeMotionAndGameVideo(permanentFilePath, {
            title,
            description,
            focusArea
          });
          
          console.log(`[CHUNKED-UPLOAD] Motion analysis completed. Score: ${motionAnalysis.overallScore}`);
          
          // Update video with analysis results
          await videoRoutes.updateVideo(createdVideo.id, {
            analyzed: true
          });
          
          createdVideo.analyzed = true;
          
          console.log(`[CHUNKED-UPLOAD] Video analysis results saved to database`);
        } catch (analysisError) {
          console.warn('[CHUNKED-UPLOAD] Warning: Automatic motion analysis failed, but video was created:', analysisError);
          // Don't fail the upload - video is still created successfully
        }
      } else {
        console.log(`[CHUNKED-UPLOAD] Skipping automatic analysis for large file (${fileSize} bytes > ${MAX_ANALYSIS_SIZE} bytes)`);
      }
      
      // Assign coaches if provided
      if (coachIds) {
        try {
          const coachIdsArray = typeof coachIds === 'string' ? JSON.parse(coachIds) : coachIds;
          
          if (Array.isArray(coachIdsArray) && coachIdsArray.length > 0) {
            const { db } = await import('./db');
            const { videoCoaches } = await import('@shared/schema');
            
            const coachAssignments = coachIdsArray.map((coachId: string) => ({
              videoId: createdVideo.id,
              coachId: coachId,
              status: 'pending'
            }));
            
            console.log(`[CHUNKED-UPLOAD] Assigning coaches:`, coachAssignments);
            await db.insert(videoCoaches).values(coachAssignments);
            console.log(`[CHUNKED-UPLOAD] Coaches assigned successfully`);
          }
        } catch (coachError) {
          console.warn('[CHUNKED-UPLOAD] Warning: Failed to assign coaches, but video was created:', coachError);
          // Don't fail the entire upload if coach assignment fails
        }
      }
      
      // Note: temp file was already moved to permanent storage via fs.renameSync
      // This cleanup is a failsafe in case the rename didn't work
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log(`[CHUNKED-UPLOAD] Cleaned up remaining temporary file`);
        }
      } catch (cleanupError) {
        console.warn('[CHUNKED-UPLOAD] Failed to clean up temporary file:', cleanupError);
      }
      
      const response = {
        success: true,
        video: createdVideo,
        filePath: relativePath,
        permanentPath: permanentFilePath,
        fileName: fileName,
        size: fileSize,
        analysis: motionAnalysis || null,
        analysisSkipped: fileSize > MAX_ANALYSIS_SIZE
      };
      
      console.log(`[CHUNKED-UPLOAD] Upload complete, sending response`);
      sendJson(res, response, 201);
    } catch (error) {
      console.error('[CHUNKED-UPLOAD] Error uploading file:', error);
      console.error('[CHUNKED-UPLOAD] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      
      // Clean up temp file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn('[CHUNKED-UPLOAD] Failed to clean up temp file after error:', cleanupError);
        }
      }
      
      sendError(res, error, 500);
    }
  });

  app.post('/api/videos', async (req: any, res: any) => {
    try {
      const video = await videoRoutes.createVideo(req.body);
      sendJson(res, video, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/videos/:videoId', async (req: any, res: any) => {
    try {
      const video = await videoRoutes.updateVideo(req.params.videoId, req.body);
      sendJson(res, video);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/videos/:videoId', async (req: any, res: any) => {
    try {
      const result = await videoRoutes.deleteVideo(req.params.videoId);
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // AI Analysis endpoint for existing videos (e.g. after chunked upload)
  app.post('/api/videos/:videoId/analyze', async (req: any, res: any) => {
    try {
      const { videoId } = req.params;
      const { videoPath, sport } = req.body;

      if (!videoPath) {
        return sendError(res, 'videoPath is required', 400);
      }

      console.log(`[ANALYSIS] Starting analysis for video ${videoId} at path ${videoPath}`);

      const { analyzeVideo } = await import('./gemini-video-analysis');
      const analysisResult = await analyzeVideo(videoPath);

      // Update video record with analysis status
      await videoRoutes.updateVideo(videoId, { analyzed: true });

      sendJson(res, { success: true, analysis: analysisResult });
    } catch (error) {
      console.error('[ANALYSIS] Error analyzing video:', error);
      sendError(res, error, 500);
    }
  });

  // Coach endpoints
  // Coach endpoints - COMPLETE CRUD
  app.get('/api/coaches/profile/:userId', async (req: any, res: any) => {
    try {
      const coach = await coachRoutes.getCoachProfile(req.params.userId);
      if (!coach) {
        return sendError(res, 'Coach profile not found', 404);
      }
      sendJson(res, coach);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/coaches/:coachId', async (req: any, res: any) => {
    try {
      const coach = await coachRoutes.getCoachById(req.params.coachId);
      if (!coach) {
        return sendError(res, 'Coach not found', 404);
      }
      sendJson(res, coach);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/coaches', async (req: any, res: any) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const coaches = await coachRoutes.getAllCoaches(limit);
      sendJson(res, coaches);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/coaches', async (req: any, res: any) => {
    try {
      const coach = await coachRoutes.createCoachProfile(req.body);
      sendJson(res, coach, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/coaches/profile/:userId', async (req: any, res: any) => {
    try {
      const coach = await coachRoutes.updateCoachProfile(req.params.userId, req.body);
      sendJson(res, coach);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/coaches/profile/:userId', async (req: any, res: any) => {
    try {
      const result = await coachRoutes.deleteCoachProfile(req.params.userId);
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/coaches/search/:query', async (req: any, res: any) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const coaches = await coachRoutes.searchCoaches(req.params.query, limit);
      sendJson(res, coaches);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Get coach's assigned videos from videoCoaches table
  app.get('/api/coaches/:coachId/videos', async (req: any, res: any) => {
    try {
      const coachId = req.params.coachId;
      const { db } = await import('./db');
      const { videoCoaches, videos } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Query videoCoaches table and join with videos table
      const coachVideos = await db
        .select({
          videoId: videoCoaches.videoId,
          coachId: videoCoaches.coachId,
          status: videoCoaches.status,
          assignedAt: videoCoaches.createdAt,
          video: videos
        })
        .from(videoCoaches)
        .leftJoin(videos, eq(videoCoaches.videoId, videos.id))
        .where(eq(videoCoaches.coachId, coachId));
      
      console.log(`[COACH-VIDEOS] Found ${coachVideos.length} videos for coach ${coachId}`);
      sendJson(res, coachVideos);
    } catch (error) {
      console.error('[COACH-VIDEOS] Error fetching coach videos:', error);
      sendError(res, error);
    }
  });

  // User Roles endpoints
  app.get('/api/user-roles/:userId', async (req: any, res: any) => {
    try {
      const roles = await userRoleRoutes.getUserRoles(req.params.userId);
      sendJson(res, roles);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Subscription endpoints
  app.get('/api/subscriptions/:userId', async (req: any, res: any) => {
    try {
      const subscription = await subscriptionRoutes.getUserSubscription(req.params.userId);
      sendJson(res, subscription);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/pricing', async (req: any, res: any) => {
    try {
      const plans = await subscriptionRoutes.getPricingPlans();
      sendJson(res, plans);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Video Feedback endpoints
  app.get('/api/feedback/:videoId', async (req: any, res: any) => {
    try {
      const feedback = await videoFeedbackRoutes.getFeedback(req.params.videoId);
      sendJson(res, feedback);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/feedback', async (req: any, res: any) => {
    try {
      const feedback = await videoFeedbackRoutes.createFeedback(req.body);
      sendJson(res, feedback, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/feedback/:feedbackId', async (req: any, res: any) => {
    try {
      const feedback = await videoFeedbackRoutes.updateFeedback(req.params.feedbackId, req.body);
      sendJson(res, feedback);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/feedback/:feedbackId', async (req: any, res: any) => {
    try {
      const result = await videoFeedbackRoutes.deleteFeedback(req.params.feedbackId);
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Comments endpoints
  app.get('/api/comments/:articleId', async (req: any, res: any) => {
    try {
      const cmts = await commentRoutes.getComments(req.params.articleId);
      sendJson(res, cmts);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/comments', async (req: any, res: any) => {
    try {
      const comment = await commentRoutes.createComment(req.body);
      sendJson(res, comment, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/comments/:commentId', async (req: any, res: any) => {
    try {
      const comment = await commentRoutes.updateComment(req.params.commentId, req.body);
      sendJson(res, comment);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/comments/:commentId', async (req: any, res: any) => {
    try {
      const result = await commentRoutes.deleteComment(req.params.commentId);
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Reactions endpoints
  app.get('/api/reactions', async (req: any, res: any) => {
    try {
      const contentType = req.query.contentType;
      const contentId = req.query.contentId;
      if (!contentType || !contentId) {
        return sendError(res, 'contentType and contentId required', 400);
      }
      const reacts = await reactionRoutes.getReactions(contentType, contentId);
      sendJson(res, reacts);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/reactions', async (req: any, res: any) => {
    try {
      const reaction = await reactionRoutes.addReaction(req.body);
      sendJson(res, reaction, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/reactions', async (req: any, res: any) => {
    try {
      const result = await reactionRoutes.removeReaction(
        req.query.userId,
        req.query.contentType,
        req.query.contentId
      );
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Bookmarks endpoints
  app.get('/api/bookmarks/:userId', async (req: any, res: any) => {
    try {
      const bm = await bookmarkRoutes.getBookmarks(req.params.userId);
      sendJson(res, bm);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/bookmarks', async (req: any, res: any) => {
    try {
      const bookmark = await bookmarkRoutes.addBookmark(req.body);
      sendJson(res, bookmark, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/bookmarks', async (req: any, res: any) => {
    try {
      const result = await bookmarkRoutes.removeBookmark(
        req.query.userId,
        req.query.contentType,
        req.query.contentId
      );
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Survey endpoints - COMPLETE CRUD
  app.get('/api/surveys/:userId', async (req: any, res: any) => {
    try {
      const survey = await surveyRoutes.getSurveyResponse(req.params.userId);
      if (!survey) {
        return sendJson(res, null);
      }
      sendJson(res, survey);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/surveys', async (req: any, res: any) => {
    try {
      const survey = await surveyRoutes.createSurveyResponse(req.body);
      sendJson(res, survey, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/surveys/:userId', async (req: any, res: any) => {
    try {
      const survey = await surveyRoutes.updateSurveyResponse(req.params.userId, req.body);
      sendJson(res, survey);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/surveys/:userId', async (req: any, res: any) => {
    try {
      const result = await surveyRoutes.deleteSurveyResponse(req.params.userId);
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Connection Requests endpoints - COMPLETE CRUD
  app.get('/api/connection-requests/received/:userId', async (req: any, res: any) => {
    try {
      const requests = await connectionRequestRoutes.getReceivedRequests(req.params.userId);
      sendJson(res, requests);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/connection-requests/sent/:userId', async (req: any, res: any) => {
    try {
      const requests = await connectionRequestRoutes.getSentRequests(req.params.userId);
      sendJson(res, requests);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/connection-requests', async (req: any, res: any) => {
    try {
      const request = await connectionRequestRoutes.createConnectionRequest(req.body);
      sendJson(res, request, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/connection-requests/:requestId', async (req: any, res: any) => {
    try {
      const request = await connectionRequestRoutes.updateConnectionRequest(req.params.requestId, req.body);
      sendJson(res, request);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/connection-requests/:requestId', async (req: any, res: any) => {
    try {
      const result = await connectionRequestRoutes.deleteConnectionRequest(req.params.requestId);
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Connections endpoints - COMPLETE CRUD
  app.get('/api/connections/:userId', async (req: any, res: any) => {
    try {
      const conns = await connectionRoutes.getUserConnections(req.params.userId);
      sendJson(res, conns);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/connections', async (req: any, res: any) => {
    try {
      const conn = await connectionRoutes.createConnection(req.body);
      sendJson(res, conn, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/connections/:connectionId', async (req: any, res: any) => {
    try {
      const conn = await connectionRoutes.updateConnection(req.params.connectionId, req.body);
      sendJson(res, conn);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/connections/:connectionId', async (req: any, res: any) => {
    try {
      const result = await connectionRoutes.deleteConnection(req.params.connectionId);
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Analysis Session endpoints - COMPLETE CRUD
  app.get('/api/analysis-sessions/:userId/:role', async (req: any, res: any) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const sessions = await analysisSessionRoutes.getSessions(
        req.params.userId,
        req.params.role as 'coach' | 'player',
        limit
      );
      sendJson(res, sessions);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/analysis-sessions/:sessionId', async (req: any, res: any) => {
    try {
      const session = await analysisSessionRoutes.getSessionById(req.params.sessionId);
      if (!session) {
        return sendError(res, 'Session not found', 404);
      }
      sendJson(res, session);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/analysis-sessions', async (req: any, res: any) => {
    try {
      const session = await analysisSessionRoutes.createSession(req.body);
      sendJson(res, session, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/analysis-sessions/:sessionId', async (req: any, res: any) => {
    try {
      const session = await analysisSessionRoutes.updateSession(req.params.sessionId, req.body);
      sendJson(res, session);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/analysis-sessions/:sessionId', async (req: any, res: any) => {
    try {
      const result = await analysisSessionRoutes.deleteSession(req.params.sessionId);
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Session Comments endpoints
  app.post('/api/analysis-sessions/:sessionId/comments', async (req: any, res: any) => {
    try {
      const comment = await analysisSessionRoutes.addSessionComment(req.body);
      sendJson(res, comment, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/analysis-sessions/:sessionId/comments', async (req: any, res: any) => {
    try {
      const comments = await analysisSessionRoutes.getSessionComments(req.params.sessionId);
      sendJson(res, comments);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/analysis-sessions/:sessionId/comments/:commentId', async (req: any, res: any) => {
    try {
      const result = await analysisSessionRoutes.deleteSessionComment(req.params.commentId);
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Session Notes endpoints
  app.post('/api/analysis-sessions/:sessionId/notes', async (req: any, res: any) => {
    try {
      const note = await analysisSessionRoutes.addSessionNote(req.body);
      sendJson(res, note, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/analysis-sessions/:sessionId/notes', async (req: any, res: any) => {
    try {
      const notes = await analysisSessionRoutes.getSessionNotes(req.params.sessionId);
      sendJson(res, notes);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/analysis-sessions/:sessionId/notes/:noteId', async (req: any, res: any) => {
    try {
      const result = await analysisSessionRoutes.deleteSessionNote(req.params.noteId);
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Featured Coaches endpoints (most specific routes first)
  app.get('/api/featured-coaches/search', async (req: any, res: any) => {
    try {
      const query = req.query.query || '';
      const results = await featuredCoachesRoutes.searchCoaches(query);
      sendJson(res, results);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/featured-coaches', async (req: any, res: any) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const coaches = await featuredCoachesRoutes.getFeaturedCoaches(limit);
      sendJson(res, coaches);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/featured-coaches', async (req: any, res: any) => {
    try {
      const coach = await featuredCoachesRoutes.addFeaturedCoach(req.body);
      sendJson(res, coach, 201);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/featured-coaches/:coachId', async (req: any, res: any) => {
    try {
      const coach = await featuredCoachesRoutes.getFeaturedCoachById(req.params.coachId);
      if (!coach) {
        return sendError(res, 'Featured coach not found', 404);
      }
      sendJson(res, coach);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/featured-coaches/:coachId', async (req: any, res: any) => {
    try {
      const coach = await featuredCoachesRoutes.updateFeaturedCoach(req.params.coachId, req.body);
      sendJson(res, coach);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/featured-coaches/:coachId', async (req: any, res: any) => {
    try {
      const result = await featuredCoachesRoutes.removeFeaturedCoach(req.params.coachId);
      sendJson(res, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/profile/:userId', async (req: any, res: any) => {
    try {
      const profile = await profileRoutes.updateProfile(req.params.userId, req.body);
      sendJson(res, profile);
    } catch (error) {
      sendError(res, error);
    }
  });

  // Video Analysis endpoints - Gemini AI powered analysis
  app.post('/api/videos/:videoId/analyze', async (req: any, res: any) => {
    try {
      const videoId = req.params.videoId;
      const { videoPath } = req.body;

      if (!videoPath) {
        return sendError(res, 'videoPath is required', 400);
      }

      const analysis = await videoAnalysisRoutes.analyzeVideo(videoPath);

      // Optionally save analysis results to database
      await videoRoutes.updateVideo(videoId, {
        analysisStatus: 'completed',
        analysisResults: analysis,
      });

      sendJson(res, { videoId, analysis }, 200);
    } catch (error) {
      console.error('Video analysis error:', error);
      sendError(res, error, 500);
    }
  });

  app.post('/api/videos/:videoId/quick-feedback', async (req: any, res: any) => {
    try {
      const { videoPath } = req.body;

      if (!videoPath) {
        return sendError(res, 'videoPath is required', 400);
      }

      const feedback = await videoAnalysisRoutes.getQuickFeedback(videoPath);
      sendJson(res, { feedback }, 200);
    } catch (error) {
      console.error('Quick feedback error:', error);
      sendError(res, error, 500);
    }
  });

  app.post('/api/videos/compare', async (req: any, res: any) => {
    try {
      const { videoPaths, description } = req.body;

      if (!videoPaths || !Array.isArray(videoPaths) || videoPaths.length === 0) {
        return sendError(res, 'videoPaths array is required', 400);
      }

      const comparison = await videoAnalysisRoutes.compareVideoSegments(videoPaths, description || '');
      sendJson(res, { comparison }, 200);
    } catch (error) {
      console.error('Video comparison error:', error);
      sendError(res, error, 500);
    }
  });

  // Admin setup endpoint - Creates admin user role in database
  // This endpoint is for initializing an admin user after they sign up in Supabase
  app.post('/api/admin/setup', async (req: any, res: any) => {
    try {
      const { userId, email, displayName } = req.body;

      if (!userId || !email) {
        return sendError(res, 'userId and email required', 400);
      }

      // Import supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      // Get or create profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!existingProfile) {
        await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            username: email.split('@')[0],
            display_name: displayName || email.split('@')[0],
            email: email
          });
      }

      // Create admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      if (!existingRole) {
        await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'admin'
          });
      }

      sendJson(res, {
        success: true,
        message: 'Admin user created successfully',
        userId,
        email
      }, 201);
    } catch (error) {
      console.error('Admin setup error:', error);
      sendError(res, error, 500);
    }
  });

  // Serve uploaded videos from permanent storage
  // SECURITY: Requires authentication via Authorization header
  app.get('/api/videos/stream/:userId/:fileName', async (req: any, res: any) => {
    try {
      const { userId, fileName } = req.params;
      
      // Verify authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, 'Unauthorized: Missing or invalid authorization token', 401);
      }
      
      // Extract and verify the token (Supabase JWT)
      const token = authHeader.substring(7);
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          console.error('[VIDEO-STREAM] Missing Supabase configuration');
          return sendError(res, 'Server configuration error', 500);
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          return sendError(res, 'Unauthorized: Invalid token', 401);
        }
        
        // Verify user has access to this video (must be owner or coach)
        const { db } = await import('./db');
        const { videos, videoCoaches } = await import('@shared/schema');
        const { eq, or, and } = await import('drizzle-orm');
        
        const videoRecord = await db.query.videos.findFirst({
          where: and(
            eq(videos.userId, userId),
            eq(videos.fileName, fileName)
          )
        });
        
        if (!videoRecord) {
          return sendError(res, 'Video not found', 404);
        }
        
        // Check if user is owner or assigned coach
        const isOwner = videoRecord.userId === user.id;
        const coachAssignment = await db.query.videoCoaches.findFirst({
          where: and(
            eq(videoCoaches.videoId, videoRecord.id),
            eq(videoCoaches.coachId, user.id)
          )
        });
        
        if (!isOwner && !coachAssignment) {
          return sendError(res, 'Forbidden: You do not have access to this video', 403);
        }
      } catch (authError) {
        console.error('[VIDEO-STREAM] Authentication error:', authError);
        return sendError(res, 'Authentication failed', 401);
      }
      
      const videoPath = path.join(process.cwd(), 'uploaded_videos', userId, fileName);
      
      if (!fs.existsSync(videoPath)) {
        return sendError(res, 'Video file not found on disk', 404);
      }
      
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      }
    } catch (error) {
      console.error('[VIDEO-STREAM] Error streaming video:', error);
      sendError(res, error, 500);
    }
  });
}
