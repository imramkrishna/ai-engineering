import type { Request, Response } from "express";
import { HumanMessage, SystemMessage } from "langchain";
import { chatModel } from "../models.js";
import z from "zod";
const schemas = {
  person: z.object({
    name: z.string(),
    age: z.number(),
    city: z.string(),
  }),

  product: z.object({
    name: z.string(),
    price: z.number(),
    category: z.string(),
  }),
  jobSchema: z.object({
    title: z.string(),
    company: z.string(),
    location: z.string(),
    salary: z.number().nullable(),
    remote: z.boolean(),
    skills: z.array(z.string()),
  }),
  book: z.object({
    name: z.string(),
    price: z.number(),
    category: z.string(),
  }),
  orderSchema: z.object({
    orderId: z.string(),
    customer: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    items: z.array(
      z.object({
        name: z.string(),
        quantity: z.number(),
        price: z.number(),
      }),
    ),
    total: z.number(),
  }),
};

export const extractController = async (req: Request, res: Response) => {
  const { msg, schema } = req.body;
  if (!msg || !schema) {
    res.status(402).json({
      success: true,
      message: "Query Not Found.Pass a Query",
    });
    return;
  }
  const schemaReq = schemas[schema as keyof typeof schemas];
  if (!schemaReq) {
    return res.status(400).json({
      error: `Unknown schema: ${schemaReq}`,
    });
  }
  try {
    const message = new HumanMessage(JSON.stringify(`${msg}`));
    const structuredModel = chatModel.withStructuredOutput(schemaReq);
    const response = await structuredModel.invoke([message]);
    console.log("Strcutured Response : ", response);
    const result = schemaReq.safeParse(response);
    if (!result.success) {
      console.log(result);
      res.status(422).json({
        success: false,
        error: result.error.flatten(),
      });
      return;
    }
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.log("Error in extract controller : ", error);
    res.status(500).json({
      success: false,
      message: "Error while processing your request.",
    });
  }
};
