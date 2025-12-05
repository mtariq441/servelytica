# 🚀 Quick Start: Gemini AI Analysis

## ⚡ 5-Minute Setup

### Step 1: Get API Key (2 minutes)
```
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create new API key"
3. Copy your key
```

### Step 2: Add to Environment (1 minute)
Create or edit `.env.local`:
```env
VITE_GEMINI_API_KEY=your_key_here
```

### Step 3: Restart Server (2 minutes)
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ Verify It Works

1. Open http://localhost:5000/motion-analysis
2. Upload a table tennis video
3. Wait for "AI Analysis Complete" message
4. Click "Results" tab to see feedback

---

## 📊 What You Get

### Automatic Analysis:
- **Stroke Technique** (1-10 score)
- **Footwork** (1-10 score)  
- **Body Position** (1-10 score)
- **Timing** (1-10 score)
- **Coaching Drills** (personalized)

### Example Feedback:
```
"Your forehand shows excellent power and 
follow-through. Focus on early racket preparation 
and consistent contact point. Recommended drill: 
Rally with partner focusing on racket position."
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "API key not configured" | Check `.env.local` has key, restart dev |
| "Failed to analyze video" | Video too large? Try < 100MB |
| "Taking too long" | Larger videos = longer analysis (30-120s) |
| Falls back to placeholder | Check console logs, verify API key validity |

---

## 📁 Key Files

- `/src/services/geminiAnalysisService.ts` - AI engine
- `/src/components/motion-analysis/MotionAnalysisUpload.tsx` - Integration
- `GEMINI_SETUP.md` - Full documentation
- `GEMINI_AI_IMPLEMENTATION.md` - Technical details

---

## 🎯 Features Enabled

✅ Real-time video analysis  
✅ Frame-by-frame feedback  
✅ Coaching recommendations  
✅ Progress comparison (before/after)  
✅ Automatic fallback if API unavailable  

---

## 🌐 Environment Variables

### Development
```env
VITE_GEMINI_API_KEY=sk-...
```

### Vercel Production
```
Settings → Environment Variables → Add VITE_GEMINI_API_KEY
```

### Netlify Production
```
Site settings → Environment → Add VITE_GEMINI_API_KEY
```

---

## 📝 API Reference

```typescript
import { GeminiAnalysisService } from '@/services/geminiAnalysisService';

// Analyze video
const result = await GeminiAnalysisService.analyzeVideoTechnique(
  'video_url_or_blob',
  'table-tennis'
);

// Get coaching tips
const drills = await GeminiAnalysisService.getCoachingRecommendations(result);

// Compare progress
const comparison = await GeminiAnalysisService.compareVideos(
  videoBeforeUrl,
  videoAfterUrl
);
```

---

## 🎓 Next Steps

1. **Test uploads** - Try different video types
2. **Review feedback** - Check analysis quality
3. **Integrate UI** - Display results beautifully
4. **Add dashboard** - Show progress over time
5. **Deploy** - Add API key to production env

---

## 💡 Tips

- Use clear, well-lit videos for best results
- 30-60 seconds of footage works great
- Multiple angles help the AI understand technique
- Results are saved automatically to database
- Users can compare videos to track improvement

---

## 🆘 Support

- **Gemini Docs**: https://ai.google.dev/
- **GitHub Issues**: Check project issues
- **Console Logs**: Check browser console for details
- **Read GEMINI_SETUP.md**: Full troubleshooting guide

---

**Status**: ✅ Ready to use  
**Last Updated**: December 5, 2025  
**Model**: Gemini 2.0 Flash  
