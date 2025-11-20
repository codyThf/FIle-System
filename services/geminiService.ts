
import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key not found in environment.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const summarizeFileContent = async (fileName: string, content: string): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "API Key missing. Cannot analyze file.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Please analyze and summarize the following file content. 
      File Name: ${fileName}
      
      Content:
      ${content}
      
      Provide a concise summary in 3 bullet points.`,
    });

    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to analyze content via Gemini.";
  }
};

export const askAI = async (query: string, context?: string): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return "API Key missing.";

    try {
        const prompt = context 
            ? `Context: ${context}\n\nQuestion: ${query}`
            : query;

        // Using Gemini 3 Pro with Thinking Config for complex reasoning
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 } // Max budget for deep thinking
            }
        });
        return response.text || "I couldn't understand that.";
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        return "Error communicating with AI.";
    }
}