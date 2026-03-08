import json
import os
import sys
from pathlib import Path

try:
    import pymupdf4llm
except ImportError:
    print("pip3 install pymupdf4llm required.")
    sys.exit(1)

def chunk_markdown_by_headers(markdown_text, page_map, source_filename):
    """Splits markdown into logical sections based on # headers"""
    lines = markdown_text.split("\n")
    sections = []
    
    current_section = "Executive Summary"
    current_content = []
    current_page = 1
    
    for line in lines:
        # Very rough page tracking if you know pymupdf injects page breaks
        if "-----" in line and "Page" in line:
            current_page += 1
            
        if line.strip().startswith("#"):
            # Header found - flush current section
            if ''.join(current_content).strip():
                sections.append({
                    'section': current_section,
                    'content': '\n'.join(current_content).strip(),
                    'page': current_page,
                    'source': source_filename
                })
            current_content = []
            current_section = line.lstrip("#").strip()
        else:
            current_content.append(line)
            
    # Flush remaining
    if ''.join(current_content).strip():
        sections.append({
            'section': current_section,
            'content': '\n'.join(current_content).strip(),
            'page': current_page,
            'source': source_filename
        })
        
    return sections

def process_pdf(pdf_path):
    pdf_path = Path(pdf_path)
    filename = pdf_path.name
    print(f"==============================")
    print(f"Processing: {filename}")
    
    try:
        # Super clean local Markdown extraction that PRESERVES spaces!
        md_text = pymupdf4llm.to_markdown(str(pdf_path))
        print(f"Extracted {len(md_text)} chars of Markdown.")
        
        sections = chunk_markdown_by_headers(md_text, {}, filename)
        
        # Save output
        out_name = pdf_path.stem + ".json"
        
        kb_dir = Path(os.getcwd()) / "knowledge_base"
        pageindex_dir = kb_dir / "pageindex"
        
        kb_dir.mkdir(parents=True, exist_ok=True)
        pageindex_dir.mkdir(parents=True, exist_ok=True)
        
        out_path1 = kb_dir / out_name
        out_path2 = pageindex_dir / out_name
        
        with open(out_path1, 'w', encoding='utf-8') as f:
            json.dump(sections, f, indent=2, ensure_ascii=False)
            
        with open(out_path2, 'w', encoding='utf-8') as f:
            json.dump(sections, f, indent=2, ensure_ascii=False)
            
        print(f"✅ Saved {len(sections)} high-quality layout-aware sections to {out_name}.")
        
    except Exception as e:
        print(f"❌ Failed to process {filename}: {e}")

if __name__ == "__main__":
    pdfs = [
        "/Users/sachinsrivastava/Downloads/KDIGO-2012-AKI-Guideline-English.pdf",
        "/Users/sachinsrivastava/Downloads/Obsidian Vault/KDIGO_2024_Lupus_Nephritis_Guideline.pdf",
        "/Users/sachinsrivastava/Downloads/Obsidian Vault/KDIGO-2024-ANCA-Vasculitis-Guideline-Executive-Summary.pdf"
    ]
    
    for pdf in pdfs:
        if os.path.exists(pdf):
            process_pdf(pdf)
        else:
            print(f"⚠️ Missing: {pdf}")
