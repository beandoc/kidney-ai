# Kidney Education RAG Chatbot - Development Tasks

## Phase 1: Foundation & Setup
- [x] Create Next.js project with Tailwind CSS. <!-- id: 0 -->
- [x] Install LangChain and AI dependencies. <!-- id: 1 -->
- [ ] Configure environment variables (`OPENAI_API_KEY`). <!-- id: 2 -->
- [ ] Create project structure (`knowledge_base`, `lib`, `components`). <!-- id: 3 -->

## Phase 2: Knowledge Ingestion Engine
- [ ] create `ingest.ts` script to read PDF/Text files from `knowledge_base`. <!-- id: 4 -->
- [ ] Implement text splitting and embedding generation. <!-- id: 5 -->
- [ ] Set up local vector store (HNSWLib or similar via LangChain). <!-- id: 6 -->
- [ ] create a sample kidney health document for testing. <!-- id: 7 -->

## Phase 3: RAG Backend & "Strict Mode"
- [ ] Implement `route.ts` API for chat interactions. <!-- id: 8 -->
- [ ] Create the Strict System Prompt to prevent hallucinations. <!-- id: 9 -->
- [ ] Implement the RetrievalQA chain. <!-- id: 10 -->

## Phase 4: User Interface
- [ ] Create `ChatComponent` with message history. <!-- id: 11 -->
- [ ] Design the UI with premium aesthetics (Glassmorphism, Tailwind). <!-- id: 12 -->
- [ ] Integrate UI with the RAG backend API. <!-- id: 13 -->

## Phase 5: Testing & Deployment
- [ ] Verify answers against source documents. <!-- id: 14 -->
- [ ] Test negative cases (questions outside scope). <!-- id: 15 -->
- [ ] (Optional) Deploy to Vercel/Netlify. <!-- id: 16 -->
