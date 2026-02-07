# Kidney Education RAG Chatbot - Implementation Plan

## 1. Project Overview
A specialized chatbot meant to provide kidney education based **strictly** on a curated set of resource materials (PDFs, text files, markdown). The goal is to provide accurate information and eliminate hallucinations by restricting the AI's knowledge to the provided dataset.

## 2. Architecture & Interactive Flow

### **How to Open & Use**
- **Interface**: A clean, modern web-based chat interface (like ChatGPT or WhatsApp) built with Next.js.
- **Access**: You will run the app locally (e.g., `http://localhost:3000`) or deploy it to a web host (e.g., Vercel).
- **Interactivity**: 
    1. Users type a question about kidney health.
    2. The system searches your uploaded documents for the answer.
    3. The AI constructs an answer **only** using the found information.
    4. Sources are cited (e.g., "Source: diet_guidelines.pdf, page 3").

### **Where Resource Data is Saved**
- **Raw Data**: You will have a dedicated folder named `knowledge_base` in the project directory. You simply drag and drop your files (PDFs, DOCX, TXT, MD) here.
- **Processed Data (Vector Store)**: When you run our "ingest" script, the system reads these files, breaks them into small chunks, facilitates understanding, and saves them into a local mathematical database (Vector Store) located in a hidden `.vectorstore` folder. This allows the AI to "search" your documents instantly.

## 3. Strategy: "Strict RAG" (No Hallucinations)

To ensure the chatbot only answers from your resources:

1.  **Retrieval Only**: The AI is not allowed to access its internal general training data for answers. It functions purely as a synthesizer of the provided context.
2.  **Strict System Prompt**: We will configure the "brain" with a strict instruction:
    > "You are a trusted Kidney Education Assistant. You answer questions strictly based ONLY on the provided Context. If the answer is not found in the Context, you must explicitly state: 'I cannot find this information in the provided resources.' Do not make up answers or use outside knowledge."
3.  **Confidence Check (Optional)**: If the search step doesn't find any relevant documents (low similarity score), the bot will immediately decline to answer without even asking the AI, ensuring safety.

## 4. Technical Stack
- **Frontend**: Next.js 14 + Tailwind CSS (Premium, Glassmorphism design).
- **AI Framework**: LangChain (for glueing the data and the AI together).
- **Vector Database**: HNSWLib (local file-based, no external setup needed) or Pinecone (cloud-based, if preferred). *Recommendation: Local for simplicity.*
- **LLM**: OpenAI GPT-4o (best reasoning) or GPT-4o-mini (faster/cheaper).

## 5. Development Steps

### Phase 1: Foundation (Current Status: In Progress)
- [x] Initialize Next.js Project.
- [ ] Install AI dependencies (LangChain, OpenAI, PDF parsers).
- [ ] Create strict System Prompts.

### Phase 2: Knowledge Ingestion Engine
- [ ] Create `knowledge_base` directory.
- [ ] Write a script to read PDFs/Text files.
- [ ] Implement the "Embeddings" process to save data to the local Vector Store.

### Phase 3: The Chat Interface
- [ ] Build a beautiful, responsive chat UI.
- [ ] Connect the UI to the RAG backend.
- [ ] Add "Streaming" (typing effect) for a natural feel.

### Phase 4: Testing & Refinement
- [ ] Upload sample kidney data.
- [ ] Test with "out of scope" questions to verify it refuses to answer.
- [ ] Polish the UI.

## 6. How we accomplish "Strictness"
We use a **RetrievalQA Chain** with a specific `stuff` document prompt.
- **Input**: User Question.
- **Process**: Search Vector Store -> Get Top 3 relevant paragraphs -> Feed to LLM with Strict Prompt.
- **Output**: Answer or "I don't know".
