import { supabase } from '@/integrations/supabase/client';
import { GeminiAnalysisService, VideoAnalysisResult } from './geminiAnalysisService';

export interface MotionAnalysisSession {
  id: string;
  user_id: string;
  video_id?: string;
  video_url?: string;
  video_file_path?: string;
  title: string;
  description?: string;
  sport_type: string;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface MotionAnalysisResult {
  id: string;
  session_id: string;
  analysis_type: 'stroke' | 'footwork' | 'body_position' | 'timing' | 'overall';
  score: number;
  feedback: string;
  areas_of_improvement: string[];
  strengths: string[];
}

export interface MotionAnalysisFrame {
  id: string;
  session_id: string;
  frame_number: number;
  timestamp_ms: number;
  annotations?: any;
  pose_data?: any;
  technique_notes?: string;
}

export interface MotionAnalysisAnnotation {
  id: string;
  frame_id?: string;
  session_id: string;
  annotation_type: 'line' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'angle';
  coordinates: any;
  color: string;
  label?: string;
}

export class MotionAnalysisService {
  /**
   * Create a new motion analysis session
   */
  static async createSession(
    userId: string,
    title: string,
    description?: string,
    videoFilePath?: string
  ): Promise<MotionAnalysisSession | null> {
    try {
      const { data, error } = await supabase
        .from('motion_analysis_sessions')
        .insert({
          user_id: userId,
          title,
          description,
          video_file_path: videoFilePath,
          sport_type: 'table-tennis',
          analysis_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating motion analysis session:', error);
      return null;
    }
  }

  /**
   * Get all sessions for a user
   */
  static async getUserSessions(userId: string): Promise<MotionAnalysisSession[]> {
    try {
      const { data, error } = await supabase
        .from('motion_analysis_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }

  /**
   * Get a specific session by ID
   */
  static async getSession(sessionId: string): Promise<MotionAnalysisSession | null> {
    try {
      const { data, error } = await supabase
        .from('motion_analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  /**
   * Update session status
   */
  static async updateSessionStatus(
    sessionId: string,
    status: MotionAnalysisSession['analysis_status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('motion_analysis_sessions')
        .update({ 
          analysis_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating session status:', error);
      return false;
    }
  }

  /**
   * Save analysis results
   */
  static async saveResults(results: Omit<MotionAnalysisResult, 'id'>[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('motion_analysis_results')
        .insert(results);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving analysis results:', error);
      return false;
    }
  }

  /**
   * Get results for a session
   */
  static async getSessionResults(sessionId: string): Promise<MotionAnalysisResult[]> {
    try {
      const { data, error } = await supabase
        .from('motion_analysis_results')
        .select('*')
        .eq('session_id', sessionId)
        .order('analysis_type');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching session results:', error);
      return [];
    }
  }

  /**
   * Save frame analysis data
   */
  static async saveFrameAnalysis(frame: Omit<MotionAnalysisFrame, 'id'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('motion_analysis_frames')
        .insert(frame);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving frame analysis:', error);
      return false;
    }
  }

  /**
   * Get frame analysis for a session
   */
  static async getSessionFrames(sessionId: string): Promise<MotionAnalysisFrame[]> {
    try {
      const { data, error } = await supabase
        .from('motion_analysis_frames')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp_ms');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching session frames:', error);
      return [];
    }
  }

  /**
   * Save annotation
   */
  static async saveAnnotation(annotation: Omit<MotionAnalysisAnnotation, 'id'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('motion_analysis_annotations')
        .insert(annotation);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving annotation:', error);
      return false;
    }
  }

  /**
   * Get annotations for a session
   */
  static async getSessionAnnotations(sessionId: string): Promise<MotionAnalysisAnnotation[]> {
    try {
      const { data, error } = await supabase
        .from('motion_analysis_annotations')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching session annotations:', error);
      return [];
    }
  }

  /**
   * Delete a session and all related data
   */
  static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('motion_analysis_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  /**
   * Perform AI-based video analysis using Gemini
   * This connects to Google's Gemini Vision model for intelligent video analysis
   */
  static async performAIAnalysis(
    videoUrl: string,
    analysisType?: string
  ): Promise<VideoAnalysisResult> {
    try {
      if (!GeminiAnalysisService.isConfigured()) {
        throw new Error('Gemini API is not configured. Please set VITE_GEMINI_API_KEY environment variable.');
      }

      console.log('Starting AI analysis with Gemini for video:', videoUrl);
      
      // Perform AI analysis using Gemini Vision
      const analysisResult = await GeminiAnalysisService.analyzeVideoTechnique(videoUrl, 'table-tennis');
      
      return analysisResult;
    } catch (error) {
      console.error('AI Analysis error:', error);
      throw error;
    }
  }
  /**
   * Save Gemini AI analysis results to database
   */
  static async saveAIAnalysisResults(
    sessionId: string,
    analysisResult: VideoAnalysisResult
  ): Promise<boolean> {
    try {
      const results: Omit<MotionAnalysisResult, 'id'>[] = [
        {
          session_id: sessionId,
          analysis_type: 'stroke',
          score: analysisResult.strokeAnalysis.score,
          feedback: analysisResult.strokeAnalysis.feedback,
          areas_of_improvement: analysisResult.strokeAnalysis.improvements,
          strengths: analysisResult.strokeAnalysis.strengths,
        },
        {
          session_id: sessionId,
          analysis_type: 'footwork',
          score: analysisResult.footworkAnalysis.score,
          feedback: analysisResult.footworkAnalysis.feedback,
          areas_of_improvement: analysisResult.footworkAnalysis.improvements,
          strengths: analysisResult.footworkAnalysis.strengths,
        },
        {
          session_id: sessionId,
          analysis_type: 'body_position',
          score: analysisResult.bodyPositionAnalysis.score,
          feedback: analysisResult.bodyPositionAnalysis.feedback,
          areas_of_improvement: analysisResult.bodyPositionAnalysis.improvements,
          strengths: analysisResult.bodyPositionAnalysis.strengths,
        },
        {
          session_id: sessionId,
          analysis_type: 'timing',
          score: analysisResult.timingAnalysis.score,
          feedback: analysisResult.timingAnalysis.feedback,
          areas_of_improvement: analysisResult.timingAnalysis.improvements,
          strengths: analysisResult.timingAnalysis.strengths,
        },
        {
          session_id: sessionId,
          analysis_type: 'overall',
          score: analysisResult.overallScore,
          feedback: analysisResult.generalFeedback,
          areas_of_improvement: analysisResult.recommendedPractices,
          strengths: [],
        },
      ];

      return await this.saveResults(results);
    } catch (error) {
      console.error('Error saving AI analysis results:', error);
      return false;
    }
  }

  /**
   * Get Gemini-powered coaching recommendations for a session
   */
  static async getAICoachingRecommendations(sessionId: string): Promise<string[]> {
    try {
      const results = await this.getSessionResults(sessionId);
      if (results.length === 0) {
        return [];
      }

      // Reconstruct the analysis result from database records
      const analysisResult: VideoAnalysisResult = {
        overallScore: results.find(r => r.analysis_type === 'overall')?.score || 0,
        strokeAnalysis: {
          score: results.find(r => r.analysis_type === 'stroke')?.score || 0,
          feedback: results.find(r => r.analysis_type === 'stroke')?.feedback || '',
          strengths: results.find(r => r.analysis_type === 'stroke')?.strengths || [],
          improvements: results.find(r => r.analysis_type === 'stroke')?.areas_of_improvement || [],
        },
        footworkAnalysis: {
          score: results.find(r => r.analysis_type === 'footwork')?.score || 0,
          feedback: results.find(r => r.analysis_type === 'footwork')?.feedback || '',
          strengths: results.find(r => r.analysis_type === 'footwork')?.strengths || [],
          improvements: results.find(r => r.analysis_type === 'footwork')?.areas_of_improvement || [],
        },
        bodyPositionAnalysis: {
          score: results.find(r => r.analysis_type === 'body_position')?.score || 0,
          feedback: results.find(r => r.analysis_type === 'body_position')?.feedback || '',
          strengths: results.find(r => r.analysis_type === 'body_position')?.strengths || [],
          improvements: results.find(r => r.analysis_type === 'body_position')?.areas_of_improvement || [],
        },
        timingAnalysis: {
          score: results.find(r => r.analysis_type === 'timing')?.score || 0,
          feedback: results.find(r => r.analysis_type === 'timing')?.feedback || '',
          strengths: results.find(r => r.analysis_type === 'timing')?.strengths || [],
          improvements: results.find(r => r.analysis_type === 'timing')?.areas_of_improvement || [],
        },
        generalFeedback: results.find(r => r.analysis_type === 'overall')?.feedback || '',
        recommendedPractices: results.find(r => r.analysis_type === 'overall')?.areas_of_improvement || [],
      };

      return await GeminiAnalysisService.getCoachingRecommendations(analysisResult);
    } catch (error) {
      console.error('Error getting AI coaching recommendations:', error);
      return [];
    }
  }
}