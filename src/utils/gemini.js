import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function analyzeSentimentWithGemini(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  const prompt = `Analyze the sentiment of this review and classify it as POSITIVE, NEGATIVE, or NEUTRAL. Also provide an appropriate emoji. Return the response in JSON format with properties: sentiment, emoji, and explanation. Review: "${text}"`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  
  // Clean the response text by removing markdown formatting
  const cleanResponse = response.text().replace(/```json\n|\n```/g, '').trim();
  return JSON.parse(cleanResponse);
}