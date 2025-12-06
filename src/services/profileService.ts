import { apiCall, profileApi, videoApi } from './apiClient';

export interface ProfileData {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  playing_experience: string | null;
  preferred_play_style: string | null;
  member_since: string | null;
  profile_image: string | null;
  role: 'player' | 'coach' | 'admin' | null;
}

export interface PerformanceMetric {
  id: string;
  month: string;
  rating: number;
  wins: number;
  losses: number;
}

export interface VideoData {
  id: string;
  title: string | null;
  file_name: string;
  file_path: string;
  uploaded_at: string | null;
  analyzed: boolean | null;
  focus_area: string | null;
  user_id?: string;
  coaches?: Array<{ id: string; display_name: string; status?: string; }>;
  student_name?: string;
  status?: string;
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/user', { credentials: 'include' });
    if (!response.ok) return null;
    const user = await response.json();
    return user?.id || null;
  } catch {
    return null;
  }
}

export class ProfileService {
  static async getCurrentUserProfile(): Promise<ProfileData | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const profileResult = await profileApi.getProfile(userId);
    if (!profileResult.success || !profileResult.data) {
      console.error('Error fetching profile:', profileResult.error);
      return null;
    }

    const roleResult = await apiCall<any>(`/user-roles/${userId}`);
    const role = roleResult.success ? roleResult.data?.role : null;

    const profile = profileResult.data as any;
    return {
      id: profile.id,
      user_id: profile.userId,
      username: profile.username,
      display_name: profile.displayName,
      avatar_url: profile.avatarUrl,
      bio: profile.bio,
      phone: profile.phone,
      location: profile.location,
      playing_experience: profile.playingExperience,
      preferred_play_style: profile.preferredPlayStyle,
      member_since: profile.memberSince,
      profile_image: profile.profileImage,
      role: role || null
    };
  }

  static async updateProfile(profileData: Partial<ProfileData>): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const { role, ...profileUpdateData } = profileData;

    const serverData = {
      username: profileUpdateData.username,
      displayName: profileUpdateData.display_name,
      avatarUrl: profileUpdateData.avatar_url,
      bio: profileUpdateData.bio,
      phone: profileUpdateData.phone,
      location: profileUpdateData.location,
      playingExperience: profileUpdateData.playing_experience,
      preferredPlayStyle: profileUpdateData.preferred_play_style,
      memberSince: profileUpdateData.member_since,
      profileImage: profileUpdateData.profile_image,
    };

    const result = await profileApi.updateProfile(userId, serverData);

    if (!result.success) {
      console.error('Error updating profile:', result.error);
      return false;
    }

    return true;
  }

  static async getPerformanceMetrics(): Promise<PerformanceMetric[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const result = await apiCall<any[]>(`/performance-metrics?userId=${userId}`);

    if (!result.success) {
      console.error('Error fetching performance metrics:', result.error);
      return [];
    }

    return result.data || [];
  }

  static async getUserVideos(): Promise<VideoData[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    try {
      const videosResult = await videoApi.getVideos(userId);
      if (!videosResult.success || !videosResult.data) {
        console.error('Error fetching videos:', videosResult.error);
        return [];
      }

      const videos = videosResult.data as any[];
      if (!videos || videos.length === 0) {
        return [];
      }

      const videoIds = videos.map(video => video.id);
      const coachAssignmentsResult = await apiCall<any[]>(`/video-coaches?videoIds=${videoIds.join(',')}`);

      const videoMap = new Map<string, any[]>();
      if (coachAssignmentsResult.success && coachAssignmentsResult.data) {
        coachAssignmentsResult.data.forEach((assignment: any) => {
          if (!videoMap.has(assignment.videoId)) {
            videoMap.set(assignment.videoId, []);
          }
          videoMap.get(assignment.videoId)?.push({
            id: assignment.coachId,
            display_name: assignment.coachName || 'Unknown Coach',
            status: assignment.status,
          });
        });
      }

      return videos.map(v => ({
        id: v.id,
        title: v.title,
        file_name: v.fileName,
        file_path: v.filePath,
        uploaded_at: v.uploadedAt,
        analyzed: v.analyzed,
        focus_area: v.focusArea,
        user_id: v.userId,
        coaches: videoMap.get(v.id) || [],
      })) as VideoData[];
    } catch (error) {
      console.error('Error in getUserVideos:', error);
      return [];
    }
  }

  static async getAssignedVideos(): Promise<VideoData[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    try {
      const result = await apiCall<any[]>(`/coaches/${userId}/videos`);
      if (!result.success || !result.data) {
        console.error('Error fetching assigned videos:', result.error);
        return [];
      }

      return result.data.map((item: any) => ({
        id: item.id,
        title: item.title,
        file_name: item.fileName,
        file_path: item.filePath,
        uploaded_at: item.uploadedAt,
        analyzed: item.analyzed,
        focus_area: item.focusArea,
        user_id: item.userId,
        student_name: item.studentName || 'Unknown Student'
      }));
    } catch (error) {
      console.error('Error fetching assigned videos:', error);
      return [];
    }
  }

  static async getPendingVideos(coachId?: string): Promise<VideoData[]> {
    try {
      const currentUserId = coachId || await getCurrentUserId();
      if (!currentUserId) return [];

      const result = await apiCall<any[]>(`/coaches/${currentUserId}/videos?status=pending`);
      if (!result.success || !result.data) {
        console.error('Error fetching pending videos:', result.error);
        return [];
      }

      return result.data.map((item: any) => ({
        id: item.id,
        title: item.title,
        file_name: item.fileName,
        file_path: item.filePath,
        uploaded_at: item.uploadedAt,
        analyzed: false,
        focus_area: item.focusArea,
        user_id: item.userId,
        student_name: item.studentName || 'Unknown Student',
        status: item.status
      }));
    } catch (error) {
      console.error('Error fetching pending videos:', error);
      return [];
    }
  }

  static async getAnalyzedVideos(coachId?: string): Promise<VideoData[]> {
    try {
      const currentUserId = coachId || await getCurrentUserId();
      if (!currentUserId) return [];

      const result = await apiCall<any[]>(`/coaches/${currentUserId}/videos?status=completed`);
      if (!result.success || !result.data) {
        const playerResult = await apiCall<any[]>(`/videos/with-feedback?userId=${currentUserId}`);
        if (!playerResult.success || !playerResult.data) {
          console.error('Error fetching analyzed videos:', playerResult.error);
          return [];
        }
        return playerResult.data.map((item: any) => ({
          id: item.id,
          title: item.title,
          file_name: item.fileName,
          file_path: item.filePath,
          uploaded_at: item.uploadedAt,
          analyzed: true,
          focus_area: item.focusArea,
          user_id: item.userId,
        }));
      }

      return result.data.map((item: any) => ({
        id: item.id,
        title: item.title,
        file_name: item.fileName,
        file_path: item.filePath,
        uploaded_at: item.uploadedAt,
        analyzed: true,
        focus_area: item.focusArea,
        user_id: item.userId,
        student_name: item.studentName || 'Unknown Student',
        status: item.status
      }));
    } catch (error) {
      console.error('Error fetching analyzed videos:', error);
      return [];
    }
  }

  static async createPerformanceMetric(metric: Omit<PerformanceMetric, 'id'>): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const result = await apiCall('/performance-metrics', {
      method: 'POST',
      body: JSON.stringify({ ...metric, userId }),
    });

    if (!result.success) {
      console.error('Error creating performance metric:', result.error);
      return false;
    }

    return true;
  }

  static async deleteVideo(videoId: string): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    try {
      const result = await videoApi.deleteVideo(videoId);

      if (!result.success) {
        console.error('Error deleting video:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    }
  }
}
