# Vercel Deployment Guide - Servelytica

## Step 1: Prepare for Deployment

### 1.1 Verify `.env.local` File
Your `.env.local` file is ready with all necessary environment variables:
- ✅ Supabase URL and API Key
- ✅ Gemini API Key for AI analysis
- ✅ Application configuration

### 1.2 Build Verification
```bash
npm run build
```
Ensure build completes without errors (24-25 seconds typical).

---

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**: https://vercel.com/dashboard
2. **Add New Project**:
   - Click "Add New..." → "Project"
   - Select your GitHub repository: `mtariq441/servelytica`
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Configure Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add the following variables (copy from `.env.local`):

```
VITE_SUPABASE_URL=https://pxzlivocnykjjikkjago.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSyB2Be-29fJfETcyz8Wb-Xda9XLS5XgrmdM
VITE_GOOGLE_OAUTH_CLIENT_ID=your_value_here
```

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Get your live URL

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Login**:
```bash
vercel login
```

3. **Deploy**:
```bash
vercel
```

4. **Answer prompts**:
   - Project name: `servelytica`
   - Framework: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`

5. **Add Environment Variables**:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_GEMINI_API_KEY
vercel env add VITE_GOOGLE_OAUTH_CLIENT_ID
```

6. **Deploy to Production**:
```bash
vercel --prod
```

---

## Step 3: Configure Supabase for Production

### 3.1 Update Supabase URL in Production
Your Supabase project URL is already configured in `.env.local`:
```
VITE_SUPABASE_URL=https://pxzlivocnykjjikkjago.supabase.co
```

### 3.2 Enable Supabase Realtime (for Chat)
1. Go to: https://app.supabase.com → Project Settings → Realtime
2. Ensure realtime is enabled for:
   - messages table
   - profiles table
   - Any other real-time features

### 3.3 Update Supabase CORS Settings
1. Go to: https://app.supabase.com → Project Settings → API
2. Add your Vercel domain to CORS allowed origins:
   - `https://servelytica.vercel.app`
   - `https://*.vercel.app`

---

## Step 4: Post-Deployment Verification

### 4.1 Check Deployment Status
```bash
vercel status
```

### 4.2 Test Live Features
- ✅ Visit your deployed site
- ✅ Test authentication (Sign up / Login)
- ✅ Test video upload
- ✅ Test AI analysis (Gemini integration)
- ✅ Test real-time chat
- ✅ Test coach features

### 4.3 Monitor Build Logs
- Vercel Dashboard → Deployments tab
- Check for any runtime errors or warnings

---

## Step 5: Custom Domain Setup (Optional)

1. **Add Custom Domain**:
   - Vercel Dashboard → Settings → Domains
   - Click "Add Domain"
   - Enter your domain: `servelytica.com`

2. **Configure DNS**:
   - Update your domain provider's DNS records
   - Add CNAME pointing to Vercel: `cname.vercel-dns.com`

3. **Enable SSL/HTTPS**:
   - Vercel auto-enables SSL (usually within minutes)

---

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | Database URL | `https://pxzlivocnykjjikkjago.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Database Public Key | `eyJhbGc...` |
| `VITE_GEMINI_API_KEY` | AI Analysis | `AIzaSyB...` |
| `VITE_GOOGLE_OAUTH_CLIENT_ID` | Social Login | Your OAuth ID |
| `VITE_APP_ENV` | Environment | `production` |

---

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -rf .next dist node_modules
npm install
npm run build
```

### Supabase Connection Issues
- Verify VITE_SUPABASE_URL is correct
- Check API key has correct permissions
- Ensure CORS is configured in Supabase

### AI Analysis Not Working
- Verify VITE_GEMINI_API_KEY is valid
- Check API quota: https://ai.google.dev
- Ensure API is enabled in Google Cloud Console

### Realtime Chat Not Working
- Check Supabase realtime is enabled
- Verify messages table permissions
- Check browser console for WebSocket errors

---

## Post-Deployment Checklist

- [ ] Site loads without errors
- [ ] Authentication working (login/signup)
- [ ] Video upload working
- [ ] AI analysis working
- [ ] Chat feature working
- [ ] All pages accessible
- [ ] No console errors
- [ ] Database queries working
- [ ] File uploads working
- [ ] Images loading correctly

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Gemini API Docs**: https://ai.google.dev/docs
- **Vite Docs**: https://vitejs.dev

---

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Test all features
3. ✅ Monitor performance
4. ✅ Set up custom domain
5. ✅ Enable analytics (Vercel Analytics)
6. ✅ Configure error tracking (Sentry optional)
7. ✅ Announce launch to users

---

**Deployment Date**: December 6, 2025
**Status**: Ready for Production
**Live URL**: https://servelytica.vercel.app (after deployment)
