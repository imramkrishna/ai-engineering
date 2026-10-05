import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";

function double(a: number) {
  return 2 * a;
}
function addTen(a: number) {
  return a + 10;
}
function square(a: number) {
  return a ** 2;
}

//RunnableLamda makes the js/ts functions runnable :  with functions like invoke, stream , pipe , etc

const runnableDouble = RunnableLambda.from(double);
const result = await runnableDouble.invoke(5);
console.log(result);
//Runnable Sequence - provides a sequence / chain of runnable functions

const chain = RunnableSequence.from([double, addTen, square]);
const chainResult = await chain.invoke(5);
console.log(chainResult);
const pipeChain = chain.pipe(runnableDouble);
const pipeResult=await pipeChain.invoke(5)
console.log(pipeResult);
