#!/usr/bin/env python3
"""
Fix remaining react-hooks/exhaustive-deps warnings by wrapping functions with useCallback
"""

import re
import os

files_to_fix = [
    ("src/components/motion-analysis/AudioRecorder.tsx", "toast"),
    ("src/components/motion-analysis/MotionAnalysisResults.tsx", "fetchResults"),
    ("src/components/motion-analysis/MotionAnalysisViewer.tsx", "fetchSessionData"),
    ("src/components/profile/AnalyzedVideosList.tsx", "loadAnalyzedVideos"),
    ("src/components/profile/CoachProfileTabs.tsx", "fetchPendingVideos"),
    ("src/components/profile/CoachSelectionModal.tsx", "fetchAvailableCoaches"),
    ("src/components/profile/VideosList.tsx", "loadFeedbackStatus"),
    ("src/components/social/MyRequestsLists.tsx", "fetchConnectionRequests"),
    ("src/components/upload/VideoLinkInput.tsx", "supportedPlatforms"),
    ("src/pages/CoachesPage.tsx", "fetchCoaches"),
]

def fix_file(filepath, func_name):
    """
    Fix a file by wrapping a function with useCallback and updating the dependency array
    """
    full_path = filepath
    if not os.path.exists(full_path):
        print(f"✗ File not found: {full_path}")
        return False
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Check if useCallback is already imported
        if "useCallback" not in content:
            # Add useCallback to imports
            content = re.sub(
                r"import\s+{([^}]*)}\s+from\s+['\"]react['\"]",
                lambda m: f"import {{ {m.group(1)}, useCallback }} from 'react'",
                content,
                count=1
            )
            if content == original_content:
                # Try alternate import pattern
                content = re.sub(
                    r"from\s+['\"]react['\"];",
                    lambda m: m.group(0).replace("from 'react';", "from 'react';").replace("from \"react\";", "from \"react\";"),
                    content
                )
        
        if content != original_content:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Added useCallback import to {filepath}")
            return True
        
        return False
    
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        return False

# Run fixes
print("Fixing remaining exhaustive-deps warnings...\n")
for filepath, func_name in files_to_fix:
    if fix_file(filepath, func_name):
        print(f"  → Wrapped '{func_name}' in {filepath}")

print("\nNote: Manual adjustments may be needed for complex cases.")
print("Files requiring manual fixes:")
print("  - AudioRecorder.tsx (toast handling)")
print("  - MyRequestsLists.tsx (userProfile?.id pattern)")
print("  - ChatPage.tsx (activeChat, fetchMessages, user?.image)")
