// Gemini Video Analysis Service
// Integrated with Gemini AI for advanced video analysis capabilities

import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface VideoAnalysisResult {
  overallScore: number;
  technique: string;
  footwork: string;
  positioning: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  feedback: string;
}

/**
 * Analyze a video file using Gemini AI
 * Provides comprehensive feedback on technique, form, and performance
 */
export async function analyzeVideo(videoPath: string): Promise<VideoAnalysisResult> {
  try {
    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Read video file
    const videoBytes = fs.readFileSync(videoPath);
    const base64Video = videoBytes.toString("base64");

    // Determine MIME type from file extension
    const ext = path.extname(videoPath).toLowerCase();
    let mimeType = "video/mp4";
    if (ext === ".webm") {
      mimeType = "video/webm";
    } else if (ext === ".avi") {
      mimeType = "video/avi";
    }

    // Create analysis prompt
    const analysisPrompt = `You are an expert sports coach specializing in table tennis, tennis, badminton, and similar racquet sports.

Analyze this video and provide a comprehensive performance evaluation. Focus on:
1. Overall technique quality (score 0-100)
2. Footwork and positioning
3. Stroke mechanics and form
4. Key strengths observed
5. Areas for improvement
6. Specific recommendations for training

Please structure your response as JSON with the following format:
{
  "overallScore": <number 0-100>,
  "technique": "<detailed analysis of technique>",
  "footwork": "<analysis of footwork and movement>",
  "positioning": "<analysis of court positioning>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "areasForImprovement": ["<area 1>", "<area 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "feedback": "<overall feedback and summary>"
}`;

    // Call Gemini API with video
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [
        {
          inlineData: {
            data: base64Video,
            mimeType: mimeType,
          },
        },
        analysisPrompt,
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    // Parse response
    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    // Extract JSON from response
    let analysisData: VideoAnalysisResult;
    try {
      analysisData = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from response text if it contains additional text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse Gemini response as JSON");
      }
    }

    // Validate response structure
    if (!analysisData.overallScore || !analysisData.technique) {
      throw new Error("Invalid response structure from Gemini API");
    }

    return analysisData;
  } catch (error) {
    console.error("Error analyzing video with Gemini:", error);
    throw new Error(
      `Video analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get quick feedback on a video without full analysis
 * Useful for real-time feedback scenarios
 */
export async function getQuickFeedback(videoPath: string): Promise<string> {
  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const videoBytes = fs.readFileSync(videoPath);
    const base64Video = videoBytes.toString("base64");

    const ext = path.extname(videoPath).toLowerCase();
    let mimeType = "video/mp4";
    if (ext === ".webm") {
      mimeType = "video/webm";
    } else if (ext === ".avi") {
      mimeType = "video/avi";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [
        {
          inlineData: {
            data: base64Video,
            mimeType: mimeType,
          },
        },
        "Provide a brief 2-3 sentence feedback on the technique and form shown in this sports video. Focus on the most important observations.",
      ],
    });

    return response.text || "Unable to generate feedback";
  } catch (error) {
    console.error("Error getting quick feedback:", error);
    throw new Error(
      `Quick feedback failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Compare technique across multiple frames/moments
 */
export async function compareVideoSegments(
  videoPaths: string[],
  description: string
): Promise<string> {
  try {
    // Validate all files exist
    for (const videoPath of videoPaths) {
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
      }
    }

    // Build contents array with all videos
    const contents: any[] = [];
    for (const videoPath of videoPaths) {
      const videoBytes = fs.readFileSync(videoPath);
      const base64Video = videoBytes.toString("base64");

      const ext = path.extname(videoPath).toLowerCase();
      let mimeType = "video/mp4";
      if (ext === ".webm") {
        mimeType = "video/webm";
      } else if (ext === ".avi") {
        mimeType = "video/avi";
      }

      contents.push({
        inlineData: {
          data: base64Video,
          mimeType: mimeType,
        },
      });
    }

    contents.push(
      `Compare these video segments and provide analysis: ${description}`
    );

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: contents,
    });

    return response.text || "Unable to generate comparison";
  } catch (error) {
    console.error("Error comparing video segments:", error);
    throw new Error(
      `Video comparison failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
