import { store } from "./store-langchain.js";

const retriever=store.asRetriever({
    k:5
})
let question="What is langchain?"
const docs=await retriever.invoke(question)