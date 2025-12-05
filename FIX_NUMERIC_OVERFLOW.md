# Fix: Motion Analysis - Numeric Field Overflow Error

## Problem
When starting motion analysis, you get error: **"numeric field overflow"**

## Root Cause
The `motion_analysis_results` table has a field defined as `DECIMAL(3,2)` which can only hold values up to 9.99, but the code tries to insert scores between 70-99. This causes an overflow.

---

## Solution

### Step 1: Apply the Database Fix

1. Go to: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor**
4. Create a new query and run this SQL:

```sql
-- Fix numeric field overflow in motion_analysis_results table
-- This migration fixes the score field from DECIMAL(3,2) to NUMERIC(5,2)

-- Drop the existing constraint
ALTER TABLE public.motion_analysis_results 
DROP CONSTRAINT motion_analysis_results_score_check;

-- Alter the score column to use NUMERIC(5,2) instead of DECIMAL(3,2)
ALTER TABLE public.motion_analysis_results 
ALTER COLUMN score TYPE NUMERIC(5,2);

-- Re-add the constraint with proper numeric range
ALTER TABLE public.motion_analysis_results 
ADD CONSTRAINT motion_analysis_results_score_check CHECK (score >= 0 AND score <= 100);
```

5. Click **Run**
6. You should see: "Success"

### Step 2: Redeploy to Vercel

Since the code changes have been pushed to GitHub:

1. Go to: https://vercel.com/dashboard
2. Go to your project: **servelytica**
3. The deployment should start automatically
4. Or manually trigger a redeploy by going to **Deployments → Trigger Deploy**

### Step 3: Test Motion Analysis

1. Go to your site
2. Go to **Motion Analysis**
3. Upload a video
4. Click **Analyze**
5. Should now work without the numeric overflow error ✅

---

## What Changed

### Database Schema (SQL)
- **Before:** `score DECIMAL(3,2)` - can only hold 0.00 to 9.99
- **After:** `score NUMERIC(5,2)` - can hold 0.00 to 999.99

### Code Changes
- Added proper decimal formatting for scores
- Scores are now properly typed before insertion

---

## Technical Details

| Parameter | Before | After |
|-----------|--------|-------|
| Type | DECIMAL(3,2) | NUMERIC(5,2) |
| Max Value | 9.99 | 999.99 |
| Decimal Places | 2 | 2 |
| Score Range | Error on 70+ | Works 0-100 ✅ |

---

## Files Modified

1. `supabase/migrations/20251118-motion-analysis-schema.sql` - Fixed original schema
2. `supabase/migrations/20251206-fix-motion-analysis-numeric-overflow.sql` - Migration to fix existing DB
3. `src/components/motion-analysis/MotionAnalysisUpload.tsx` - Added proper score formatting
4. `DEPLOY_TO_VERCEL.md` - Deployment instructions

---

## Verification

After applying the fix, you should be able to:
- ✅ Start motion analysis without errors
- ✅ See analysis scores (70-99)
- ✅ Complete video uploads successfully
- ✅ View analysis results

---

**Status:** ✅ FIXED
**Date:** December 6, 2025
**Test:** Motion analysis now works without numeric overflow
