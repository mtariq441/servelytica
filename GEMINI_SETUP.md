# Gemini AI Integration Setup Guide

## Overview
Servelytica now includes AI-powered video analysis using Google's Gemini Vision model. This provides intelligent, detailed feedback on table tennis technique including stroke, footwork, body position, and timing analysis.

## Setup Instructions

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Environment Variables
Add the Gemini API key to your environment files:

**For Development (.env.local or .env):**
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**For Vercel Deployment:**
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `VITE_GEMINI_API_KEY` with your API key value

**For Netlify Deployment:**
1. Go to your Netlify site settings
2. Navigate to Environment Variables
3. Add `VITE_GEMINI_API_KEY` with your API key value

### 3. Features Enabled

Once configured, the following AI-powered features become available:

#### Video Analysis
- **Stroke Technique** - Evaluates forehand/backhand, grip, swing path, follow-through
- **Footwork Analysis** - Assesses positioning, movement, balance, court coverage
- **Body Position** - Analyzes posture, alignment, weight distribution
- **Timing Analysis** - Evaluates ball contact point, anticipation, rhythm

#### Scoring System
- Each category is scored from 1-10
- Overall technique score calculated
- AI provides specific strengths and areas for improvement

#### Coaching Recommendations
- Automated drill suggestions based on analysis
- Personalized practice recommendations
- Progress tracking for before/after comparisons

### 4. Usage

The AI analysis is automatically triggered when users:
1. Upload a video to Motion Analysis page
2. Use the Upload Game Page feature
3. Request a video analysis

### 5. Model Used
- **Model**: Gemini 2.0 Flash (optimized for fast vision analysis)
- **Input**: Video files, video URLs, or base64 encoded videos
- **Output**: Structured analysis with scores, feedback, and recommendations

### 6. Fallback Behavior
If Gemini API is:
- **Not configured**: Shows warning message
- **Temporarily unavailable**: Automatically falls back to placeholder analysis
- **Returns error**: Provides user-friendly error message with guidance

### 7. Performance Considerations
- Video analysis takes 30-60 seconds depending on video length
- Larger videos may take longer
- Analysis is processed asynchronously to avoid UI blocking
- Results are cached in Supabase for quick retrieval

## Testing AI Analysis

### Test Case 1: Upload Video File
1. Navigate to Motion Analysis page
2. Upload a table tennis video
3. Verify AI analysis appears with detailed feedback
4. Check scores and recommendations in Results tab

### Test Case 2: Video URL
1. Use "Add Content" button
2. Paste valid table tennis video URL
3. Verify AI analysis processes the URL
4. Confirm analysis results display

### Test Case 3: Frame-by-Frame Analysis
Use the frame analysis endpoints to get detailed feedback on specific frames:
```javascript
const frameAnalysis = await GeminiAnalysisService.analyzeFrames(
  [frameImage1, frameImage2],
  [1, 25]
);
```

## API Reference

### GeminiAnalysisService

#### analyzeVideoTechnique(videoInput, sport)
Analyzes a complete video for technique feedback

**Parameters:**
- `videoInput`: string | Blob - Video URL, base64 string, or Blob
- `sport`: string - Sport type (default: 'table-tennis')

**Returns:**
```typescript
{
  overallScore: number,
  strokeAnalysis: { score, feedback, strengths, improvements },
  footworkAnalysis: { score, feedback, strengths, improvements },
  bodyPositionAnalysis: { score, feedback, strengths, improvements },
  timingAnalysis: { score, feedback, strengths, improvements },
  generalFeedback: string,
  recommendedPractices: string[]
}
```

#### analyzeFrames(frameImages, frameNumbers, sport)
Frame-by-frame analysis for detailed feedback

#### getCoachingRecommendations(analysisResult)
Generates custom coaching drills based on analysis

#### compareVideos(beforeVideo, afterVideo, sport)
Compares two videos to show improvement

## Troubleshooting

### Error: "Gemini API key not configured"
- Check that `VITE_GEMINI_API_KEY` is set correctly
- Verify key is not expired in Google AI Studio
- Restart development server after adding env variable

### Error: "Failed to analyze video"
- Ensure video format is supported (MP4, WebM, etc.)
- Check video file size (should be < 100MB)
- Verify video URL is publicly accessible
- Check console for detailed error message

### Error: "Invalid video input format"
- Use either valid HTTPS URL or Blob object
- Base64 strings must start with "data:video/"
- For URLs, ensure protocol is https://

## Future Enhancements
- Real-time video analysis during recording
- Multi-sport support (badminton, tennis, etc.)
- Pose keypoint visualization
- Performance tracking dashboard
- Group analysis for team coaching

## Support
For issues with Gemini API, visit [Google AI Help](https://support.google.com/aistudio/)
For Servelytica issues, check GitHub issues or contact support.
