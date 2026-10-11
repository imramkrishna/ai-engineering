export type GoldenCase = {
  id: string;
  question: string;
  relevantIds: string[];
  referenceAnswer: string;
  answerable: boolean;
  multiPart?: boolean;
};

export const goldenDataset: GoldenCase[] = [
  {
    id: "q-001",
    question: "What is retrieval augmented generation?",
    relevantIds: ["chunk-001", "chunk-002"],
    referenceAnswer:
      "Retrieval augmented generation retrieves relevant context and provides it to a language model before generating an answer.",
    answerable: true,
  },
  {
    id: "q-002",
    question: "How does a vector database help with search?",
    relevantIds: ["chunk-003"],
    referenceAnswer:
      "A vector database stores embeddings and searches for documents that are semantically similar to a query.",
    answerable: true,
  },
  {
    id: "q-003",
    question: "What is the difference between keyword search and semantic search?",
    relevantIds: ["chunk-004", "chunk-005"],
    referenceAnswer:
      "Keyword search matches literal terms, while semantic search matches meaning using vector representations.",
    answerable: true,
    multiPart: true,
  },
  {
    id: "q-004",
    question: "What does chunk size mean in a document splitter?",
    relevantIds: ["chunk-006"],
    referenceAnswer:
      "Chunk size is the maximum amount of text placed into one document chunk.",
    answerable: true,
  },
  {
    id: "q-005",
    question: "Why do retrieval chunks overlap?",
    relevantIds: ["chunk-007"],
    referenceAnswer:
      "Chunk overlap preserves context that might otherwise be lost at chunk boundaries.",
    answerable: true,
  },
  {
    id: "q-006",
    question: "How are embeddings generated?",
    relevantIds: ["chunk-008"],
    referenceAnswer:
      "An embedding model converts text into a numerical vector representing its meaning.",
    answerable: true,
  },
  {
    id: "q-007",
    question: "What is a retriever responsible for?",
    relevantIds: ["chunk-009"],
    referenceAnswer:
      "A retriever finds and returns documents relevant to a user query.",
    answerable: true,
  },
  {
    id: "q-008",
    question: "What is the purpose of reranking retrieved documents?",
    relevantIds: ["chunk-010"],
    referenceAnswer:
      "Reranking orders retrieved documents by relevance so the best context is used first.",
    answerable: true,
  },
  {
    id: "q-009",
    question: "What is precision in information retrieval?",
    relevantIds: ["chunk-011"],
    referenceAnswer:
      "Precision is the fraction of retrieved documents that are relevant.",
    answerable: true,
  },
  {
    id: "q-010",
    question: "What is recall in information retrieval?",
    relevantIds: ["chunk-012"],
    referenceAnswer:
      "Recall is the fraction of all relevant documents that were retrieved.",
    answerable: true,
  },
  {
    id: "q-011",
    question: "What is reciprocal rank?",
    relevantIds: ["chunk-013"],
    referenceAnswer:
      "Reciprocal rank is one divided by the position of the first relevant result.",
    answerable: true,
  },
  {
    id: "q-012",
    question: "How do hit rate and recall rate differ?",
    relevantIds: ["chunk-014", "chunk-015"],
    referenceAnswer:
      "Hit rate checks whether any relevant result was found, while recall measures how many relevant results were found.",
    answerable: true,
    multiPart: true,
  },
  {
    id: "q-013",
    question: "How should an application handle a question with no matching documents?",
    relevantIds: ["chunk-016"],
    referenceAnswer:
      "The application should indicate that the answer is unavailable instead of inventing an answer.",
    answerable: true,
  },
  {
    id: "q-014",
    question: "Why is metadata useful during retrieval?",
    relevantIds: ["chunk-017"],
    referenceAnswer:
      "Metadata allows retrieval to filter or prioritize documents using fields such as source, date, or category.",
    answerable: true,
  },
  {
    id: "q-015",
    question: "How can retrieval results be limited to the top five documents?",
    relevantIds: ["chunk-018"],
    referenceAnswer:
      "The retrieved results can be sliced or configured to return only the first five documents.",
    answerable: true,
  },
  {
    id: "q-016",
    question: "What is grounding in a question-answering system?",
    relevantIds: ["chunk-019"],
    referenceAnswer:
      "Grounding means generating an answer using retrieved source information.",
    answerable: true,
  },
  {
    id: "q-017",
    question: "What happens when a document is split into multiple chunks?",
    relevantIds: ["chunk-020"],
    referenceAnswer:
      "The document becomes multiple independently retrievable pieces of text.",
    answerable: true,
  },
  {
    id: "q-018",
    question: "How should documents be prepared before embedding and what should be stored with each chunk?",
    relevantIds: ["chunk-021", "chunk-022"],
    referenceAnswer:
      "Documents should be cleaned and split before embedding, and each chunk should retain its source metadata.",
    answerable: true,
    multiPart: true,
  },
  {
    id: "q-019",
    question: "What is the recommended embedding dimension for this system?",
    relevantIds: [],
    referenceAnswer: "",
    answerable: false,
  },
  {
    id: "q-020",
    question: "Who originally invented semantic search?",
    relevantIds: [],
    referenceAnswer: "",
    answerable: false,
  },
  {
    id: "q-021",
    question: "What was the exact production latency last month?",
    relevantIds: [],
    referenceAnswer: "",
    answerable: false,
  },
  {
    id: "q-022",
    question: "Which employee approved the retrieval architecture?",
    relevantIds: [],
    referenceAnswer: "",
    answerable: false,
  },
  {
    id: "q-023",
    question: "What is the current stock price of the company?",
    relevantIds: [],
    referenceAnswer: "",
    answerable: false,
  },
  {
    id: "q-024",
    question: "What will the system's accuracy be next year?",
    relevantIds: [],
    referenceAnswer: "",
    answerable: false,
  },
  {
    id: "q-025",
    question: "What is the private API key used by the retriever?",
    relevantIds: [],
    referenceAnswer: "",
    answerable: false,
  },
  {
    id: "q-026",
    question: "How many users will use the system tomorrow?",
    relevantIds: [],
    referenceAnswer: "",
    answerable: false,
  },
  {
    id: "q-027",
    question: "What are embeddings and why are they useful for retrieval?",
    relevantIds: ["chunk-008", "chunk-003"],
    referenceAnswer:
      "Embeddings represent text as vectors, making it possible to find semantically similar documents.",
    answerable: true,
    multiPart: true,
  },
  {
    id: "q-028",
    question: "How does top-k retrieval work and why would you change k?",
    relevantIds: ["chunk-018", "chunk-023"],
    referenceAnswer:
      "Top-k retrieval returns the k highest-ranked results. Changing k trades off context coverage against noise and cost.",
    answerable: true,
    multiPart: true,
  },
  {
    id: "q-029",
    question: "What causes a relevant document to be missed during retrieval?",
    relevantIds: ["chunk-024"],
    referenceAnswer:
      "A document may be missed because of poor chunking, weak embeddings, unsuitable k, or a vocabulary mismatch.",
    answerable: true,
  },
  {
    id: "q-030",
    question: "How can you evaluate whether retrieval is working well?",
    relevantIds: ["chunk-011", "chunk-012", "chunk-013"],
    referenceAnswer:
      "Evaluate retrieval with metrics such as precision, recall, hit rate, and reciprocal rank.",
    answerable: true,
  },
  {
    id: "q-031",
    question: "What should happen if the retriever returns duplicate chunks?",
    relevantIds: ["chunk-025"],
    referenceAnswer:
      "Duplicate results should generally be removed so the context contains distinct evidence.",
    answerable: true,
  },
  {
    id: "q-032",
    question: "Why should the source page or document ID be retained?",
    relevantIds: ["chunk-017", "chunk-026"],
    referenceAnswer:
      "Source identifiers support filtering, debugging, citations, and evaluation against expected evidence.",
    answerable: true,
    multiPart: true,
  },
  {
    id: "q-033",
    question: "Can a question have more than one relevant chunk?",
    relevantIds: ["chunk-020", "chunk-027"],
    referenceAnswer:
      "Yes. An answer may require evidence from multiple chunks of the same or different documents.",
    answerable: true,
  },
  {
    id: "q-034",
    question: "What is the difference between an unanswered question and a wrongly answered question?",
    relevantIds: ["chunk-028"],
    referenceAnswer:
      "An unanswered question has no supported response, while a wrongly answered question gives an incorrect response.",
    answerable: true,
  },
  {
    id: "q-035",
    question: "How do chunk size and chunk overlap affect retrieval quality?",
    relevantIds: ["chunk-006", "chunk-007", "chunk-024"],
    referenceAnswer:
      "Chunk size controls context granularity, while overlap preserves boundary context; both affect whether relevant evidence is retrieved.",
    answerable: true,
    multiPart: true,
  },
  {
    id: "q-036",
    question: "What should a system do when the retrieved context does not answer the question?",
    relevantIds: ["chunk-016", "chunk-019"],
    referenceAnswer:
      "It should state that the available context is insufficient rather than fabricate a response.",
    answerable: true,
  },
  {
    id: "q-037",
    question: "Why is the first relevant result important?",
    relevantIds: ["chunk-013"],
    referenceAnswer:
      "The position of the first relevant result measures how quickly useful evidence appears.",
    answerable: true,
  },
  {
    id: "q-038",
    question: "How do you calculate hit rate and mean reciprocal rank?",
    relevantIds: ["chunk-011", "chunk-013", "chunk-029"],
    referenceAnswer:
      "Hit rate is successful queries divided by all queries; mean reciprocal rank averages the reciprocal rank across queries.",
    answerable: true,
    multiPart: true,
  },
  {
    id: "q-039",
    question: "What information should be included in a golden retrieval example?",
    relevantIds: ["chunk-026", "chunk-030"],
    referenceAnswer:
      "A golden example should include a user-style question, expected evidence IDs, and a short reference answer.",
    answerable: true,
  },
  {
    id: "q-040",
    question: "How can unanswerable questions be used during evaluation?",
    relevantIds: ["chunk-028", "chunk-031"],
    referenceAnswer:
      "They test whether the system correctly refuses to answer when the corpus does not contain supporting evidence.",
    answerable: true,
  },
];