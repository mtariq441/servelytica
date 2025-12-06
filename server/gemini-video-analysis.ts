// Gemini Video Analysis Service
// Integrated with Gemini AI for advanced video analysis capabilities

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import * as fs from "fs";
import * as path from "path";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

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
 * Uses File API for large files
 */
export async function analyzeVideo(videoPath: string): Promise<VideoAnalysisResult> {
  try {
    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    console.log(`[GEMINI] Uploading video to Gemini: ${videoPath}`);

    // Upload the file to Gemini
    const uploadResult = await fileManager.uploadFile(videoPath, {
      mimeType: "video/mp4", // Assuming mp4, or detect
      displayName: path.basename(videoPath),
    });

    console.log(`[GEMINI] Uploaded file: ${uploadResult.file.name}`);

    // Wait for the file to be active
    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === "PROCESSING") {
      console.log(`[GEMINI] Processing video...`);
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      file = await fileManager.getFile(uploadResult.file.name);
    }

    if (file.state === "FAILED") {
      throw new Error("Video processing failed by Gemini");
    }

    console.log(`[GEMINI] Video active. Generating content...`);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Use 1.5 Pro for better video understanding

    // Create analysis prompt
    const analysisPrompt = `You are an expert sports coach specializing in table tennis, tennis, badminton, and similar racquet sports.

Analyze this video and provide a comprehensive performance evaluation. Focus on:
1. Overall technique quality (score 0-100)
2. Footwork and positioning
3. Stroke mechanics and form
4. Key strengths observed
5. Areas for improvement
6. Specific recommendations for training
7. Feedback

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

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri
        }
      },
      { text: analysisPrompt }
    ]);

    const response = await result.response;
    const responseText = response.text();

    console.log(`[GEMINI] Analysis complete.`);

    // Clean up file from Gemini (optional, but good practice)
    // await fileManager.deleteFile(uploadResult.file.name);

    // Extract JSON from response
    let analysisData: VideoAnalysisResult;
    try {
      analysisData = JSON.parse(responseText);
    } catch (parseError) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse Gemini response as JSON");
      }
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
 */
export async function getQuickFeedback(videoPath: string): Promise<string> {
  // Similar implementation using File API for consistency
  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const uploadResult = await fileManager.uploadFile(videoPath, {
      mimeType: "video/mp4",
      displayName: "Quick Feedback Video",
    });

    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      file = await fileManager.getFile(uploadResult.file.name);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Faster model

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri
        }
      },
      { text: "Provide a brief 2-3 sentence feedback on the technique and form shown in this sports video." }
    ]);

    return result.response.text();
  } catch (error) {
    console.error("Error getting quick feedback:", error);
    throw new Error(`Quick feedback failed: ${error}`);
  }
}

/**
 * Compare technique across multiple videos
 */
export async function compareVideoSegments(
  videoPaths: string[],
  description: string
): Promise<string> {
  try {
    const fileUris = [];

    for (const videoPath of videoPaths) {
      if (!fs.existsSync(videoPath)) throw new Error(`File not found: ${videoPath}`);

      const uploadResult = await fileManager.uploadFile(videoPath, {
        mimeType: "video/mp4",
        displayName: path.basename(videoPath),
      });

      let file = await fileManager.getFile(uploadResult.file.name);
      while (file.state === "PROCESSING") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        file = await fileManager.getFile(uploadResult.file.name);
      }

      fileUris.push({
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri
        }
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent([
      ...fileUris,
      { text: `Compare these video segments and provide analysis: ${description}` }
    ]);

    return result.response.text();
  } catch (error) {
    console.error("Error comparing videos:", error);
    throw new Error(`Video comparison failed: ${error}`);
  }
}
