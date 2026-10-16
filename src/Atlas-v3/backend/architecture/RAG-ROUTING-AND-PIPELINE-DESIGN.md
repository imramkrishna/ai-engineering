# Atlas v2: Adaptive RAG Routing and Pipeline Design

This guide explains how to support vector search, full-text search, hybrid search, metadata filters, query rewriting, decomposition, reranking, relevance thresholds, structured citations, citation verification, groundedness verification, and abstention without creating one huge `if/else` block.

The main principle is:

```text
Use the simplest pipeline that reliably answers the question.
```

The flow should be:

```text
Question
  ↓
Analyze query once
  ↓
Create a retrieval and answer plan
  ↓
Execute the selected stages
  ↓
Generate the answer
  ↓
Verify the answer when required
```

---

## 1. Why a huge `if/else` chain is a problem

Avoid putting all feature decisions directly in the controller:

```ts
if (isSimple(query)) {
  // vector search
} else if (isExact(query)) {
  // full-text search
} else if (isComparison(query)) {
  // hybrid search + decomposition + reranking
} else if (isHighRisk(query)) {
  // hybrid + reranking + groundedness
} else if (...) {
  // another combination
}
```

This causes several problems:

- Conditions become difficult to understand.
- Features get duplicated.
- Adding one new route affects many branches.
- Testing every combination becomes difficult.
- The controller becomes responsible for too many details.

Use a **query plan** or **pipeline configuration** instead.

The controller should decide:

```text
Which plan should run?
Which stages should be included?
```

It should not implement:

```text
vector search SQL
RRF logic
reranking logic
citation verification
groundedness prompts
```

---

## 2. Analyze the query once

First, analyze the question and produce structured data:

```ts
const QueryAnalysis = z.object({
  standaloneQuery: z.string(),
  intent: z.enum([
    "factual",
    "exact_lookup",
    "comparison",
    "summary",
    "procedure",
    "calculation",
    "casual",
  ]),
  complexity: z.enum(["simple", "moderate", "complex"]),
  requiresExactMatch: z.boolean(),
  requiresFilters: z.boolean(),
  requiresDecomposition: z.boolean(),
  highRisk: z.boolean(),
  filters: z.object({
    years: z.array(z.number()),
    documentNames: z.array(z.string()),
    sections: z.array(z.string()),
  }),
});
```

Example result:

```json
{
  "standaloneQuery": "Compare the 2024 and 2025 travel policies.",
  "intent": "comparison",
  "complexity": "complex",
  "requiresExactMatch": false,
  "requiresFilters": true,
  "requiresDecomposition": true,
  "highRisk": false,
  "filters": {
    "years": [2024, 2025],
    "documentNames": [],
    "sections": []
  }
}
```

This separates:

```text
What is the question?
```

from:

```text
How should the system process it?
```

---

## 3. Query plan

Create a plan that represents the selected capabilities:

```ts
type QueryPlan = {
  useHistoryRewrite: boolean;
  useVectorSearch: boolean;
  useFullTextSearch: boolean;
  useHybridSearch: boolean;
  useMetadataFilters: boolean;
  useDecomposition: boolean;
  useReranking: boolean;
  useRelevanceThreshold: boolean;
  useStructuredCitations: boolean;
  useCitationVerification: boolean;
  useGroundednessCheck: boolean;
  candidateLimit: number;
  finalLimit: number;
};
```

Build the plan from the query analysis:

```ts
function createQueryPlan(analysis: QueryAnalysis): QueryPlan {
  const isCasual = analysis.intent === "casual";
  const isComplex = analysis.complexity === "complex";
  const requiresExact = analysis.requiresExactMatch;
  const requiresFilters =
    analysis.requiresFilters &&
    (
      analysis.filters.years.length > 0 ||
      analysis.filters.documentNames.length > 0 ||
      analysis.filters.sections.length > 0
    );

  if (isCasual) {
    return {
      useHistoryRewrite: false,
      useVectorSearch: false,
      useFullTextSearch: false,
      useHybridSearch: false,
      useMetadataFilters: false,
      useDecomposition: false,
      useReranking: false,
      useRelevanceThreshold: false,
      useStructuredCitations: false,
      useCitationVerification: false,
      useGroundednessCheck: false,
      candidateLimit: 0,
      finalLimit: 0,
    };
  }

  if (requiresExact && !isComplex) {
    return {
      useHistoryRewrite: false,
      useVectorSearch: false,
      useFullTextSearch: true,
      useHybridSearch: false,
      useMetadataFilters: requiresFilters,
      useDecomposition: false,
      useReranking: false,
      useRelevanceThreshold: true,
      useStructuredCitations: true,
      useCitationVerification: true,
      useGroundednessCheck: false,
      candidateLimit: 20,
      finalLimit: 5,
    };
  }

  if (isComplex) {
    return {
      useHistoryRewrite: true,
      useVectorSearch: true,
      useFullTextSearch: true,
      useHybridSearch: true,
      useMetadataFilters: requiresFilters,
      useDecomposition: analysis.requiresDecomposition,
      useReranking: true,
      useRelevanceThreshold: true,
      useStructuredCitations: true,
      useCitationVerification: true,
      useGroundednessCheck: analysis.highRisk || true,
      candidateLimit: 30,
      finalLimit: 5,
    };
  }

  return {
    useHistoryRewrite: analysis.complexity !== "simple",
    useVectorSearch: true,
    useFullTextSearch: requiresExact,
    useHybridSearch: requiresExact,
    useMetadataFilters: requiresFilters,
    useDecomposition: false,
    useReranking: false,
    useRelevanceThreshold: true,
    useStructuredCitations: true,
    useCitationVerification: true,
    useGroundednessCheck: analysis.highRisk,
    candidateLimit: 10,
    finalLimit: 5,
  };
}
```

This still has conditionals, but the complexity is isolated to one planning function instead of being spread throughout the controller.

### Note about `analysis.highRisk || true`

This expression always evaluates to `true`:

```ts
analysis.highRisk || true
```

It is equivalent to:

```ts
true
```

If groundedness checking should run for every complex query, use:

```ts
useGroundednessCheck: true,
```

If it should run only for high-risk complex queries, use:

```ts
useGroundednessCheck: analysis.highRisk,
```

Do not leave `analysis.highRisk || true` in production code because it hides the intended routing decision.

---

## 4. Named route profiles

Instead of constructing every boolean manually for every query, define named profiles:

```ts
type RetrievalProfile = {
  name: string;
  searchMode: "vector" | "fulltext" | "hybrid";
  rewrite: boolean;
  decompose: boolean;
  rerank: boolean;
  threshold: boolean;
  verifyGroundedness: boolean;
  candidateLimit: number;
  finalLimit: number;
};
```

Define route profiles:

```ts
const profiles: Record<string, RetrievalProfile> = {
  simple: {
    name: "simple",
    searchMode: "vector",
    rewrite: false,
    decompose: false,
    rerank: false,
    threshold: true,
    verifyGroundedness: false,
    candidateLimit: 10,
    finalLimit: 5,
  },

  exact: {
    name: "exact",
    searchMode: "fulltext",
    rewrite: false,
    decompose: false,
    rerank: false,
    threshold: true,
    verifyGroundedness: false,
    candidateLimit: 20,
    finalLimit: 5,
  },

  complex: {
    name: "complex",
    searchMode: "hybrid",
    rewrite: true,
    decompose: true,
    rerank: true,
    threshold: true,
    verifyGroundedness: true,
    candidateLimit: 30,
    finalLimit: 5,
  },

  highRisk: {
    name: "highRisk",
    searchMode: "hybrid",
    rewrite: true,
    decompose: false,
    rerank: true,
    threshold: true,
    verifyGroundedness: true,
    candidateLimit: 30,
    finalLimit: 5,
  },
};
```

Select one profile:

```ts
function selectProfile(analysis: QueryAnalysis): RetrievalProfile {
  if (analysis.intent === "casual") {
    throw new Error("Casual questions do not require document retrieval");
  }

  if (analysis.highRisk) {
    return profiles.highRisk;
  }

  if (analysis.complexity === "complex") {
    return profiles.complex;
  }

  if (analysis.requiresExactMatch) {
    return profiles.exact;
  }

  return profiles.simple;
}
```

The rest of the system uses:

```ts
const profile = selectProfile(analysis);
```

rather than repeatedly checking query conditions.

---

## 5. Execute features through composable stages

Create small functions for each pipeline responsibility.

### Retrieval by profile

```ts
async function retrieveWithProfile(
  query: string,
  userId: string,
  profile: RetrievalProfile,
) {
  switch (profile.searchMode) {
    case "vector":
      return vectorSearch({
        question: query,
        userId,
        limit: profile.candidateLimit,
      });

    case "fulltext":
      return fullTextSearch({
        question: query,
        userId,
        limit: profile.candidateLimit,
      });

    case "hybrid":
      return hybridSearch({
        question: query,
        userId,
        limit: profile.candidateLimit,
      });
  }
}
```

### Retrieval pipeline

```ts
async function runRetrievalPipeline(params: {
  query: string;
  userId: string;
  profile: RetrievalProfile;
}) {
  const { query, userId, profile } = params;

  let results = await retrieveWithProfile(
    query,
    userId,
    profile,
  );

  if (profile.rerank) {
    results = await rerank(query, results);
  }

  if (profile.threshold) {
    results = applyRelevanceThreshold(results);
  }

  return results.slice(0, profile.finalLimit);
}
```

This still contains conditionals, but each condition represents a pipeline stage:

```text
retrieve
  → optionally rerank
  → optionally threshold
  → limit
```

The behavior remains readable because each stage is independent.

---

## 6. Pipeline middleware pattern

For more composability, represent stages as functions:

```ts
type PipelineContext = {
  query: string;
  userId: string;
  results: SearchResult[];
};

type PipelineStage = (
  context: PipelineContext,
) => Promise<PipelineContext>;
```

Reranking stage:

```ts
const rerankStage: PipelineStage = async (context) => {
  const results = await rerank(
    context.query,
    context.results,
  );

  return {
    ...context,
    results,
  };
};
```

Threshold stage:

```ts
const thresholdStage: PipelineStage = async (context) => {
  return {
    ...context,
    results: context.results.filter(
      (result) => result.relevanceScore >= 0.65,
    ),
  };
};
```

Run selected stages:

```ts
async function runPipeline(
  initialContext: PipelineContext,
  stages: PipelineStage[],
) {
  let context = initialContext;

  for (const stage of stages) {
    context = await stage(context);
  }

  return context;
}
```

Build the pipeline from the profile:

```ts
const stages: PipelineStage[] = [
  retrieveStage,
];

if (profile.rerank) {
  stages.push(rerankStage);
}

if (profile.threshold) {
  stages.push(thresholdStage);
}

const result = await runPipeline(initialContext, stages);
```

The controller does not need to know how reranking or thresholding works.

---

## 7. Feature flags

Some features should be controlled by configuration while they are being evaluated:

```ts
const ragFeatures = {
  hybridSearch: true,
  reranking: false,
  queryRewrite: true,
  decomposition: false,
  structuredCitations: true,
  citationVerification: true,
  groundednessCheck: false,
};
```

Combine feature flags with query analysis:

```ts
const useReranking =
  ragFeatures.reranking &&
  analysis.complexity !== "simple";
```

This lets you run experiments:

```text
Version A: vector search
Version B: hybrid search
Version C: hybrid + reranking
```

Compare:

```text
hit@5
MRR
groundedness
citation validity
p95 latency
cost
```

Do not permanently enable a feature just because it sounds useful.

---

## 8. Separate query routing from answer routing

There are two different decisions.

### Retrieval routing

```text
How should I find evidence?
```

Possible retrieval features:

```text
vector
full-text
hybrid
decomposition
metadata filters
reranking
```

### Answer routing

```text
How should I format and verify the answer?
```

Possible answer features:

```text
plain response
factual answer
comparison answer
structured citations
quote verification
groundedness verification
abstention
```

Keep these separate:

```ts
type QueryPlan = {
  retrieval: RetrievalPlan;
  answer: AnswerPlan;
};
```

Example:

```ts
type RetrievalPlan = {
  searchMode: "vector" | "fulltext" | "hybrid";
  useFilters: boolean;
  useDecomposition: boolean;
  useReranking: boolean;
  candidateLimit: number;
};

type AnswerPlan = {
  answerType: "factual" | "comparison" | "list";
  useCitations: boolean;
  verifyQuotes: boolean;
  verifyGroundedness: boolean;
  allowAbstention: boolean;
};
```

This avoids coupling:

```text
comparison question always requires every retrieval feature
```

A comparison might use vector search only in a small corpus, while a simple high-risk policy question might use hybrid search and groundedness verification.

---

## 9. Strategy objects

Define a retrieval strategy interface:

```ts
interface RetrievalStrategy {
  search(params: {
    query: string;
    userId: string;
    limit: number;
  }): Promise<SearchResult[]>;
}
```

Vector strategy:

```ts
const vectorStrategy: RetrievalStrategy = {
  search: ({ query, userId, limit }) =>
    vectorSearch({
      question: query,
      userId,
      limit,
    }),
};
```

Full-text strategy:

```ts
const fullTextStrategy: RetrievalStrategy = {
  search: ({ query, userId, limit }) =>
    fullTextSearch({
      question: query,
      userId,
      limit,
    }),
};
```

Hybrid strategy:

```ts
const hybridStrategy: RetrievalStrategy = {
  search: ({ query, userId, limit }) =>
    hybridSearch({
      question: query,
      userId,
      limit,
    }),
};
```

Register the strategies:

```ts
const strategies = {
  vector: vectorStrategy,
  fulltext: fullTextStrategy,
  hybrid: hybridStrategy,
} satisfies Record<string, RetrievalStrategy>;
```

Select and execute one:

```ts
const strategy = strategies[profile.searchMode];

const results = await strategy.search({
  query,
  userId,
  limit: profile.candidateLimit,
});
```

Adding a new retrieval method does not require changing the controller.

---

## 10. Complete orchestration example

A high-level orchestrator could look like this:

```ts
async function answerQuestion(params: {
  query: string;
  history: Message[];
  userId: string;
}) {
  const analysis = await analyzeQuery(
    params.query,
    params.history,
  );

  if (analysis.intent === "casual") {
    return answerCasualQuestion(params.query);
  }

  const plan = createPlan(analysis);

  const searchQuery = plan.rewrite
    ? analysis.standaloneQuery
    : params.query;

  const queryList = plan.decompose
    ? analysis.subQuestions
    : [searchQuery];

  const resultLists = await Promise.all(
    queryList.map((query) =>
      retrieveWithProfile({
        query,
        userId: params.userId,
        profile: plan.retrieval,
      }),
    ),
  );

  let results = mergeResults(resultLists);

  if (plan.retrieval.rerank) {
    results = await rerank(searchQuery, results);
  }

  if (plan.retrieval.useThreshold) {
    results = applyRelevanceThreshold(results);
  }

  if (results.length === 0 && plan.answer.allowAbstention) {
    return createAbstentionResponse();
  }

  const answer = await generateStructuredAnswer({
    query: params.query,
    results,
    answerType: plan.answer.answerType,
  });

  const verifiedAnswer = plan.answer.verifyQuotes
    ? verifyCitations(answer, results)
    : answer;

  if (plan.answer.verifyGroundedness) {
    return verifyGroundedness(
      params.query,
      verifiedAnswer,
      results,
    );
  }

  return verifiedAnswer;
}
```

This orchestration code describes the pipeline, while the details remain inside specialized functions.

### Naming consistency

Make sure the plan property names are consistent. For example, if the plan type uses:

```ts
useRelevanceThreshold: boolean;
```

then the orchestration should use:

```ts
plan.retrieval.useRelevanceThreshold
```

not:

```ts
plan.retrieval.useThreshold
```

Similarly, the plan must define:

```ts
rewrite
decompose
```

if the orchestrator accesses those fields. Avoid a plan type and implementation that use different property names.

---

## 11. Graph/state-machine approach

If the pipeline eventually has many branches, a graph/state-machine approach can be cleaner than manually calling stages.

Conceptually:

```text
analyze
  ↓
route
  ├── casual → direct answer
  ├── simple → vector search
  ├── exact → full-text search
  └── complex → rewrite → hybrid → rerank
                              ↓
                         threshold
                              ↓
                         generate
                              ↓
                         verify
```

Since the project already includes LangGraph dependencies, each step can be represented as a graph node:

```ts
type RagState = {
  query: string;
  analysis?: QueryAnalysis;
  results?: SearchResult[];
  answer?: RAGAnswer;
  verified?: boolean;
};
```

Possible nodes:

```text
analyzeQuery
rewriteQuery
retrieveVector
retrieveFullText
fuseResults
rerankResults
applyThreshold
generateAnswer
verifyCitations
verifyGroundedness
```

The graph decides which nodes run based on state, while each node has one responsibility.

Use a graph when:

- There are many conditional paths.
- You need retries.
- You need observability per stage.
- You need parallel retrieval branches.
- You need resumability.
- You want to visualize the workflow.

Do not introduce a graph just to avoid a few simple conditions. Start with a query plan and stage functions.

---

## 12. Recommended folder structure

A maintainable structure could be:

```text
backend/
  rag/
    analyzeQuery.ts
    createQueryPlan.ts
    retrieve.ts
    rerank.ts
    threshold.ts
    generateAnswer.ts
    verifyCitations.ts
    verifyGroundedness.ts
    pipeline.ts
    strategies/
      vector.ts
      fullText.ts
      hybrid.ts
```

Then the controller stays small:

```ts
export async function chatController(
  req: Request,
  res: Response,
) {
  const session = await requireSession(req);
  const input = validateChatRequest(req.body);
  const history = await getMessages(input.conversationId);

  const result = await answerQuestion({
    query: input.query,
    history,
    userId: session.user.id,
  });

  await saveMessages(input.conversationId, input.query, result);

  return res.json(result);
}
```

---

## 13. Feature selection examples

### Simple semantic question

```text
Question:
How does the approval process work?
```

Use:

```text
vector search
top-k retrieval
basic structured answer
citation verification
```

Avoid:

```text
full-text search
decomposition
reranking
extra groundedness call
```

### Exact phrase question

```text
Question:
Where does the policy mention "prior written approval"?
```

Use:

```text
full-text search
exact quote citation
citation verification
```

Avoid:

```text
query rewriting
decomposition
semantic-only vector search
```

### Complex comparison

```text
Question:
Compare the 2024 and 2025 policies for meal allowances and approvals.
```

Use:

```text
history-aware rewrite
metadata filters
hybrid search
RRF
reranking
structured comparison answer
citation verification
groundedness verification
```

### High-risk policy answer

```text
Question:
Can an employee claim international expenses without prior approval?
```

Use:

```text
hybrid search
reranking
relevance threshold
structured citations
quote verification
groundedness verification
abstention
```

---

## 14. Four recommended route profiles

Start with four profiles:

```text
simple
exact
complex
high-risk
```

### `simple`

```text
vector search
limited candidate count
no decomposition
no reranking initially
structured answer
citation verification when documents are used
```

### `exact`

```text
full-text search
preserve exact terms
avoid rewriting
avoid decomposition
verify exact quotes
```

### `complex`

```text
history-aware rewrite
metadata filters when explicit
hybrid search
RRF
optional decomposition
reranking
relevance threshold
structured answer
citation verification
groundedness verification
```

### `high-risk`

```text
history-aware rewrite
hybrid search
reranking
calibrated threshold
structured citations
quote verification
groundedness verification
abstention
```

Measure each profile independently. Add new profiles only when evaluation shows that an existing profile is insufficient.

---

## 15. Final architecture

You will have some conditional logic, but you should not have one huge `if/else` block.

Use:

```text
query analysis
  → query plan
  → named route/profile
  → composable pipeline stages
  → specialized answer and verification functions
```

The architecture becomes:

```text
Question
  ↓
Query analysis
  ↓
Query plan
  ↓
Retrieval strategy
  ↓
Optional pipeline stages
  ↓
Answer strategy
  ↓
Optional verification stages
```

The conditionals should answer only:

```text
Which plan should run?
Which stages should be included?
```

They should not implement the feature logic themselves.

For Atlas v2, start with:

```text
simple
exact
complex
high-risk
```

Then measure each profile independently. Add new profiles only when evaluation shows that an existing profile is insufficient.

The goal is not to use every feature for every question. The goal is to demonstrate:

```text
This feature improves this class of questions
without unacceptable latency, cost, or failure rates.
```
