#!/usr/bin/env python3
"""
Advanced dependency fixer for React exhaustive-deps warnings.
Adds missing functions to useEffect dependency arrays.
"""

import os
import re
from pathlib import Path

# Mapping of files to their specific fixes
FIXES = {
    "src/components/blog/BlogPost.tsx": {
        "useEffect(() => {\n    loadComments();": "useEffect(() => {\n    loadComments();", 
        "}, [article.id]);": "}, [article.id, loadComments]);"
    },
    "src/components/blog/BookmarkButton.tsx": {
        "useEffect(() => {\n    checkBookmarkStatus();": "useEffect(() => {\n    checkBookmarkStatus();",
        "}, [bookmarkId]);": "}, [bookmarkId, checkBookmarkStatus]);"
    },
    "src/components/blog/CommentSystem.tsx": {
        "useEffect(() => {\n    loadComments();": "useEffect(() => {\n    loadComments();",
        "}, [articleId]);": "}, [articleId, loadComments]);"
    },
    "src/pages/CoachesPage.tsx": {
        "}, []);": "}, [filteredCoaches]);"
    }
}

def apply_fix(filepath, old_str, new_str):
    """Apply a string replacement fix to a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if old_str in content:
            new_content = content.replace(old_str, new_str)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    workspace = Path("d:/servelytica (1)/servelytica")
    os.chdir(str(workspace))
    
    print("Applying targeted fixes for dependency warnings...\n")
    
    # Fix CoachesPage specifically - replace the dependency array
    coaches_file = workspace / "src/pages/CoachesPage.tsx"
    if coaches_file.exists():
        with open(coaches_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the useEffect with filteredCoaches and add it to dependencies
        if "useEffect(() => {" in content and "filteredCoaches" in content:
            # Look for the specific pattern - useEffect with empty dependency array near filteredCoaches
            pattern = r"useEffect\(\(\) => \{\s*filterAndSortCoaches\(\);?\s*\}, \[\]\);"
            if re.search(pattern, content):
                new_content = re.sub(
                    pattern,
                    "useEffect(() => {\n    filterAndSortCoaches();\n  }, [filteredCoaches]);",
                    content
                )
                with open(coaches_file, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print("✓ Fixed CoachesPage.tsx")
    
    print("\nDone!")

if __name__ == "__main__":
    main()
