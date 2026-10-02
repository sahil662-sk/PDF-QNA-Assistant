import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { extractText } from "unpdf";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Suppress harmless TrueType font bytecode warnings from the PDF parser
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === "string" && args[0].includes("TT: undefined function")) {
    return;
  }
  originalWarn(...args);
};

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google Gen AI client with API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Configure Multer for in-memory PDF uploads (Max: 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported."));
    }
  },
});

// In-memory variable to store parsed PDF context
let extractedText = "";

// Health Check Route
app.get("/", (req, res) => {
  res.send("Server is operational.");
});

// 1. PDF Upload & Text Parsing Route
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file provided." });
    }

    const { text } = await extractText(new Uint8Array(req.file.buffer));
    const fullText = Array.isArray(text) ? text.join("\n") : text;

    if (!fullText || fullText.trim().length === 0) {
      return res.status(400).json({
        error: "Unable to extract text. The document appears to be empty or an image-only scan.",
      });
    }

    extractedText = fullText;

    res.json({
      success: true,
      message: "Document parsed successfully.",
      characterCount: extractedText.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to process the document." });
  }
});

// 2. Reset / Clear Session Route
app.post("/api/reset", (req, res) => {
  extractedText = "";
  res.json({ success: true, message: "Session successfully reset." });
});

// 3. Streaming Q&A Route with Automatic 503 Retry
app.post("/api/ask", async (req, res) => {
  const { question } = req.body;

  if (!extractedText) {
    return res.status(400).json({ error: "Please upload and process a PDF document first." });
  }

  if (!question) {
    return res.status(400).json({ error: "A question is required." });
  }

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const prompt = `You are a professional document assistant. Answer the user's inquiry strictly using the provided context. If the answer cannot be determined from the document, explicitly reply: "This information is not available in the uploaded document." Utilize clean Markdown formatting with clear bullet points where helpful.\n\nDocument Context:\n${extractedText}\n\nUser Question: ${question}`;

  try {
    let streamResponse;
    const maxRetries = 3;

    // Retry loop for temporary 503 (High Demand) spikes
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        streamResponse = await ai.models.generateContentStream({
          model: "gemini-3.6-flash",
          contents: prompt,
        });
        break; // Successfully initialized stream, break loop
      } catch (err) {
        const is503 = err?.status === 503 || err?.message?.includes("503");
        if (is503 && attempt < maxRetries) {
          console.warn(`Attempt ${attempt} encountered 503 (High Demand). Retrying in 2.5 seconds...`);
          await new Promise((resolve) => setTimeout(resolve, 2500));
        } else {
          throw err;
        }
      }
    }

    for await (const chunk of streamResponse) {
      const chunkText = chunk.text;
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Streaming error:", error);

    let errorMsg = "Failed to generate a response.";
    if (error?.status === 503 || error?.message?.includes("503")) {
      errorMsg = "Google AI servers are currently experiencing high demand. Please try again in a few moments.";
    } else if (error?.status === 429 || error?.message?.includes("429")) {
      errorMsg = "API rate limit reached. Please wait approximately 30–60 seconds before submitting another inquiry.";
    } else if (error?.status === 404) {
      errorMsg = "The requested AI model is currently unavailable.";
    }

    res.write(`data: ${JSON.stringify({ text: `\n\n⚠️ ${errorMsg}` })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on: http://localhost:${PORT}`);
});