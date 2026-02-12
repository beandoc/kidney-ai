#!/usr/bin/env python3
"""
PDF to JSON Preprocessor for Kidney AI RAG Chatbot
===================================================
Converts medical PDFs (KDIGO guidelines, clinical documents) into 
structured JSON files optimized for vector embedding and RAG retrieval.

Usage:
    python scripts/pdf_to_json.py <input_pdf> [--output <output_path>]
    python scripts/pdf_to_json.py ./docs/KDIGO-2012-AKI-Guideline.pdf
    python scripts/pdf_to_json.py ./docs/ --all   # Process all PDFs in a directory

Requirements:
    pip install pdfplumber

Output format (JSON array):
    [
        {
            "section": "Chapter 2: AKI Definition",
            "content": "AKI is defined as an increase in serum creatinine...",
            "page": 15,
            "source": "KDIGO-2012-AKI-Guideline-English.pdf"
        },
        ...
    ]
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("=" * 60)
    print("ERROR: pdfplumber is not installed.")
    print("Install it with:  pip install pdfplumber")
    print("=" * 60)
    sys.exit(1)


def detect_section_headers(page, text_lines):
    """
    Analyze font sizes on a page to detect section headers.
    Returns a list of lines marked as 'header' or 'body'.
    """
    elements = []
    
    if not page.chars:
        # Fallback: if no char-level data, use heuristics
        for line in text_lines:
            stripped = line.strip()
            if not stripped:
                continue
            is_header = (
                stripped.isupper() and len(stripped) > 5 and len(stripped) < 200
                or re.match(r'^(Chapter|Section|CHAPTER|SECTION)\s+\d', stripped)
                or re.match(r'^\d+\.\d*\s+[A-Z]', stripped)
                or (stripped.startswith('KDIGO') and len(stripped) < 150)
            )
            elements.append({
                'text': stripped,
                'is_header': is_header
            })
        return elements
    
    # Group characters by their y-position (same line)
    line_chars = {}
    for char in page.chars:
        y_key = round(char['top'], 1)
        if y_key not in line_chars:
            line_chars[y_key] = []
        line_chars[y_key].append(char)
    
    # Calculate median font size for the page
    all_sizes = [c['size'] for c in page.chars if c.get('size')]
    if not all_sizes:
        return elements
    
    median_size = sorted(all_sizes)[len(all_sizes) // 2]
    
    # Process each line
    for y_key in sorted(line_chars.keys()):
        chars = line_chars[y_key]
        text = ''.join(c['text'] for c in chars).strip()
        if not text or len(text) < 2:
            continue
        
        avg_size = sum(c.get('size', median_size) for c in chars) / len(chars)
        is_bold = any('Bold' in (c.get('fontname', '') or '') for c in chars)
        
        # Header detection: larger font, bold, or matches header patterns
        is_header = (
            avg_size > median_size * 1.15  # 15% larger than median
            or (is_bold and avg_size >= median_size and len(text) < 200)
            or re.match(r'^(Chapter|Section|CHAPTER|SECTION)\s+\d', text)
            or re.match(r'^\d+\.\d*\s+[A-Z]', text)
        )
        
        elements.append({
            'text': text,
            'is_header': is_header,
            'font_size': round(avg_size, 1),
            'is_bold': is_bold
        })
    
    return elements


def extract_tables_from_page(page):
    """Extract tables from a page and format them as readable text."""
    tables_text = []
    
    try:
        tables = page.extract_tables()
        for table_idx, table in enumerate(tables):
            if not table:
                continue
            
            rows = []
            for row in table:
                # Clean None values
                cleaned = [str(cell).strip() if cell else '' for cell in row]
                if any(cleaned):  # Skip fully empty rows
                    rows.append(cleaned)
            
            if len(rows) < 2:
                continue
            
            # Format as readable text with headers
            header = rows[0]
            table_text = f"[Table {table_idx + 1}]\n"
            table_text += " | ".join(header) + "\n"
            table_text += "-" * 60 + "\n"
            for row in rows[1:]:
                table_text += " | ".join(row) + "\n"
            
            tables_text.append(table_text)
    except Exception as e:
        # Table extraction can fail on some pages
        pass
    
    return tables_text


def process_pdf(pdf_path, min_section_length=50, max_section_length=3000):
    """
    Process a PDF file into structured sections.
    
    Args:
        pdf_path: Path to the PDF file
        min_section_length: Minimum characters for a section to be included
        max_section_length: Maximum characters before splitting a section
    
    Returns:
        List of section dictionaries
    """
    pdf_path = Path(pdf_path)
    filename = pdf_path.name
    
    print(f"\n{'='*60}")
    print(f"Processing: {filename}")
    print(f"{'='*60}")
    
    sections = []
    current_section = None
    current_content = []
    current_page = 1
    
    def flush_section():
        """Save the current section if it has enough content."""
        nonlocal current_section, current_content, current_page
        if current_content:
            content = '\n'.join(current_content).strip()
            if len(content) >= min_section_length:
                # Split overly long sections
                if len(content) > max_section_length:
                    chunks = split_long_text(content, max_section_length)
                    for i, chunk in enumerate(chunks):
                        sections.append({
                            'section': f"{current_section or 'Content'} (Part {i+1})",
                            'content': chunk.strip(),
                            'page': current_page,
                            'source': filename
                        })
                else:
                    sections.append({
                        'section': current_section or 'Content',
                        'content': content,
                        'page': current_page,
                        'source': filename
                    })
        current_content = []
    
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")
        
        for page_num, page in enumerate(pdf.pages, 1):
            if page_num % 10 == 0:
                print(f"  Processing page {page_num}/{total_pages}...")
            
            # Extract text
            text = page.extract_text() or ''
            lines = text.split('\n')
            
            # Detect headers and structure
            elements = detect_section_headers(page, lines)
            
            for elem in elements:
                if elem['is_header']:
                    # Start a new section
                    flush_section()
                    current_section = elem['text']
                    current_page = page_num
                else:
                    current_content.append(elem['text'])
            
            # Extract and append tables
            tables = extract_tables_from_page(page)
            for table_text in tables:
                current_content.append(table_text)
        
        # Flush the last section
        flush_section()
    
    print(f"  Extracted {len(sections)} sections")
    return sections


def split_long_text(text, max_length):
    """Split long text at sentence boundaries."""
    chunks = []
    current = []
    current_len = 0
    
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    for sentence in sentences:
        if current_len + len(sentence) > max_length and current:
            chunks.append(' '.join(current))
            current = [sentence]
            current_len = len(sentence)
        else:
            current.append(sentence)
            current_len += len(sentence) + 1
    
    if current:
        chunks.append(' '.join(current))
    
    return chunks


def save_json(sections, output_path):
    """Save sections as a formatted JSON file."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(sections, f, indent=2, ensure_ascii=False)
    
    file_size = output_path.stat().st_size
    print(f"\n✅ Saved: {output_path}")
    print(f"   Sections: {len(sections)}")
    print(f"   File size: {file_size / 1024:.1f} KB")
    
    # Warn if too large for upload
    if file_size > 4 * 1024 * 1024:
        print(f"   ⚠️  File is larger than 4MB! Consider splitting it.")
        return split_large_json(sections, output_path)
    
    return [output_path]


def split_large_json(sections, base_path):
    """Split a large JSON file into smaller parts under 4MB."""
    base = base_path.stem
    ext = base_path.suffix
    parent = base_path.parent
    
    parts = []
    current_part = []
    current_size = 0
    part_num = 1
    MAX_SIZE = 3.5 * 1024 * 1024  # 3.5MB to be safe
    
    for section in sections:
        section_size = len(json.dumps(section, ensure_ascii=False).encode('utf-8'))
        
        if current_size + section_size > MAX_SIZE and current_part:
            # Save current part
            part_path = parent / f"{base}_part{part_num}{ext}"
            with open(part_path, 'w', encoding='utf-8') as f:
                json.dump(current_part, f, indent=2, ensure_ascii=False)
            parts.append(part_path)
            print(f"   📄 Part {part_num}: {part_path.name} ({current_size / 1024:.1f} KB, {len(current_part)} sections)")
            
            current_part = [section]
            current_size = section_size
            part_num += 1
        else:
            current_part.append(section)
            current_size += section_size
    
    # Save last part
    if current_part:
        part_path = parent / f"{base}_part{part_num}{ext}"
        with open(part_path, 'w', encoding='utf-8') as f:
            json.dump(current_part, f, indent=2, ensure_ascii=False)
        parts.append(part_path)
        print(f"   📄 Part {part_num}: {part_path.name} ({current_size / 1024:.1f} KB, {len(current_part)} sections)")
    
    # Remove the original large file
    if base_path.exists():
        base_path.unlink()
        print(f"   🗑️  Removed oversized original: {base_path.name}")
    
    return parts


def main():
    parser = argparse.ArgumentParser(
        description='Convert medical PDFs to structured JSON for Kidney AI RAG chatbot',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/pdf_to_json.py KDIGO-guideline.pdf
  python scripts/pdf_to_json.py ./docs/ --all
  python scripts/pdf_to_json.py KDIGO.pdf --output ./knowledge_base/kdigo.json
        """
    )
    parser.add_argument('input', help='PDF file path or directory')
    parser.add_argument('--output', '-o', help='Output JSON file path (default: same name as input with .json)')
    parser.add_argument('--all', action='store_true', help='Process all PDFs in a directory')
    parser.add_argument('--min-length', type=int, default=50, help='Minimum section length in chars (default: 50)')
    parser.add_argument('--max-length', type=int, default=3000, help='Maximum section length before splitting (default: 3000)')
    parser.add_argument('--output-dir', '-d', help='Output directory for JSON files (default: ./knowledge_base/)')
    
    args = parser.parse_args()
    input_path = Path(args.input)
    output_dir = Path(args.output_dir) if args.output_dir else Path('knowledge_base')
    
    if not input_path.exists():
        print(f"Error: {input_path} does not exist")
        sys.exit(1)
    
    # Collect PDF files
    pdf_files = []
    if input_path.is_dir():
        if not args.all:
            print("Use --all flag to process all PDFs in a directory")
            sys.exit(1)
        pdf_files = sorted(input_path.glob('*.pdf'))
        if not pdf_files:
            print(f"No PDF files found in {input_path}")
            sys.exit(1)
    else:
        pdf_files = [input_path]
    
    print(f"\n🏥 Kidney AI - PDF Preprocessor")
    print(f"{'='*40}")
    print(f"Files to process: {len(pdf_files)}")
    
    all_output_files = []
    
    for pdf_file in pdf_files:
        try:
            sections = process_pdf(
                pdf_file,
                min_section_length=args.min_length,
                max_section_length=args.max_length
            )
            
            if not sections:
                print(f"  ⚠️  No sections extracted from {pdf_file.name}")
                continue
            
            # Determine output path
            if args.output and len(pdf_files) == 1:
                out_path = Path(args.output)
            else:
                out_path = output_dir / f"{pdf_file.stem}.json"
            
            output_files = save_json(sections, out_path)
            all_output_files.extend(output_files)
            
        except Exception as e:
            print(f"  ❌ Error processing {pdf_file.name}: {e}")
            import traceback
            traceback.print_exc()
    
    # Summary
    print(f"\n{'='*60}")
    print(f"📊 SUMMARY")
    print(f"{'='*60}")
    print(f"Processed: {len(pdf_files)} PDF(s)")
    print(f"Output files: {len(all_output_files)}")
    for f in all_output_files:
        size_kb = f.stat().st_size / 1024
        print(f"  📄 {f} ({size_kb:.1f} KB)")
    
    print(f"\n💡 Next Steps:")
    print(f"   1. Go to your Admin Panel (http://localhost:3000/admin)")
    print(f"   2. Upload the JSON file(s) listed above")
    print(f"   3. The chatbot will use the structured data for better answers")
    print()


if __name__ == '__main__':
    main()
