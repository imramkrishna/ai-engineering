import {PGVectorStore} from "@langchain/pgvector"
import { getEmbeddingsModel } from "../../packages/models/models.js"
import { getSplittedChunks } from "./split.js"

const embeddingModel=getEmbeddingsModel()
export const store=await PGVectorStore.initialize(embeddingModel,{
    postgresConnectionOptions:{
        connectionString:process.env.DATABASE_URL!
    },
    tableName:"lc_chunks",
    distanceStrategy:"cosine"
})
await store.addDocuments(await getSplittedChunks())
const hits=await store.similaritySearchVectorWithScore([],5)