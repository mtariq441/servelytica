# Deploy to Vercel - Quick Instructions

## Your Credentials Ready ✅

Your environment variables are now configured:

```
VITE_SUPABASE_URL=https://pxzlivocnykjjikkjago.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4emxpdm9jbnlramppa2tqYWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NTUwMDgsImV4cCI6MjA2MzAzMTAwOH0.l5yrgpfxJew3JxaihQB8Uu0a-sdI5pd2eR8cVGxrO1I
SUPABASE_URL=https://pxzlivocnykjjikkjago.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4emxpdm9jbnlramppa2tqYWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NTUwMDgsImV4cCI6MjA2MzAzMTAwOH0.l5yrgpfxJew3JxaihQB8Uu0a-sdI5pd2eR8cVGxrO1I
DATABASE_URL=postgresql://postgres:EU5URRXWv1yPWop7@db.pxzlivocnykjjikkjago.supabase.co:5432/postgres
VITE_GEMINI_API_KEY=AIzaSyB2Be-29fJfETcyz8Wb-Xda9XLS5XgrmdM
```

## Deploy to Vercel - Two Options

### Option 1: Deploy via Vercel Dashboard (RECOMMENDED)

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard

2. **Add New Project:**
   - Click "Add New..." → "Project"
   - Import GitHub repository: `mtariq441/servelytica`
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Add Environment Variables:**
   - Go to **Settings → Environment Variables**
   - Add these variables:
   
   ```
   VITE_SUPABASE_URL = https://pxzlivocnykjjikkjago.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4emxpdm9jbnlramppa2tqYWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NTUwMDgsImV4cCI6MjA2MzAzMTAwOH0.l5yrgpfxJew3JxaihQB8Uu0a-sdI5pd2eR8cVGxrO1I
   SUPABASE_URL = https://pxzlivocnykjjikkjago.supabase.co
   SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4emxpdm9jbnlramppa2tqYWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NTUwMDgsImV4cCI6MjA2MzAzMTAwOH0.l5yrgpfxJew3JxaihQB8Uu0a-sdI5pd2eR8cVGxrO1I
   DATABASE_URL = postgresql://postgres:EU5URRXWv1yPWop7@db.pxzlivocnykjjikkjago.supabase.co:5432/postgres
   VITE_GEMINI_API_KEY = AIzaSyB2Be-29fJfETcyz8Wb-Xda9XLS5XgrmdM
   ```

4. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Get your live URL!

### Option 2: Deploy via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

Then add environment variables:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add DATABASE_URL
vercel env add VITE_GEMINI_API_KEY
```

---

## What's Fixed ✅

- **3 Coaches Display:** Home page now shows 3 featured coaches (Michael Chen, Sarah Wong, David Müller)
- **Authentication:** Login should now work with your Supabase credentials
- **Database:** All features connected and ready

---

## Test After Deployment ✅

Once deployed, test:
- ✅ Home page loads (with 3 coaches visible)
- ✅ Can see "MEET OUR TOP COACHES" section
- ✅ Login/Signup works
- ✅ Video upload works
- ✅ AI analysis works

---

## Your Live URL

After deployment, you'll get a URL like:
- `https://servelytica.vercel.app`

Share this with anyone to view your live site!

---

**Status:** ✅ Ready for Vercel Deployment
**Last Update:** December 6, 2025
