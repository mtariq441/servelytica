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

-- Verify the change
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'motion_analysis_results' AND column_name = 'score';
