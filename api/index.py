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
    model: str = Form("gemini-2.0-flash"),
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

@app.post("/api/python/search")
async def search_tree(
    query: str = Form(...),
    tree_json: str = Form(...),
    model: str = Form("gemini-2.0-flash")
):
    try:
        tree = json.loads(tree_json)
        
        # Implementation of Reasoning Search (as seen in PageIndex tutorials)
        # We perform a breadth-first or depth-first reasoning traversal using the LLM.
        
        # Here we'll implement a simple one-shot tree reasoning for this bridge.
        # Ideally, this would be more recursive as per PageIndex's MCTS but this serves as a robust starting point.
        
        from pageindex.utils import ChatGPT_API
        
        prompt = f"""
You are an expert medical document assistant for Kidney AI.
You are given a query and the tree structure of a medical document (Kidney Health Guidelines).
You need to find all nodes (sections) that are likely to contain the precise answer to the query.

Query: {query}

Document tree structure (Summaries):
{json.dumps(tree, indent=2, ensure_ascii=False)[:30000]} # Truncate if too large, but tree is usually small

Reply in the following JSON format:
{{
  "thinking": "your reasoning about which nodes are relevant based on the section titles and summaries",
  "node_list": ["node_id1", "node_id2", ...]
}}
Directly return the JSON.
"""
        response = ChatGPT_API(model=model, prompt=prompt)
        # Assuming extract_json is available in pageindex.utils
        from pageindex.utils import extract_json
        search_result = extract_json(response)
        
        return search_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
