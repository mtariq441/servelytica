// Motion Analysis Service - AI-powered technique and form analysis
// Uses Gemini AI to analyze player movements, technique, and game performance

import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

export interface MotionAnalysisResult {
  // Overall assessment
  overallScore: number; // 0-100
  performanceLevel: "beginner" | "intermediate" | "advanced" | "elite";
  
  // Motion analysis
  footwork: {
    score: number;
    analysis: string;
    efficiency: "poor" | "fair" | "good" | "excellent";
    feedback: string;
  };
  
  posture: {
    score: number;
    analysis: string;
    alignment: string;
    improvements: string[];
  };
  
  technique: {
    primaryStroke: string;
    score: number;
    mechanics: string;
    consistency: string;
    issues: string[];
  };
  
  movement: {
    court_positioning: string;
    recovery_speed: string;
    balance: string;
    transitions: string;
    recommendations: string[];
  };
  
  // Game-specific analysis
  gameAnalysis?: {
    matchPoints: string;
    strengths: string[];
    weaknesses: string[];
    tacticalSuggestions: string[];
    trainingFocus: string[];
  };
  
  // Overall recommendations
  keyStrengths: string[];
  priorityImprovements: string[];
  trainingRecommendations: string[];
  nextSteps: string[];
}

/**
 * Perform comprehensive motion analysis on uploaded game video
 * Analyzes technique, footwork, movement patterns, and game performance
 */
export async function analyzeMotionAndGameVideo(
  videoPath: string,
  videoMetadata?: { title?: string; description?: string; focusArea?: string }
): Promise<MotionAnalysisResult> {
  try {
    // Validate file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Read and encode video
    const videoBytes = fs.readFileSync(videoPath);
    const base64Video = videoBytes.toString("base64");

    // Determine MIME type
    const ext = path.extname(videoPath).toLowerCase();
    let mimeType = "video/mp4";
    if (ext === ".webm") mimeType = "video/webm";
    else if (ext === ".avi") mimeType = "video/avi";
    else if (ext === ".mov") mimeType = "video/quicktime";

    // Build comprehensive analysis prompt for game video
    const analysisPrompt = `You are an expert sports performance analyst specializing in motion capture, technique analysis, and game strategy. 
    
This video shows a sports performance that needs detailed motion and technique analysis.
${
  videoMetadata?.focusArea
    ? `Focus Area: ${videoMetadata.focusArea}`
    : "Analyze overall performance."
}

Provide a comprehensive analysis in JSON format with the following structure:
{
  "overallScore": <number 0-100>,
  "performanceLevel": "<beginner|intermediate|advanced|elite>",
  "footwork": {
    "score": <number 0-100>,
    "analysis": "<detailed footwork analysis>",
    "efficiency": "<poor|fair|good|excellent>",
    "feedback": "<specific footwork feedback>"
  },
  "posture": {
    "score": <number 0-100>,
    "analysis": "<posture and alignment analysis>",
    "alignment": "<how body alignment affects performance>",
    "improvements": ["<improvement 1>", "<improvement 2>", ...]
  },
  "technique": {
    "primaryStroke": "<main technique being used>",
    "score": <number 0-100>,
    "mechanics": "<detailed mechanics analysis>",
    "consistency": "<how consistent is the technique>",
    "issues": ["<issue 1>", "<issue 2>", ...]
  },
  "movement": {
    "court_positioning": "<analysis of positioning>",
    "recovery_speed": "<speed of recovery between shots>",
    "balance": "<balance during movements>",
    "transitions": "<smooth transitions between positions>",
    "recommendations": ["<recommendation 1>", "<recommendation 2>", ...]
  },
  "gameAnalysis": {
    "matchPoints": "<key moments in the game>",
    "strengths": ["<strength 1>", "<strength 2>", ...],
    "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
    "tacticalSuggestions": ["<suggestion 1>", "<suggestion 2>", ...],
    "trainingFocus": ["<focus area 1>", "<focus area 2>", ...]
  },
  "keyStrengths": ["<strength 1>", "<strength 2>", ...],
  "priorityImprovements": ["<improvement 1>", "<improvement 2>", ...],
  "trainingRecommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "nextSteps": ["<step 1>", "<step 2>", ...]
}

Be specific, technical, and actionable in your analysis. Focus on observable motion patterns and biomechanics.`;

    console.log("[MOTION-ANALYSIS] Starting video analysis with Gemini...");

    // Call Gemini with video
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

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    console.log("[MOTION-ANALYSIS] Received response from Gemini");

    // Parse JSON response
    let analysisData: MotionAnalysisResult;
    try {
      analysisData = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON if response has extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse Gemini response as JSON");
      }
    }

    // Validate response has required fields
    if (
      analysisData.overallScore === undefined ||
      !analysisData.footwork ||
      !analysisData.technique
    ) {
      throw new Error("Invalid response structure from Gemini API");
    }

    console.log("[MOTION-ANALYSIS] Analysis complete. Score:", analysisData.overallScore);
    return analysisData;
  } catch (error) {
    console.error("[MOTION-ANALYSIS] Error analyzing video:", error);
    throw new Error(
      `Motion analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Quick motion assessment for real-time feedback
 */
export async function getQuickMotionAssessment(videoPath: string): Promise<string> {
  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const videoBytes = fs.readFileSync(videoPath);
    const base64Video = videoBytes.toString("base64");

    const ext = path.extname(videoPath).toLowerCase();
    let mimeType = "video/mp4";
    if (ext === ".webm") mimeType = "video/webm";
    else if (ext === ".avi") mimeType = "video/avi";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [
        {
          inlineData: {
            data: base64Video,
            mimeType: mimeType,
          },
        },
        "Provide a quick 1-2 sentence assessment of the player's technique and movement quality shown in this sports video. Focus on the most critical observation.",
      ],
    });

    return response.text || "Unable to generate assessment";
  } catch (error) {
    console.error("[MOTION-ANALYSIS] Error getting quick assessment:", error);
    throw new Error(
      `Quick assessment failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
