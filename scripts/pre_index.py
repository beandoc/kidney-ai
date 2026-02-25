import os
import json
import sys
from pageindex.page_index import page_index

KNOWLEDGE_BASE_DIR = "knowledge_base"
OUTPUT_DIR = "knowledge_base/pageindex"

def pre_index_all():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    files = [f for f in os.listdir(KNOWLEDGE_BASE_DIR) if f.endswith(".pdf")]
    
    for file in files:
        pdf_path = os.path.join(KNOWLEDGE_BASE_DIR, file)
        output_path = os.path.join(OUTPUT_DIR, f"{file}.json")
        
        if os.path.exists(output_path):
            print(f"Skipping {file}, already indexed.")
            continue
            
        print(f"Indexing {file}...")
        try:
            result = page_index(
                doc=pdf_path,
                model="gpt-4o-2024-11-20",
                if_add_node_id='yes',
                if_add_node_summary='yes',
                if_add_node_text='yes'
            )
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"Successfully indexed {file}")
        except Exception as e:
            print(f"Failed to index {file}: {e}")

if __name__ == "__main__":
    pre_index_all()
