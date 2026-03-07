from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import tempfile
import asyncio
from typing import Optional
from pageindex.page_index import page_index, config

app = FastAPI()

# Enable CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set this to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/python/health")
def health_check():
    return {"status": "ok", "message": "PageIndex API is running"}

@app.post("/api/python/index-pdf")
async def index_pdf(
    file: UploadFile = File(...),
    model: str = Form(os.getenv("PYTHON_LLM_MODEL", "gpt-4o")),
    toc_check_pages: int = Form(20),
    max_pages_per_node: int = Form(10),
    max_tokens_per_node: int = Form(20000)
):
    try:
        # Save uploaded file to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Configure options
        # Note: we use the page_index wrapper which handles ConfigLoader
        result = page_index(
            doc=tmp_path,
            model=model,
            toc_check_page_num=toc_check_pages,
            max_page_num_each_node=max_pages_per_node,
            max_token_num_each_node=max_tokens_per_node,
            if_add_node_id='yes',
            if_add_node_summary='yes',
            if_add_doc_description='no',
            if_add_node_text='yes' # We need text for retrieval
        )

        # Cleanup
        os.unlink(tmp_path)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class SearchRequest(BaseModel):
    query: str
    trees_json: str
    model: str = os.getenv("PYTHON_LLM_MODEL", "gpt-4o")

@app.post("/api/python/search")
async def search_tree(req: SearchRequest):
    query = req.query
    trees_json = req.trees_json
    model = req.model

    try:
        # Step 1: Parse input trees
        data = json.loads(trees_json)
        trees = data if isinstance(data, list) else [data]
        
        from pageindex.utils import ChatGPT_API_async, extract_json
        
        # Step 2: Build a consolidated prompt for reasoning across all documents
        # This reduces LLM calls from N (number of files) to 1.
        trees_summary = ""
        for i, tree in enumerate(trees):
            trees_summary += f"\n--- DOCUMENT {i} ---\n"
            # We truncate individual trees if they are very large, but PageIndex trees are usually small
            trees_summary += json.dumps(tree, indent=2, ensure_ascii=False)[:10000]
            
        prompt = f"""
You are an expert medical document assistant for Kidney AI.
You are given a medical query and the tree structures (table of contents with summaries) of several documents.

TASK:
Find all nodes (sections) across ALL provided documents that are likely to contain the precise answer to the query.

Query: {query}

Document Tree Structures:
{trees_summary}

Reply in the following JSON format:
{{
  "thinking": "your reasoning about which nodes are relevant across all documents",
  "matches": [
    {{
      "doc_index": 0, 
      "node_list": ["node_id1", "node_id2", ...]
    }},
    ...
  ]
}}
Only return the JSON.
"""
        # Step 3: Run reasoning via Async LLM to prevent blocking
        response = await ChatGPT_API_async(model=model, prompt=prompt)
        
        if response == "Error":
            raise HTTPException(status_code=429, detail="Google API Rate Limit Exceeded during search.")
            
        search_result = extract_json(response)
        
        return search_result
    except HTTPException as he:
        # Don't wrap HTTP exceptions in 500
        raise he
    except Exception as e:
        import logging
        logging.error(f"Search API Critical Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
