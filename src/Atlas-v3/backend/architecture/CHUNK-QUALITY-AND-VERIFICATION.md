# Atlas v2: Chunk Quality, Relevance, Citations, Verification, and Evaluation

This guide explains how to improve PDF chunk quality and how to design the retrieval pipeline so that relevance thresholds, structured citations, citation verification, groundedness verification, and evaluation can be added reliably.

The main principle is to treat every chunk as a **traceable evidence unit**:

```text
chunk ID
  → exact content
  → document
  → page
  → section
  → retrieval score
  → citation
  → verification result
```

If that chain is preserved during ingestion and retrieval, adding relevance thresholds, structured citations, groundedness verification, and an evaluation harness is straightforward. If only anonymous text chunks are stored, citation and verification become much harder later.

---

## 1. What the current chunking does

The current PDF pipeline is:

```text
PDF URL
  → download PDF
  → extract page text
  → create one LangChain Document per page
  → split each page into 1,200-character chunks
  → overlap neighboring chunks by 150 characters
  → embed each chunk
  → store chunks in PostgreSQL
```

The important extraction code is:

```ts
const pageDocuments = pages.map((page) => {
  return new Document({
    pageContent: page.text,
    metadata: {
      pageNumber: page.num,
      source: url,
      documentId,
    },
  });
});
```

This preserves page-level metadata.

The current splitter is:

```ts
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 150,
  separators: ["\n\n", "\n", ".", "?", "!", " ", ""],
});
```

This means:

- Prefer paragraph boundaries: `\n\n`
- Then line boundaries: `\n`
- Then sentence punctuation: `.`, `?`, `!`
- Then spaces
- Finally individual characters

This is better than splitting every exact 1,200 characters, but it is still mostly **character-aware**, not fully **document-structure-aware**.

---

## 2. What “chunk quality” means

A high-quality chunk should satisfy five properties.

### 2.1 It should be understandable by itself

Bad chunk:

```text
This amount may be increased at the discretion of the manager.
```

The reader does not know:

- What amount?
- Which policy?
- Which section?
- What condition applies?

Better chunk:

```text
Document: Travel Policy 2025
Section: Meal Allowance
Page: 12

The daily meal allowance is $75. This amount may be increased at
the discretion of the manager for international travel.
```

### 2.2 It should represent one coherent topic

Bad chunk:

```text
Meal allowance rules...
[unrelated paragraph about hotel bookings]
[unrelated paragraph about approval workflow]
```

A retrieval result containing unrelated topics is less useful to the answer model.

### 2.3 It should preserve important boundaries

You generally want to keep these together:

- Heading and the paragraph immediately below it
- A question and its answer
- A table and its caption
- A list introduction and the list
- A rule and its exceptions
- A procedure step and its conditions
- A figure caption and its explanation

### 2.4 It should be neither too small nor too large

Very small:

```text
The limit is $75.
```

This may lack context.

Very large:

```text
Entire 30-page travel policy
```

This makes retrieval less precise and uses too much context.

### 2.5 It should carry citation metadata

Every chunk must retain enough information to answer:

```text
Where did this statement come from?
```

At minimum:

```ts
{
  chunkId,
  documentId,
  documentName,
  pageNumber,
  chunkIndex,
  section,
  source,
}
```

This is the basis for later citation generation.

---

## 3. The main weakness in the current implementation

The extraction creates one `Document` per page, but the metadata contains only:

```ts
{
  pageNumber,
  source,
  documentId
}
```

The chunking step inherits page metadata, but it does not know:

- The section title
- The heading hierarchy
- The paragraph position
- Whether the text came from a table
- Whether it is part of a list
- Whether the page contains a repeated header/footer

Therefore, a retrieved chunk may have a page number but not enough context to explain what the text means.

For example:

```text
The amount may be increased with approval.
```

Metadata:

```json
{
  "pageNumber": 12,
  "documentId": "abc"
}
```

This allows you to cite page 12, but it does not tell the answer model what “the amount” refers to.

---

## 4. Improve extraction before improving splitting

The best chunking strategy starts before `RecursiveCharacterTextSplitter`.

### Current extraction

Conceptually:

```text
page text → one Document
```

### Stronger extraction pipeline

```text
page text
  → remove repeated headers and footers
  → detect headings
  → detect paragraphs
  → detect lists
  → detect tables
  → attach section context
  → create logical blocks
```

You can think of the intermediate representation as:

```ts
type PdfBlock = {
  type: "heading" | "paragraph" | "list" | "table" | "figure";
  text: string;
  pageNumber: number;
  sectionPath: string[];
  blockIndex: number;
};
```

Example:

```ts
{
  type: "paragraph",
  text: "The daily meal allowance is $75.",
  pageNumber: 12,
  sectionPath: [
    "Travel Policy",
    "Reimbursement",
    "Meal Allowance"
  ],
  blockIndex: 43
}
```

This is much more useful than a plain text string.

---

## 5. Add contextual headers to chunks

The most practical improvement for the current architecture is **contextualized chunk text**.

Suppose the original chunk is:

```text
The daily meal allowance is $75.
```

Instead of embedding only that text, create:

```text
Document: Travel Policy 2025
Section: Reimbursement > Meal Allowance
Page: 12

The daily meal allowance is $75.
```

The embedding then represents not only the sentence, but also what the sentence refers to.

### Keep original content and embedding content separate

For citations, it is useful to distinguish:

```ts
type StoredChunk = {
  content: string;
  embeddingContent: string;
  metadata: {
    documentId: string;
    documentName: string;
    pageNumber: number;
    chunkIndex: number;
    sectionPath: string[];
  };
};
```

#### `content`

The exact source text extracted from the PDF.

Use this for:

- Displaying context to the model
- Exact quote verification
- Citation quotes

#### `embeddingContent`

The contextualized text.

Use this for:

- Creating embeddings
- Improving semantic retrieval

Example:

```ts
const content = "The daily meal allowance is $75.";

const embeddingContent = `
Document: Travel Policy 2025
Section: Reimbursement > Meal Allowance
Page: 12

${content}
`;
```

Do not replace the original source text with a heavily modified summary if reliable citations are required. Preserve the exact text separately.

---

## 6. Suggested metadata design

The database currently has:

```ts
metadata: jsonb("metadata")
```

That is flexible and suitable for citation metadata.

A useful metadata shape is:

```ts
type ChunkMetadata = {
  source: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  sectionPath: string[];
  sectionTitle?: string;
  blockType?: "paragraph" | "list" | "table" | "figure";
  startOffset?: number;
  endOffset?: number;
};
```

Example:

```json
{
  "source": "travel-policy-2025.pdf",
  "documentId": "doc-123",
  "documentName": "Travel Policy 2025",
  "pageNumber": 12,
  "chunkIndex": 8,
  "sectionPath": [
    "Travel Policy",
    "Reimbursement",
    "Meal Allowance"
  ],
  "sectionTitle": "Meal Allowance",
  "blockType": "paragraph"
}
```

### Why `chunkIndex` matters

`chunkIndex` identifies the order of the chunk within the document.

It helps you:

- Debug retrieval
- Reconstruct nearby context
- Display chunks in document order
- Implement parent/child retrieval later
- Track exactly which chunk was cited

### Why `sectionPath` is better than only `sectionTitle`

A document may contain multiple sections called:

```text
Exceptions
```

This is ambiguous.

A full path is clearer:

```ts
[
  "Travel Policy",
  "International Travel",
  "Exceptions",
]
```

---

## 7. Avoid repeated headers and footers

PDF text extraction often repeats:

```text
Company Travel Policy
Page 12
```

on every page.

If you embed that repeated text into every chunk, it can distort retrieval.

A practical strategy is:

1. Collect the first few lines from every page.
2. Count repeated lines.
3. Treat highly repeated lines as headers.
4. Remove them from page content.
5. Do the same for final lines as possible footers.

Conceptually:

```ts
const repeatedLines = findRepeatedLines(allPages);

const cleanedPageText = removeLines(
  page.text,
  repeatedLines,
);
```

Do not remove text solely because it appears more than once. Some repeated legal clauses may be meaningful. Confirm that the line is located consistently at the top or bottom of pages before treating it as a header or footer.

---

## 8. Choose chunk size based on document structure

The current values are:

```ts
chunkSize: 1200
chunkOverlap: 150
```

This is a reasonable starting point, but the ideal size depends on the document.

### Policy documents

Usually contain:

- Headings
- Rules
- Exceptions
- Definitions
- Lists

A useful strategy is to preserve sections and split only oversized sections.

### Technical manuals

Need to keep:

- Procedure titles
- Ordered steps
- Warnings
- Code blocks
- Configuration examples

Splitting at arbitrary punctuation can damage procedures.

### Legal documents

Need to preserve:

- Clause numbers
- Definitions
- Exceptions
- Cross-references
- Conditions

For these documents, section-aware chunking is more important than a fixed character size.

### Tables

Tables should usually remain intact if they fit within the chunk limit.

A table split across chunks can become impossible to interpret:

```text
Chunk 1:
Product | Price | Quantity

Chunk 2:
Keyboard | $50 | 2
```

The second chunk is not meaningful without the table header.

---

## 9. Preserve heading context during recursive splitting

A good process is:

```text
1. Detect section heading.
2. Collect all blocks belonging to that section.
3. Keep the heading as contextual metadata.
4. If the section is small, create one chunk.
5. If too large, recursively split its body.
6. Add the same heading context to each resulting child chunk.
```

Example:

```text
Section: Reimbursement > Meal Allowance

Chunk 1:
The daily meal allowance is $75.

Chunk 2:
International travel may qualify for a higher allowance with approval.

Chunk 3:
Receipts are required for expenses over $25.
```

Each chunk retains:

```text
Section: Reimbursement > Meal Allowance
```

This prevents the context from being lost when the section is split.

---

## 10. Citation-friendly chunk design

To make future citations reliable, decide what a citation points to.

The safest approach is:

```text
Citation → exact chunk → exact quote → page and section
```

Each retrieved result should contain:

```ts
type RetrievalResult = {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    documentName: string;
    pageNumber: number;
    chunkIndex: number;
    sectionPath?: string[];
  };
  score: number;
};
```

The answer model should receive source labels that are stable within one request:

```text
[Source 1]
Chunk ID: chunk-abc
Document: Travel Policy 2025
Page: 12
Section: Reimbursement > Meal Allowance

The daily meal allowance is $75.
```

The model can then return:

```json
{
  "answer": "The daily meal allowance is $75.",
  "citations": [
    {
      "sourceNumber": 1,
      "quote": "The daily meal allowance is $75."
    }
  ]
}
```

The application resolves `sourceNumber: 1` back to the retrieved chunk and verifies the quote.

### Do not let the model invent database IDs

You can provide the chunk ID in the prompt, but the application should ultimately resolve citations against the actual retrieved result list.

The model should not be trusted to invent:

```text
documentId
pageNumber
chunkId
```

Instead:

```text
model returns sourceNumber
application maps sourceNumber to retrieved chunk
application reads document/page metadata from its own data
```

This is safer.

---

## 11. Relevance threshold

The current hybrid search returns ranked results, but ranking alone does not tell you whether a result is genuinely useful.

A threshold answers:

```text
Is this result relevant enough to use as evidence?
```

### Why top-k alone is unsafe

Suppose the query is:

```text
What is the 2025 meal allowance?
```

The system always returns five chunks because of:

```ts
limit: 5
```

But all five might be weak matches.

If you blindly pass them to the model, the model may produce an answer even though the correct information was not found.

### Threshold flow

```text
Retrieve top 30 candidates
  → rerank candidates
  → keep score >= threshold
  → take top 5
```

Conceptually:

```ts
const candidates = await hybridSearch({
  question,
  userId,
  limit: 30,
});

const reranked = await rerank(question, candidates);

const usable = reranked
  .filter((result) => result.relevanceScore >= threshold)
  .slice(0, 5);
```

Then:

```ts
if (usable.length === 0) {
  return {
    answer: "I could not find enough evidence in the uploaded documents.",
    citations: [],
    abstained: true,
  };
}
```

### Important threshold warning

Do not choose a threshold such as `0.7` arbitrarily.

Different scores mean different things:

- Cosine similarity may be in one range.
- RRF scores are usually very small.
- Cross-encoder relevance scores may use another range.
- LLM scores may not be calibrated.

You should calibrate the threshold against evaluation examples.

---

## 12. Structured citations

A structured citation should be data, not merely text like:

```text
[Source 1]
```

### Citation schema

Conceptually:

```ts
const Citation = z.object({
  sourceNumber: z.number().int().positive(),
  quote: z.string().min(1),
  reason: z.string().optional(),
});
```

The complete answer schema could be:

```ts
const StructuredAnswer = z.object({
  answer: z.string(),
  citations: z.array(Citation),
  abstained: z.boolean(),
});
```

For a comparison:

```ts
const ComparisonAnswer = z.object({
  summary: z.string(),
  differences: z.array(
    z.object({
      topic: z.string(),
      firstDocument: z.string(),
      secondDocument: z.string(),
      citations: z.array(Citation),
    }),
  ),
  abstained: z.boolean(),
});
```

### Why the citation should contain a quote

A source number says:

```text
Look at source 1.
```

An exact quote says:

```text
This precise text supports the claim.
```

That makes automatic verification possible.

### What the model should receive

```text
[Source 1]
Document: Travel Policy 2025
Page: 12
Section: Reimbursement > Meal Allowance

The daily meal allowance is $75.
```

### What the model should return

```json
{
  "answer": "The daily meal allowance is $75.",
  "citations": [
    {
      "sourceNumber": 1,
      "quote": "The daily meal allowance is $75."
    }
  ],
  "abstained": false
}
```

### What the application should return to the frontend

The application can enrich the citation:

```json
{
  "answer": "The daily meal allowance is $75.",
  "citations": [
    {
      "sourceNumber": 1,
      "quote": "The daily meal allowance is $75.",
      "documentId": "doc-123",
      "documentName": "Travel Policy 2025",
      "pageNumber": 12,
      "sectionPath": [
        "Travel Policy",
        "Reimbursement",
        "Meal Allowance"
      ],
      "chunkId": "chunk-abc"
    }
  ]
}
```

The model supplies the quote and source reference. Your server supplies trusted metadata from the database.

### Existing citation schema

The current [citation.ts](./backend/utils/citation.ts) already has a good foundation:

```ts
import z from "zod";

const Citation = z.object({
  sourceNumber: z.number().int().positive(),
  chunkId: z.string(),
  quote: z.string().min(1),
  documentId: z.string(),
  documentName: z.string(),
  pageNumber: z.number().int().positive().optional(),
  sectionPath: z.string().optional(),
});

const RAGAnswer = z.object({
  answer: z.string(),
  citations: z.array(Citation),
  abstained: z.boolean(),
});
```

The schema has the right conceptual fields:

- `sourceNumber` maps the model's citation to the current retrieved source list.
- `chunkId` identifies the exact evidence unit.
- `quote` supports exact verification.
- `documentId` and `documentName` identify the source document.
- `pageNumber` supports page-level display.
- `sectionPath` supports section-level display.
- `abstained` communicates that the system could not safely answer.

For consistency with the metadata design above, `sectionPath` may be more useful as an array:

```ts
sectionPath: z.array(z.string()).optional()
```

If you keep it as a string, serialize it consistently, for example:

```text
Travel Policy > Reimbursement > Meal Allowance
```

Also export the schemas or their inferred types if other modules need to use them:

```ts
export const Citation = z.object({
  sourceNumber: z.number().int().positive(),
  chunkId: z.string(),
  quote: z.string().min(1),
  documentId: z.string(),
  documentName: z.string(),
  pageNumber: z.number().int().positive().optional(),
  sectionPath: z.array(z.string()).optional(),
});

export const RAGAnswer = z.object({
  answer: z.string(),
  citations: z.array(Citation),
  abstained: z.boolean(),
});

export type Citation = z.infer<typeof Citation>;
export type RAGAnswer = z.infer<typeof RAGAnswer>;
```

If a schema and an inferred type have the same name in one file, use a different naming convention, such as `CitationSchema` and `Citation`.

---

## 13. Citation verification

Citation verification checks whether the answer's citations are valid.

### Step 1: Validate the source number

```ts
const source = retrievedChunks[citation.sourceNumber - 1];

if (!source) {
  // Invalid source reference
}
```

### Step 2: Validate the quote

The simplest check is:

```ts
const quoteIsPresent = source.content.includes(citation.quote);
```

If the quote exists exactly, it is likely valid.

### Step 3: Normalize whitespace

PDF extraction often produces inconsistent whitespace:

```text
"The daily meal allowance is $75."
```

versus:

```text
"The daily meal allowance is\n$75."
```

Use normalized comparison:

```ts
function normalizeText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
```

Then:

```ts
const quoteIsPresent = normalizeText(source.content).includes(
  normalizeText(citation.quote),
);
```

### Step 4: Reject invalid citations

```ts
const validCitations = citations.filter((citation) => {
  const source = retrievedChunks[citation.sourceNumber - 1];

  return (
    source !== undefined &&
    normalizeText(source.content).includes(
      normalizeText(citation.quote),
    )
  );
});
```

If the answer contains important claims but no valid citations remain, do not return it as fully verified.

### Important limitation

Substring matching verifies that the quote exists. It does not prove that the quote actually supports the entire answer.

That is why groundedness verification is also needed.

---

## 14. Groundedness verification

Groundedness asks:

```text
Are the answer's claims supported by the retrieved context?
```

This is broader than checking whether citation quotes exist.

Example:

```text
Answer:
The meal allowance is $75, and employees can claim it without receipts.
```

The retrieved context may support:

```text
The meal allowance is $75.
```

but say nothing about receipts.

The answer is only partially grounded.

### Structured verification result

```ts
const GroundednessResult = z.object({
  grounded: z.boolean(),
  unsupportedClaims: z.array(z.string()),
  explanation: z.string(),
});
```

The verifier receives:

```text
Question:
What is the meal allowance and are receipts required?

Answer:
The meal allowance is $75, and employees can claim it without receipts.

Context:
The daily meal allowance is $75.
```

Possible result:

```json
{
  "grounded": false,
  "unsupportedClaims": [
    "Employees can claim the allowance without receipts."
  ],
  "explanation": "The allowance amount is supported, but the receipt requirement is not present."
}
```

### What to do when groundedness fails

You have several choices.

#### Option A: Abstain

```text
I found the meal allowance amount, but I could not verify the receipt requirement.
```

#### Option B: Regenerate with stricter instructions

Ask the answer model to remove unsupported claims.

#### Option C: Return a partial answer

```text
The daily meal allowance is $75. The provided documents do not specify whether receipts are required.
```

For a trustworthy RAG system, partial answers are usually better than invented complete answers.

---

## 15. Evaluation harness

An evaluation harness answers:

```text
Did this retrieval or generation change improve the system?
```

Without evaluation, you cannot know whether:

- Larger chunks improved retrieval
- Contextual headers helped
- Full-text search helped
- Reranking helped
- A threshold reduced hallucinations
- Citations became more valid
- Latency became too high

The system should not add many techniques without measuring them.

### Evaluation case format

Create test cases such as:

```json
{
  "id": "travel-001",
  "question": "What is the 2025 daily meal allowance?",
  "expectedAnswer": "The daily meal allowance is $75.",
  "expectedChunkIds": ["chunk-abc"],
  "expectedDocuments": ["travel-policy-2025.pdf"]
}
```

For a comparison:

```json
{
  "id": "travel-002",
  "question": "What changed between the 2024 and 2025 meal allowances?",
  "expectedAnswer": "The allowance increased from $60 to $75.",
  "expectedChunkIds": [
    "chunk-2024-meals",
    "chunk-2025-meals"
  ],
  "expectedDocuments": [
    "travel-policy-2024.pdf",
    "travel-policy-2025.pdf"
  ]
}
```

For a not-found case:

```json
{
  "id": "travel-003",
  "question": "What is the company car replacement schedule?",
  "expectedAnswer": null,
  "shouldAbstain": true,
  "expectedChunkIds": []
}
```

### Retrieval metrics

#### Hit rate

Did at least one expected chunk appear?

```text
hit@5 = 1 if any expected chunk appears in top 5
```

#### Recall@k

How many expected chunks appeared in the first `k` results?

```text
recall@5 =
retrieved expected chunks / total expected chunks
```

#### Mean Reciprocal Rank

How early was the first relevant chunk?

```text
MRR = 1 / rank of first relevant result
```

If the first relevant chunk appears at rank 2:

```text
MRR = 1 / 2 = 0.5
```

### Citation metrics

#### Citation validity

```text
valid citations / total citations
```

A citation is valid if:

- Its source number refers to a retrieved chunk.
- Its quote appears in that chunk.
- The chunk metadata points to a real document/page.

#### Citation coverage

```text
supported important claims / total important claims
```

#### Groundedness rate

```text
grounded answers / evaluated answers
```

### Abstention metrics

For questions where evidence is missing:

```text
correct abstentions / total unanswerable questions
```

A system that always answers may appear helpful but be unreliable.

### Performance metrics

Track:

```text
total latency
retrieval latency
reranking latency
generation latency
verification latency
```

Also track:

```text
p50 latency
p95 latency
```

The p95 value is important because it shows how slow the slowest normal requests are.

---

## 16. Evaluation must use the production path

The evaluation harness should call the same functions as the API:

```text
eval case
  → same retrieval function used by chat
  → same answer function used by chat
  → metrics
  → dated JSON result
```

Do not create a simplified evaluator that bypasses the actual retrieval logic.

Otherwise, you might measure:

```text
evaluation pipeline: good
production pipeline: poor
```

The evaluation architecture should look like:

```text
Evaluation case
  → same query analysis used by chat
  → same hybrid search used by chat
  → same reranking used by chat
  → same answer generation used by chat
  → same citation verification used by chat
  → metrics
```

The evaluation runner should share code with the API so that improvements measured in evaluation are the improvements users receive.

---

## 17. Suggested end-to-end data flow

### Ingestion

```text
PDF
 ↓
Extract pages and blocks
 ↓
Detect headings, paragraphs, lists, tables
 ↓
Create contextual sections
 ↓
Split oversized sections
 ↓
Create exact source content + embedding content
 ↓
Attach stable metadata
 ↓
Generate embeddings
 ↓
Store chunks
```

### Question answering

```text
Question + history
 ↓
Query rewrite and filter extraction
 ↓
Vector search + full-text search
 ↓
RRF fusion
 ↓
Reranking
 ↓
Relevance threshold
 ↓
No evidence? Abstain
 ↓
Generate structured answer and quote citations
 ↓
Verify quote presence
 ↓
Verify groundedness
 ↓
Return answer with trusted source metadata
```

---

## 18. How the current files map to this design

### `processPdf.ts`

Currently responsible for:

```text
download PDF
extract page text
attach page metadata
```

Future responsibility:

```text
preserve page/block structure
detect or retain section information
remove repeated headers/footers
```

### `chunks.ts`

Currently responsible for:

```text
generic recursive splitting
```

Future responsibility:

```text
split logical sections
preserve headings
preserve tables/lists
add contextual headers
maintain chunk metadata
```

### Database schema

The database already provides:

```text
document ID
chunk ID
chunk index
metadata JSON
embedding vector
full-text vector column
```

This is a strong basis for citations.

### `search.ts`

Currently provides:

```text
vector search
full-text search
RRF fusion
```

Future additions:

```text
score calibration
thresholding
reranking
stable retrieval result shape
```

### Chat controller

Future responsibilities:

```text
query analysis
retrieval
evidence decision
structured generation
citation verification
groundedness verification
response formatting
```

Keep these responsibilities in separate functions rather than putting all logic in one controller.

---

## 19. Recommended implementation sequence

Use this order.

### Step 1: Improve metadata first

Before adding citations, ensure every chunk has:

```text
chunk ID
document ID
document name
page number
chunk index
section path
exact source content
```

### Step 2: Improve chunk context

Add heading and document context to the text used for embedding.

Keep the original extracted text unchanged for citations.

### Step 3: Stabilize search result shape

Both vector and full-text results should return:

```ts
{
  id,
  documentId,
  documentName,
  content,
  metadata,
}
```

Then add:

```ts
similarity
rankScore
rrfScore
```

as optional ranking information.

### Step 4: Add a threshold after reranking

Do not threshold RRF scores unless they are calibrated. Prefer thresholding a reranker score or a calibrated relevance score.

### Step 5: Add structured citations

Return:

```ts
{
  answer,
  citations,
  abstained
}
```

Do not parse citations from arbitrary text if structured output is available.

### Step 6: Verify citations

Check:

```text
source number exists
quote exists in exact source content
metadata belongs to the retrieved chunk
```

### Step 7: Verify groundedness

Check whether all important claims are supported, not only whether one quote exists.

### Step 8: Add evaluation cases

Measure retrieval and generation separately.

Only then tune:

```text
chunk size
overlap
threshold
top-k
reranker
prompt
```

---

## 20. Final principle

The most important design decision is to treat every chunk as a **traceable evidence unit**:

```text
chunk ID
  → exact content
  → document
  → page
  → section
  → retrieval score
  → citation
  → verification result
```

The result should be a pipeline that can answer not only:

```text
What answer did the model produce?
```

but also:

```text
Which exact chunk supported it?
Which document and page contained that chunk?
Was the quote actually present?
Was every important claim grounded?
Did retrieval find the expected evidence?
Did the improvement make the system better?
```

---

## 21. Do you need to build a PDF parser from scratch?

No. You do **not** need to build a complete PDF parser from scratch.

The current parser:

```ts
import { PDFParse } from "pdf-parse";
```

is suitable for basic text extraction, but it mainly provides text and page boundaries. It does not reliably understand:

- Headings
- Tables
- Columns
- Figures
- Semantic sections
- Complex reading order
- Repeated headers and footers

The recommended architecture is:

```text
PDF
 ↓
PDF/document parser
 ↓
Structured elements:
  headings
  paragraphs
  tables
  lists
  pages
  figures
 ↓
Convert elements to LangChain Documents
 ↓
Add metadata/contextual headers
 ↓
Split only oversized sections
 ↓
Embed and store
```

LangChain is mainly a framework for:

```text
document loading
document splitting
embeddings
retrieval
model calls
RAG orchestration
```

It is not always the best tool for deeply understanding complex PDF layout. In practice, combine:

```text
specialized parser
+
LangChain documents and splitters
+
your metadata model
+
your verification logic
```

---

## 22. Parser options

### 22.1 LangChain PDF loaders

For simple, text-based PDFs, a LangChain PDF loader can be enough:

```ts
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const loader = new PDFLoader("./document.pdf", {
  splitPages: true,
});

const documents = await loader.load();
```

The result is usually similar to:

```ts
[
  {
    pageContent: "Text from page 1...",
    metadata: {
      loc: {
        pageNumber: 1,
      },
      source: "./document.pdf",
    },
  },
  {
    pageContent: "Text from page 2...",
    metadata: {
      loc: {
        pageNumber: 2,
      },
      source: "./document.pdf",
    },
  },
]
```

Then:

```ts
const chunks = await splitter.splitDocuments(documents);
```

Use a basic LangChain loader when:

- The PDF contains selectable text.
- The document has simple paragraphs.
- Tables are not central.
- Reading order is straightforward.
- Page-level citations are sufficient.

A basic loader may not reliably preserve:

- Heading hierarchy
- Multi-column reading order
- Tables
- Figure captions
- Lists
- Footnotes
- Complex layout

It is convenient, but it does not automatically provide complete structure-aware chunking.

### 22.2 Continue using `pdf-parse`

The current [processPdf.ts](./backend/lib/processPdf.ts) approach is valid for a baseline:

```ts
const result = await parser.getText();
const pages = result.pages;

const pageDocuments = pages.map((page) => {
  return new Document({
    pageContent: page.text,
    metadata: {
      pageNumber: page.num,
      source: url,
      documentId,
    },
  });
});
```

You can improve this without replacing the parser by:

1. Preserving page metadata.
2. Removing repeated headers and footers.
3. Detecting heading-like lines.
4. Grouping text under headings.
5. Adding section metadata.
6. Splitting only oversized sections.

This is a reasonable approach for learning and relatively simple PDFs. However, manually detecting every table, column, figure, and layout edge case becomes difficult. At that point, use a layout-aware parser.

### 22.3 Unstructured

Unstructured is designed to partition documents into semantic elements such as:

```text
Title
NarrativeText
ListItem
Table
Header
Footer
Image
```

Conceptually, its output looks like:

```json
[
  {
    "type": "Title",
    "text": "Travel Policy 2025",
    "metadata": {
      "page_number": 1
    }
  },
  {
    "type": "Title",
    "text": "Meal Allowance",
    "metadata": {
      "page_number": 12
    }
  },
  {
    "type": "NarrativeText",
    "text": "The daily meal allowance is $75.",
    "metadata": {
      "page_number": 12
    }
  },
  {
    "type": "Table",
    "text": "Expense | Limit\nMeals | $75",
    "metadata": {
      "page_number": 12
    }
  }
]
```

Then build section-aware grouping:

```ts
type ParsedElement = {
  type: string;
  text: string;
  metadata: {
    page_number?: number;
  };
};

type Section = {
  heading: string;
  elements: ParsedElement[];
  pageNumber?: number;
};
```

Unstructured is useful when:

- Tables and lists matter.
- You want a general document ingestion system.
- You may support DOCX, HTML, PPTX, and other formats.
- You want semantic element types instead of writing all detection logic yourself.

Tradeoffs:

- It may require a separate Python service or API.
- Local processing can require additional system dependencies.
- Complex documents may need tuning.
- You must still design section grouping and metadata.

It is not a magic perfect-chunking button. It provides better structural building blocks.

### 22.4 LlamaParse

LlamaParse is a hosted parser designed for difficult documents. It can be useful for:

- Complex PDFs
- Tables
- Multi-column layouts
- Technical documents
- Scanned or visually complicated documents
- Markdown-oriented extraction

The conceptual workflow is:

```text
PDF
 ↓
LlamaParse
 ↓
Markdown or structured output
 ↓
LangChain splitter
 ↓
Embeddings
```

If it returns Markdown, use:

```ts
const splitter =
  RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: 1200,
    chunkOverlap: 150,
  });
```

If the parser produces:

```md
# Travel Policy 2025

## Reimbursement

### Meal Allowance

The daily meal allowance is $75.
```

then Markdown-aware splitting can prefer:

```text
heading → subsection → paragraph
```

LlamaParse handles the difficult PDF-to-structured-text stage. LangChain handles:

```text
structured text → chunks → embeddings → retrieval
```

You still need to preserve:

- Page number
- Section title
- Original content
- Document ID
- Chunk index

for citations.

### 22.5 Docling

Docling is an open-source document conversion toolkit focused on document structure and layout. It can provide:

- Page structure
- Tables
- Reading order
- Headings
- Lists
- Markdown/JSON conversion
- Document layout information

A common architecture is:

```text
Node.js API
  → Python Docling service
  → structured JSON or Markdown
  → Node.js chunking/indexing
```

Conceptually:

```json
{
  "pages": [
    {
      "pageNumber": 12,
      "blocks": [
        {
          "type": "heading",
          "text": "Meal Allowance"
        },
        {
          "type": "paragraph",
          "text": "The daily meal allowance is $75."
        },
        {
          "type": "table",
          "text": "| Expense | Limit |\n| Meals | $75 |"
        }
      ]
    }
  ]
}
```

Docling is a strong choice when local processing is preferred and layout matters, but it usually means operating a Python component.

### 22.6 PyMuPDF or pdfplumber

For lower-level local control, Python libraries such as PyMuPDF and pdfplumber can expose:

- Words
- Lines
- Coordinates
- Bounding boxes
- Page layout
- Text blocks

This allows custom detection of:

- Text blocks
- Lines
- Bounding boxes
- Columns
- Tables
- Header/footer positions

However, these are lower-level tools. You may need rules such as:

```text
same horizontal region → same line
similar font size → possible heading
top page region → possible header
bottom page region → possible footer
aligned columns → possible table
```

Use them when:

- You need custom layout behavior.
- You have a known document format.
- You want full local control.
- You are comfortable maintaining parsing rules.

For a general-purpose application, start with Unstructured, Docling, or a hosted parser before writing layout algorithms yourself.

### 22.7 Cloud document intelligence services

For enterprise PDFs, scanned documents, and tables, cloud services can be useful:

- Azure AI Document Intelligence
- AWS Textract
- Google Document AI

These services can detect:

- OCR text
- Tables
- Forms
- Layout
- Key-value fields
- Page numbers
- Bounding regions

Convert their output to the internal block format:

```ts
type PdfBlock = {
  type: "heading" | "paragraph" | "table" | "list" | "figure";
  text: string;
  pageNumber: number;
  sectionPath: string[];
  blockIndex: number;
};
```

---

## 23. Parser selection guide

| PDF type | Recommended approach |
|---|---|
| Simple selectable text | `pdf-parse` or LangChain PDF loader |
| Text with clear headings | PDF loader + heading-aware grouping |
| Tables are important | Unstructured, Docling, or cloud document service |
| Multi-column technical PDF | Docling, LlamaParse, or layout-aware parser |
| Scanned PDF | OCR-capable service such as Document AI, Textract, or Azure Document Intelligence |
| Highly private documents | Docling/PyMuPDF locally |
| Many file formats | Unstructured |
| Fast prototype | LlamaParse or a LangChain loader |
| Full custom control | PyMuPDF/pdfplumber plus custom block logic |

---

## 24. Create an internal parser-neutral format

Do not make the entire application depend directly on `pdf-parse` output. Convert every parser's output into an internal format:

```ts
type ParsedDocumentBlock = {
  id: string;
  type: "heading" | "paragraph" | "list" | "table" | "figure";
  text: string;
  pageNumber: number;
  sectionPath: string[];
  blockIndex: number;
  source: string;
  documentId: string;
};
```

The application pipeline then becomes:

```text
pdf-parse / Unstructured / Docling / LlamaParse
  ↓
ParsedDocumentBlock[]
  ↓
section grouping
  ↓
chunking
  ↓
stored chunks
```

This lets you change parsers without rewriting the rest of the system.

---

## 25. Convert blocks into citation-ready chunks

Given blocks:

```ts
const blocks: ParsedDocumentBlock[] = [
  {
    id: "block-1",
    type: "heading",
    text: "Meal Allowance",
    pageNumber: 12,
    sectionPath: ["Travel Policy", "Reimbursement"],
    blockIndex: 10,
    source: "travel-policy-2025.pdf",
    documentId: "doc-123",
  },
  {
    id: "block-2",
    type: "paragraph",
    text: "The daily meal allowance is $75.",
    pageNumber: 12,
    sectionPath: [
      "Travel Policy",
      "Reimbursement",
      "Meal Allowance",
    ],
    blockIndex: 11,
    source: "travel-policy-2025.pdf",
    documentId: "doc-123",
  },
];
```

Create:

```ts
const content = "The daily meal allowance is $75.";

const embeddingContent = `
Document: Travel Policy 2025
Section: Travel Policy > Reimbursement > Meal Allowance
Page: 12

${content}
`;

const metadata = {
  source: "travel-policy-2025.pdf",
  documentId: "doc-123",
  pageNumber: 12,
  chunkIndex: 0,
  sectionPath: [
    "Travel Policy",
    "Reimbursement",
    "Meal Allowance",
  ],
  blockType: "paragraph",
};
```

Store:

```ts
{
  content,
  embeddingContent,
  metadata,
}
```

The crucial rule is:

```text
Embed enriched content.
Cite exact original content.
```

---

## 26. How the citation flow works with any parser

The parser does not generate the final citation. It supplies metadata and exact text.

### Ingestion

```text
PDF parser
  → exact text + page + section + element type
  → chunk
  → store metadata
  → generate embedding
```

### Retrieval

```text
retrieved chunk
  → source number assigned for this request
  → context shown to model
```

Example context:

```text
[Source 1]
Chunk ID: chunk-abc
Document: Travel Policy 2025
Page: 12
Section: Reimbursement > Meal Allowance

The daily meal allowance is $75.
```

### Generation

The model returns:

```json
{
  "answer": "The daily meal allowance is $75.",
  "citations": [
    {
      "sourceNumber": 1,
      "quote": "The daily meal allowance is $75."
    }
  ],
  "abstained": false
}
```

### Application verification

The application maps source 1 to the actual retrieved chunk:

```ts
const source = retrievedChunks[citation.sourceNumber - 1];
```

Then verifies:

```ts
normalizeText(source.content).includes(
  normalizeText(citation.quote),
);
```

The parser choice does not change this citation process as long as the internal chunk shape remains consistent.

---

## 27. What LangChain can and cannot do

### LangChain can help with

- PDF loader integration
- Document objects
- Recursive splitting
- Markdown/code-aware splitting
- Embeddings
- Retrievers
- Model calls
- Structured output
- RAG orchestration

### LangChain does not automatically solve

- Perfect PDF layout understanding
- Reliable table extraction for every PDF
- Heading hierarchy for arbitrary documents
- Multi-column reading order
- OCR quality
- Repeated header/footer detection
- Citation verification
- Groundedness verification
- Correct chunk-size thresholds for your dataset

---

## 28. Recommended path for Atlas v2

Do not build a complete parser from scratch immediately.

### Stage 1: Keep `pdf-parse`

```text
pdf-parse
  → page Documents
  → generic chunks
  → page-level citations
```

### Stage 2: Add context yourself

```text
pdf-parse
  → clean headers/footers
  → detect simple headings
  → contextual headers
  → section/page metadata
  → better chunks
```

### Stage 3: Replace only the extraction layer if needed

```text
layout-aware parser
  → headings, paragraphs, tables, lists, figures
  → normalized internal block format
  → section-aware chunks
  → reliable citations
```

### Stage 4: Evaluate parser and chunking strategies

```text
evaluation
  → compare parser/chunking strategies
  → measure hit@k, recall@k, MRR
  → measure citation validity and groundedness
  → keep changes that improve results
```

The parser should be replaceable. The stable contract should be:

```ts
type ParsedDocumentBlock = {
  type: "heading" | "paragraph" | "list" | "table" | "figure";
  text: string;
  pageNumber: number;
  sectionPath: string[];
  blockIndex: number;
  source: string;
  documentId: string;
};
```

Once every parser is converted to that shape, the rest of the RAG system does not need to know whether the source was:

```text
pdf-parse
LangChain PDFLoader
Unstructured
Docling
LlamaParse
Azure Document Intelligence
AWS Textract
```

The recommended path is:

1. Start with the current `pdf-parse` implementation.
2. Add metadata and contextual headers.
3. Build citation, threshold, verification, and evaluation logic.
4. Replace only the extraction layer when evaluation shows that simple extraction is insufficient.
