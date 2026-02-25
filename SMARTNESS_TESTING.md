# 🧠 Chatbot Smartness Testing Guide

To ensure your Kidney AI chatbot is intelligent, consistent, and clinically accurate, you should perform **Semantic Variation Testing**. This verifies that the bot understands the *intent* of a question regardless of how it is phrased.

## 🚀 How to Run the Smartness Benchmark

1.  **Start your local development server:**
    ```bash
    npm run dev
    ```

2.  **Run the evaluation script:**
    (Open a new terminal window)
    ```bash
    npx tsx scripts/evaluate_chat.ts
    ```

3.  **View the Results:**
    Open `scripts/smartness_report.md` to see the side-by-side comparison of responses.

## 📊 What to Look For (Evaluation Metrics)

### 1. Retrieval Stability (Sources)
*   **Ideal:** All variations of the same core question should cite the same sources.
*   **Issue:** If "What foods to avoid" cites PDF A and "Kidney diet" cites PDF B, it means your retrieval window or embedding similarity is too narrow.

### 2. Clinical Consistency
*   **Ideal:** The medical facts (e.g., "avoid high potassium foods like bananas") should remain constant across all answers.
*   **Issue:** If one response says "Bananas are fine" and another says "Avoid bananas," the LLM is hallucinating or the context provided is contradictory.

### 3. Length & Detail Robustness
*   **Ideal:** The bot should provide high-quality answers even for "keyword-style" queries like "Stage 3 diet" versus full sentences.
*   **Issue:** If short queries result in generic "I don't know" answers, the vector search might be failing on short embeddings.

### 4. Hallucination Guardrails
*   **Ideal:** When asked a variation that is slightly "off-topic" but related, the bot should stay within the bounds of the provided context.

## 🛠️ Modifying Test Cases
You can add more categories or specific edge cases by editing `scripts/test_cases.json`. This is useful for testing:
*   Misspellings
*   Different languages or dialects
*   Vague vs. specific questions
