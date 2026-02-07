# How to Add Knowledge Resources

This guide explains how to add educational content to the chatbot's knowledge base so it can answer questions accurately.

## 📁 Knowledge Base Location

All your educational materials go in:
```
knowledge_base/
```

## Supported File Types

| Type | Extension | Best For |
|------|-----------|----------|
| Markdown | `.md` | Structured guides, FAQs, articles |
| Plain Text | `.txt` | Simple text content |

## How to Add New Content

### Step 1: Prepare Your Content
Create a `.md` or `.txt` file with your educational content. For example:

**File: `knowledge_base/dialysis_guide.md`**
```markdown
# Dialysis Guide

## What is Dialysis?
Dialysis is a treatment that filters and purifies the blood...

## Types of Dialysis
1. **Hemodialysis**: Blood is filtered through a machine...
2. **Peritoneal Dialysis**: Uses the abdominal lining...

## Preparation for Dialysis
Before starting dialysis, patients should...
```

### Step 2: Place in knowledge_base Folder
Simply save or copy the file to the `knowledge_base/` directory.

### Step 3: Restart the Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

The chatbot will automatically read and index the new content.

## Best Practices for Content

### ✅ DO:
- Use clear headings (## Section, ### Subsection)
- Break content into focused topics
- Include specific facts and numbers
- Use bullet points and lists
- Keep paragraphs short (2-4 sentences)

### ❌ DON'T:
- Put everything in one giant file
- Use vague or ambiguous language
- Include personal opinions without evidence
- Add content outside your expertise area

## Example Directory Structure

```
knowledge_base/
├── ckd_overview.md           # Chronic Kidney Disease basics
├── diet_guidelines.md        # Dietary recommendations
├── dialysis_guide.md         # Dialysis information
├── medications.md            # Common medications
├── prevention_tips.md        # Prevention strategies
└── faq.md                    # Frequently asked questions
```

## How the Strict Mode Works

1. **User asks a question** → "What foods should I avoid?"
2. **System searches** → Looks in all your knowledge_base files
3. **Finds relevant chunks** → "In diet_guidelines.md, section 'Foods to Limit'..."
4. **AI constructs answer** → Uses ONLY the found text
5. **If nothing found** → AI says "I don't have information about that"

## Testing Your Content

After adding new files, test with specific questions:
- ✅ "What is dialysis?" (if you added dialysis_guide.md)
- ✅ "What foods should I avoid?" (if covered in your content)
- ❌ "What is the capital of France?" (will refuse—not in knowledge base)
