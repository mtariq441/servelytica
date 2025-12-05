#!/bin/bash

# Apply the numeric overflow fix to Supabase
# This script fixes the motion_analysis_results table

echo "Fixing numeric field overflow in motion_analysis_results..."
echo ""
echo "Run this SQL in your Supabase SQL Editor:"
echo ""
echo "-- Fix numeric field overflow in motion_analysis_results table"
echo "-- This migration fixes the score field from DECIMAL(3,2) to NUMERIC(5,2)"
echo ""
echo "-- Drop the existing constraint"
echo "ALTER TABLE public.motion_analysis_results"
echo "DROP CONSTRAINT motion_analysis_results_score_check;"
echo ""
echo "-- Alter the score column to use NUMERIC(5,2) instead of DECIMAL(3,2)"
echo "ALTER TABLE public.motion_analysis_results"
echo "ALTER COLUMN score TYPE NUMERIC(5,2);"
echo ""
echo "-- Re-add the constraint with proper numeric range"
echo "ALTER TABLE public.motion_analysis_results"
echo "ADD CONSTRAINT motion_analysis_results_score_check CHECK (score >= 0 AND score <= 100);"
echo ""
echo "Done!"
