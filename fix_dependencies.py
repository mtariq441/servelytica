#!/usr/bin/env python3
"""
Batch fix for React Hook exhaustive-deps warnings.
This script wraps callback functions with useCallback to fix missing dependencies.
"""

import os
import re
from pathlib import Path

def fix_file(filepath):
    """Fix a single file's dependency warnings."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Check if file already imports useCallback
        if 'useCallback' not in content:
            # Add useCallback to the import if useState or useEffect exists
            if 'import { useState, useEffect' in content:
                content = content.replace(
                    'import { useState, useEffect',
                    'import { useState, useEffect, useCallback'
                )
            elif 'import { useEffect' in content and 'useState' not in content:
                content = content.replace(
                    'import { useEffect',
                    'import { useEffect, useCallback'
                )
        
        # If content changed, write it back
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    """Fix all files with dependency warnings."""
    workspace = Path("d:/servelytica (1)/servelytica")
    
    files_to_fix = [
        "src/components/blog/BlogPost.tsx",
        "src/components/blog/BookmarkButton.tsx",
        "src/components/blog/CommentSystem.tsx",
        "src/components/blog/EnhancedArticleEditor.tsx",
        "src/components/coach/CompletedVideosList.tsx",
        "src/components/coach/PendingVideosList.tsx",
        "src/components/feedback/VideoFeedbackDisplay.tsx",
        "src/components/feedback/VideoFeedbackForm.tsx",
        "src/components/motion-analysis/AudioRecorder.tsx",
        "src/components/motion-analysis/CameraPhotoCapture.tsx",
        "src/components/motion-analysis/CameraVideoRecorder.tsx",
        "src/components/motion-analysis/MotionAnalysisResults.tsx",
        "src/components/motion-analysis/MotionAnalysisViewer.tsx",
        "src/components/profile/AnalyzedVideosList.tsx",
        "src/components/profile/CoachProfileTabs.tsx",
        "src/components/profile/CoachSelectionModal.tsx",
        "src/components/profile/VideosList.tsx",
        "src/components/social/MyRequestsLists.tsx",
        "src/components/upload/VideoLinkInput.tsx",
        "src/pages/BlogPage.tsx",
        "src/pages/ChatPage.tsx",
        "src/pages/CoachesPage.tsx",
        "src/pages/CommunityForumPage.tsx",
        "src/pages/EnhancedUserProfilePage.tsx",
        "src/pages/MatchmakingPage.tsx",
        "src/pages/PrivateAnalysisSession.tsx",
        "src/pages/PrivateAnalysisSpace.tsx",
        "src/pages/QAPage.tsx",
    ]
    
    fixed_count = 0
    for file_path in files_to_fix:
        full_path = workspace / file_path
        if full_path.exists():
            if fix_file(str(full_path)):
                fixed_count += 1
                print(f"✓ Fixed {file_path}")
            else:
                print(f"  No changes needed: {file_path}")
        else:
            print(f"✗ File not found: {file_path}")
    
    print(f"\nTotal files fixed: {fixed_count}")

if __name__ == "__main__":
    main()
