
// Upload service - uploads directly to Supabase storage
import { supabase } from '@/integrations/supabase/client';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

/**
 * Uploads a file using chunked upload to the backend server (for large files)
 * or Supabase storage (for images/small files)
 * @param file The file to upload
 * @param userId The user ID
 * @param formData Additional form data (title, description, focusArea, coachIds)
 * @returns Object with success status, video data, file path and error if any
 */
export const uploadFileToStorage = async (
  file: File,
  userId: string,
  formData?: {
    title?: string;
    description?: string;
    focusArea?: string;
    coachIds?: string[];
  },
  onProgress?: (progress: number) => void
) => {
  try {
    console.log('Starting upload for user:', userId);

    // Check if it's a video (large file)
    const isVideo = file.type.startsWith('video/');

    if (isVideo) {
      return await uploadLargeFile(file, userId, formData, onProgress);
    } else {
      return await uploadImageToSupabase(file, userId, formData);
    }
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

// Helper for large file chunked upload
const uploadLargeFile = async (
  file: File,
  userId: string,
  formData?: any,
  onProgress?: (progress: number) => void
) => {
  try {
    // 1. Initialize upload
    const initResponse = await fetch('/api/upload/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fileName: file.name })
    });

    if (!initResponse.ok) throw new Error('Failed to initialize upload');
    const { uploadId } = await initResponse.json();

    // 2. Upload chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const chunkResponse = await fetch(`/api/upload/chunk?uploadId=${uploadId}&chunkIndex=${i}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-upload-id': uploadId,
          'x-chunk-index': String(i)
        },
        body: chunk
      });

      if (!chunkResponse.ok) throw new Error(`Failed to upload chunk ${i}`);

      // Report progress
      const progress = Math.round(((i + 1) / totalChunks) * 100);
      console.log(`Upload progress: ${progress}%`);
      if (onProgress) onProgress(progress);
    }

    // 3. Complete upload
    const completeResponse = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, totalChunks })
    });

    if (!completeResponse.ok) throw new Error('Failed to complete upload');
    const { filePath } = await completeResponse.json();

    console.log('File uploaded successfully to server:', filePath);

    // 4. Create database record
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: userId,
        file_path: filePath, // This is the local server path e.g. /uploads/xxx.mp4
        file_name: file.name,
        file_size: file.size,
        title: formData?.title || file.name.replace(/\.[^/.]+$/, ""),
        description: formData?.description || null,
        focus_area: formData?.focusArea || null,
        analyzed: false
      })
      .select()
      .single();

    if (videoError) throw videoError;

    // 5. Assign coaches
    if (formData?.coachIds && formData.coachIds.length > 0 && video?.id) {
      await assignCoachesToVideo(video.id, formData.coachIds);
    }

    return {
      success: true,
      filePath: filePath,
      video: video
    };

  } catch (error: any) {
    console.error('Large file upload error:', error);
    throw error;
  }
};

// Helper for image upload (keep existing Supabase logic)
const uploadImageToSupabase = async (
  file: File,
  userId: string,
  formData?: any
) => {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `images/${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('videos') // Using same bucket for now, or change to 'images' if exists
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type
    });

  if (uploadError) throw uploadError;

  // For images, we might not create a video record, or we treat it as a video?
  // The original code treated everything as video/media.
  // Let's assume we save it to videos table too if it's media.

  // But wait, the original code used 'videos' bucket for everything.
  // If it's an image, we probably still want to save it.

  return {
    success: true,
    filePath: filePath,
    video: null // Or create record if needed
  };
};

/**
 * Saves a media record in the database
 */
export const saveMediaRecord = async (
  userId: string,
  filePath: string,
  file: File,
  mediaType: 'video' | 'image'
) => {
  try {
    const { error } = await supabase
      .from('videos')
      .insert({
        user_id: userId,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        title: null,
        description: null,
        focus_area: null,
        analyzed: false,
        uploaded_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error saving media record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Assigns coaches to a video
 */
export const assignCoachesToVideo = async (
  videoId: string,
  coachIds: string[]
) => {
  try {
    if (!coachIds || coachIds.length === 0) return { success: true };

    const coachAssignments = coachIds.map(coachId => ({
      video_id: videoId,
      coach_id: coachId,
      status: 'pending'
    }));

    const { error } = await supabase
      .from('video_coaches')
      .insert(coachAssignments);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error assigning coaches:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
