import os
import glob

root_dir = r'd:\ff t app\2'
html_files = glob.glob(os.path.join(root_dir, '**', '*.html'), recursive=True)

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Determine relative path to mock-backend.js based on file depth
    rel_path = os.path.relpath(os.path.join(root_dir, 'js', 'mock-backend.js'), os.path.dirname(file))
    # Replace backslashes with forward slashes
    rel_path = rel_path.replace(os.sep, '/')
    
    script_tag = f'<script src="{rel_path}"></script>'
    
    if script_tag not in content:
        content = content.replace('</head>', f'    {script_tag}\n</head>')
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
