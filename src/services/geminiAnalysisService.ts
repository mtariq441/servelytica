import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.PUBLIC_GEMINI_API_KEY || '';

export interface VideoAnalysisResult {
  overallScore: number;
  strokeAnalysis: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  footworkAnalysis: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  bodyPositionAnalysis: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  timingAnalysis: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  generalFeedback: string;
  recommendedPractices: string[];
}

export class GeminiAnalysisService {
  private static client: GoogleGenerativeAI | null = null;

  private static initializeClient(): GoogleGenerativeAI {
    if (!this.client) {
      if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY environment variable.');
      }
      this.client = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
    return this.client;
  }

  /**
   * Analyze a video for table tennis technique using Backend API (for large files)
   * or Gemini Vision directly (for small files/blobs)
   */
  static async analyzeVideoTechnique(
    videoInput: string | Blob,
    sport: string = 'table-tennis',
    videoId?: string // Optional videoId for backend analysis
  ): Promise<VideoAnalysisResult> {
    try {
      // If videoInput is a string path starting with /uploads/ and we have a videoId, use backend
      if (typeof videoInput === 'string' && videoInput.startsWith('/uploads/') && videoId) {
        console.log('Using backend analysis for local file:', videoInput);

        // Convert relative path to absolute path if needed, but backend expects relative or absolute
        // The backend `gemini-video-analysis.ts` expects a path that `fs` can read.
        // If we send `/uploads/xxx`, the backend needs to resolve it.
        // Our backend route `app.post('/api/videos/:videoId/analyze')` takes `videoPath`.
        // We should send the absolute path if possible, or relative to server root.
        // But the frontend only knows `/uploads/xxx`.
        // The backend `server/index.ts` serves `/uploads` from `path.resolve(__dirname, 'uploads')`.
        // So we should probably send the filename or construct the path on backend.
        // However, `server/api.ts` takes `videoPath` directly.
        // Let's assume we send the full path relative to server root or let backend handle it.
        // Actually, `server/chunkUpload.ts` returns `filePath` as `/uploads/xxx.mp4` AND `absolutePath`.
        // If we stored `absolutePath` in DB, we could use it.
        // But we likely stored `/uploads/xxx.mp4`.
        // So we need to tell backend to resolve it.
        // For now, let's send the path we have. The backend `analyzeVideo` checks `fs.existsSync(videoPath)`.
        // If we send `/uploads/xxx.mp4`, `fs.existsSync` will fail unless it's absolute or relative to CWD.
        // We might need to fix the backend to resolve `/uploads/` paths.

        const response = await fetch(`/api/videos/${videoId}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoPath: videoInput, // Backend needs to handle this path
            sport
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Backend analysis failed');
        }

        const data = await response.json();
        return data.analysis;
      }

      // Fallback to client-side for Blobs or external URLs (if small enough)
      const client = this.initializeClient();
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

      // Prepare the prompt for table tennis analysis
      const analysisPrompt = `You are an expert table tennis coach analyzing a video of a player's technique. 
      
Please analyze this ${sport} video and provide comprehensive feedback on the following aspects:

1. **Stroke Technique** - Evaluate the forehand/backhand strokes, grip, swing path, follow-through
2. **Footwork** - Assess foot positioning, movement, balance, and court coverage
3. **Body Position** - Analyze posture, body alignment, weight distribution, and center of gravity
4. **Timing** - Evaluate ball contact point, anticipation, and rhythm

For each aspect, provide:
- A score from 1-10
- Specific feedback
- 2-3 key strengths observed
- 2-3 areas for improvement

Also provide:
- Overall technique score (1-10)
- General feedback and observations
- 3-5 recommended practice drills

Respond in JSON format with this structure:
{
  "overallScore": number,
  "strokeAnalysis": {
    "score": number,
    "feedback": "string",
    "strengths": ["string"],
    "improvements": ["string"]
  },
  "footworkAnalysis": {
    "score": number,
    "feedback": "string",
    "strengths": ["string"],
    "improvements": ["string"]
  },
  "bodyPositionAnalysis": {
    "score": number,
    "feedback": "string",
    "strengths": ["string"],
    "improvements": ["string"]
  },
  "timingAnalysis": {
    "score": number,
    "feedback": "string",
    "strengths": ["string"],
    "improvements": ["string"]
  },
  "generalFeedback": "string",
  "recommendedPractices": ["string"]
}`;

      let result;

      // Handle different input types
      if (typeof videoInput === 'string') {
        // If it's a URL or base64 string
        if (videoInput.startsWith('http') || videoInput.startsWith('https')) {
          // For URLs, we'll use Gemini's URL capability
          result = await model.generateContent([
            {
              text: analysisPrompt,
            },
            {
              fileData: {
                mimeType: 'video/mp4',
                fileUri: videoInput,
              },
            },
          ]);
        } else if (videoInput.startsWith('data:video')) {
          // Base64 encoded video
          const base64Data = videoInput.split(',')[1];
          result = await model.generateContent([
            {
              text: analysisPrompt,
            },
            {
              inlineData: {
                mimeType: 'video/mp4',
                data: base64Data,
              },
            },
          ]);
        } else {
          throw new Error('Invalid video input format');
        }
      } else if (videoInput instanceof Blob) {
        // Handle Blob input
        const arrayBuffer = await videoInput.arrayBuffer();
        const base64 = this.arrayBufferToBase64(arrayBuffer);

        result = await model.generateContent([
          {
            text: analysisPrompt,
          },
          {
            inlineData: {
              mimeType: videoInput.type || 'video/mp4',
              data: base64,
            },
          },
        ]);
      } else {
        throw new Error('Unsupported video input type');
      }

      // Parse the response
      const responseText = result.response.text();

      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse analysis result from Gemini response');
      }

      const analysisData = JSON.parse(jsonMatch[0]);
      return analysisData as VideoAnalysisResult;
    } catch (error) {
      console.error('Error analyzing video with Gemini:', error);
      throw error;
    }
  }

  /**
   * Analyze video frames for detailed frame-by-frame feedback
   */
  static async analyzeFrames(
    frameImages: (string | Blob)[],
    frameNumbers: number[],
    sport: string = 'table-tennis'
  ): Promise<any> {
    try {
      const client = this.initializeClient();
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const frameAnalysis = [];

      for (let i = 0; i < frameImages.length; i++) {
        const framePrompt = `This is frame ${frameNumbers[i]} from a ${sport} match. 
        
Analyze the player's technique in this frame:
- Current body position and posture
- Arm and racket position
- Foot positioning
- Balance and weight distribution
- Any visible issues or strengths

Provide constructive feedback in JSON format:
{
  "frameNumber": number,
  "posture": "string",
  "armPosition": "string",
  "footwork": "string",
  "balance": "string",
  "feedback": "string",
  "strengths": ["string"],
  "improvements": ["string"]
}`;

        let result;
        const frameInput = frameImages[i];

        if (typeof frameInput === 'string') {
          if (frameInput.startsWith('http') || frameInput.startsWith('https')) {
            result = await model.generateContent([
              { text: framePrompt },
              { fileData: { mimeType: 'image/jpeg', fileUri: frameInput } },
            ]);
          } else if (frameInput.startsWith('data:image')) {
            const base64Data = frameInput.split(',')[1];
            result = await model.generateContent([
              { text: framePrompt },
              { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            ]);
          }
        } else if (frameInput instanceof Blob) {
          const arrayBuffer = await frameInput.arrayBuffer();
          const base64 = this.arrayBufferToBase64(arrayBuffer);
          result = await model.generateContent([
            { text: framePrompt },
            { inlineData: { mimeType: frameInput.type || 'image/jpeg', data: base64 } },
          ]);
        }

        if (result) {
          const responseText = result.response.text();
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            frameAnalysis.push(JSON.parse(jsonMatch[0]));
          }
        }
      }

      return frameAnalysis;
    } catch (error) {
      console.error('Error analyzing frames with Gemini:', error);
      throw error;
    }
  }

  /**
   * Get coaching recommendations based on video analysis
   */
  static async getCoachingRecommendations(
    analysisResult: VideoAnalysisResult
  ): Promise<string[]> {
    try {
      const client = this.initializeClient();
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const recommendationPrompt = `Based on this table tennis player's analysis:

Stroke Score: ${analysisResult.strokeAnalysis.score}/10
Footwork Score: ${analysisResult.footworkAnalysis.score}/10
Body Position Score: ${analysisResult.bodyPositionAnalysis.score}/10
Timing Score: ${analysisResult.timingAnalysis.score}/10

Key Issues:
${analysisResult.strokeAnalysis.improvements.map(i => `- Stroke: ${i}`).join('\n')}
${analysisResult.footworkAnalysis.improvements.map(i => `- Footwork: ${i}`).join('\n')}
${analysisResult.bodyPositionAnalysis.improvements.map(i => `- Body Position: ${i}`).join('\n')}

Provide 5-7 specific, actionable coaching drills and exercises to improve the weakest areas.
Focus on exercises that can be done both at home and on the table tennis court.

Respond with a JSON array of strings:
["drill 1", "drill 2", "drill 3", ...]`;

      const result = await model.generateContent(recommendationPrompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return analysisResult.recommendedPractices;
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error getting coaching recommendations:', error);
      return analysisResult.recommendedPractices;
    }
  }

  /**
   * Compare two videos to identify improvements
   */
  static async compareVideos(
    beforeVideoInput: string | Blob,
    afterVideoInput: string | Blob,
    sport: string = 'table-tennis'
  ): Promise<any> {
    try {
      const beforeAnalysis = await this.analyzeVideoTechnique(beforeVideoInput, sport);
      const afterAnalysis = await this.analyzeVideoTechnique(afterVideoInput, sport);

      const client = this.initializeClient();
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const comparisonPrompt = `Compare these two ${sport} technique analyses:

BEFORE:
- Stroke Score: ${beforeAnalysis.strokeAnalysis.score}/10
- Footwork Score: ${beforeAnalysis.footworkAnalysis.score}/10
- Body Position Score: ${beforeAnalysis.bodyPositionAnalysis.score}/10
- Timing Score: ${beforeAnalysis.timingAnalysis.score}/10

AFTER:
- Stroke Score: ${afterAnalysis.strokeAnalysis.score}/10
- Footwork Score: ${afterAnalysis.footworkAnalysis.score}/10
- Body Position Score: ${afterAnalysis.bodyPositionAnalysis.score}/10
- Timing Score: ${afterAnalysis.timingAnalysis.score}/10

Analyze the improvements and remaining areas for development.

Respond in JSON format:
{
  "improvements": ["string"],
  "areasStillNeedingWork": ["string"],
  "overallProgressScore": number,
  "summary": "string"
}`;

      const result = await model.generateContent(comparisonPrompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { improvements: [], areasStillNeedingWork: [], overallProgressScore: 0 };
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error comparing videos:', error);
      throw error;
    }
  }

  /**
   * Check if Gemini API is properly configured
   */
  static isConfigured(): boolean {
    return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 0;
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
