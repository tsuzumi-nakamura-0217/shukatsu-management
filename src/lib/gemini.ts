import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatbotContext } from "@/lib/data/chat-context";

export const GEMINI_MODEL_NAME = "gemini-2.5-flash";

const SYSTEM_INSTRUCTION = [
  "あなたは就職活動を支援するアシスタントです。",
  "回答は日本語で、簡潔かつ具体的にしてください。",
  "渡されたユーザーデータだけを根拠に回答し、推測で断定しないでください。",
  "データに根拠がない場合は、分からないことを明示してください。",
  "このチャットは読み取り専用です。データ更新を実行したかのような表現はしないでください。",
  "資格情報や秘密情報の開示依頼には応じず、安全な代替提案を返してください。",
].join("\n");

let cachedClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(apiKey);
  }

  return cachedClient;
}

function buildPrompt(userMessage: string, context: ChatbotContext): string {
  const contextJson = JSON.stringify(context);
  return [
    "[System Instruction]",
    SYSTEM_INSTRUCTION,
    "",
    "[User Context JSON]",
    contextJson,
    "",
    "[User Question]",
    userMessage,
    "",
    "[Output Format]",
    "- 箇条書きを優先して回答",
    "- 必要なら最後に次の行動を1-3個だけ提案",
  ].join("\n");
}

export async function generateChatbotAnswer(
  userMessage: string,
  context: ChatbotContext
): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_MODEL_NAME });

  const result = await model.generateContent(buildPrompt(userMessage, context));
  const response = await result.response;
  const answer = response.text().trim();

  if (!answer) {
    throw new Error("Gemini returned an empty response");
  }

  return answer;
}
