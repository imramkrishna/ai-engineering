import correctnessEvaluator from "./lib/llmEvaluator.js";

async function runEval() {
  const result = await correctnessEvaluator({
    inputs: "What is the capital of France?",
    outputs: "The capital of France is Paris.",
    reference_outputs:"Paris"
    // You can also pass context or reference outputs depending on the prompt
  })


  console.log(result);
  // Expected output structure:
  // {
  //   key: 'score',
  //   score: true,
  //   comment: 'The answer correctly identifies Paris as the capital.'
  // }
}
await runEval()
