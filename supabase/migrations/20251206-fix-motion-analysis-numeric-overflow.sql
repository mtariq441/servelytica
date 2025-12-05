-- Fix numeric field overflow in motion_analysis_results table
-- This migration fixes the score field from DECIMAL(3,2) to NUMERIC(5,2)

-- Drop the existing constraint
-- Drop the existing constraint if it exists
ALTER TABLE public.motion_analysis_results
DROP CONSTRAINT IF EXISTS motion_analysis_results_score_check;

-- Alter the score column to use NUMERIC(5,2) instead of DECIMAL(3,2)
ALTER TABLE public.motion_analysis_results 
ALTER COLUMN score TYPE NUMERIC(5,2);

-- Re-add the constraint with proper numeric range
-- Re-add the constraint only if it does not already exist
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'motion_analysis_results_score_check'
	) THEN
		ALTER TABLE public.motion_analysis_results
		ADD CONSTRAINT motion_analysis_results_score_check CHECK (score >= 0 AND score <= 100);
	END IF;
END$$;

-- Verify the change
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'motion_analysis_results' AND column_name = 'score';
