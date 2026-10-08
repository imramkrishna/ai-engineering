import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { S3 } from "./config/s3.config.js";
import fs from "node:fs/promises";
import { uploadFileToS3 } from "./config/s3-services.js";
const result = await S3.send(new ListBucketsCommand());

console.log(result.Buckets);
