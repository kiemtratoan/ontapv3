import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Assignment, Question, QuestionType, StudentSubmission, GradingResult } from "../types";

const modelName = "gemini-2.5-flash"; // Good balance of speed and logic for JSON

// Helper to get AI instance using process.env.API_KEY
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for Question Generation
const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: [QuestionType.MCQ, QuestionType.TRUE_FALSE, QuestionType.SHORT_ANSWER, QuestionType.ESSAY] },
          content: { type: Type.STRING, description: "Question text. Use LaTeX $..$ for inline math and $$..$$ for block math." },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 options for MCQ, or empty for others." },
          correctAnswer: { type: Type.STRING, description: "The correct answer key or text." },
          imageSvg: { type: Type.STRING, description: "Optional SVG code string for geometry/diagrams if needed. Ensure valid SVG XML." }
        },
        required: ["id", "type", "content", "correctAnswer"]
      }
    }
  }
};

export interface GenerationConfig {
  type: QuestionType;
  difficulty: string;
  count: number;
}

export interface Chapter {
  title: string;
  lessons: string[];
}

// Helper to clean JSON string from Markdown code blocks and preambles
const cleanJsonText = (text: string): string => {
  if (!text) return "{}";
  
  // 1. Try to find the outer-most JSON object { ... }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  
  if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start, end + 1);
  }

  // 2. Fallback: Remove markdown code blocks
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  return clean.trim();
};

// Helper to generate safe unique IDs
const generateUniqueId = (prefix: string = 'q') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateAssignment = async (
  subject: string,
  grade: string,
  topic: string,
  configs: GenerationConfig[],
  contextMaterial?: string
): Promise<Question[]> => {
  const ai = getAi();
  
  // Calculate total count
  const totalCount = configs.reduce((sum, c) => sum + c.count, 0);

  // Build structure description for the prompt
  const structureDesc = configs.map(c => 
    `- ${c.count} câu hỏi loại '${c.type}' với độ khó '${c.difficulty}'`
  ).join('\n');

  let contextPrompt = "";
  if (contextMaterial) {
      contextPrompt = `
      === SOURCE MATERIAL (NỘI DUNG KIẾN THỨC) START ===
      ${contextMaterial.substring(0, 50000)}
      === SOURCE MATERIAL END ===

      INSTRUCTION FOR SOURCE MATERIAL:
      The user has provided a textbook/document content above.
      You MUST focus EXCLUSIVELY on the content related to the specific topic: "${topic}".
      
      Step 1: Locate the section, chapter, or lesson titled "${topic}" within the Source Material.
      Step 2: Extract definitions, formulas, examples, and knowledge ONLY from that specific section.
      Step 3: Generate questions based *strictly* on that extracted knowledge. 
      DO NOT generate questions from other chapters or outside knowledge unless necessary for context.
      `;
  } else {
      contextPrompt = `
      No source file provided. Generate questions based on the standard curriculum for Grade ${grade} ${subject}, specifically for the topic: "${topic}".
      `;
  }

  const prompt = `
    Role: You are an expert Vietnamese teacher creating a test.
    Task: Create a homework assignment for Grade ${grade} ${subject}.
    Target Topic: "${topic}".

    ${contextPrompt}

    ASSIGNMENT STRUCTURE:
    Generate exactly ${totalCount} questions in total.
    
    Follow this config:
    ${structureDesc}
    
    REQUIRED QUESTION TYPES:
    You must ONLY generate questions matching the types specified in the config.
    
    CRITICAL OUTPUT RULES:
    1. OUTPUT RAW JSON ONLY. NO PREAMBLE. NO EXPLANATION. NO MARKDOWN.
    2. MATHEMATICS: Use standard LaTeX format for all math formulas (e.g., $x^2 + y^2 = z^2$).
    3. GEOMETRY: If the question involves geometry, you MUST generate a simple, accurate SVG code string in the 'imageSvg' field.
    4. LANGUAGE: Vietnamese (Tiếng Việt).
    5. MCQ: Must have exactly 4 options (A, B, C, D text).
    6. CORRECTNESS: Ensure all answers are 100% correct and align with the Source Material.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.3, // Lower temperature to force adherence to the source text
      },
    });

    const text = cleanJsonText(response.text || "{}");
    const data = JSON.parse(text);
    
    // Sanitize and ensure unique IDs
    const questions = (data.questions || []).map((q: any) => ({
        ...q,
        id: generateUniqueId()
    }));
    
    return questions;
  } catch (error) {
    console.error("Error generating assignment:", error);
    throw new Error("Failed to generate questions via AI. Please check input files.");
  }
};

// Parse raw text/file content into structured questions
export const parseUploadedContent = async (rawText: string): Promise<Question[]> => {
    const ai = getAi();
    const prompt = `
      Analyze the following text which contains homework questions.
      Convert them into the structured JSON format provided in the schema.
      Detect the question type automatically.
      Preserve all Math LaTeX.
      If it's a geometry question describing a shape, try to generate a representative SVG in 'imageSvg'.
      Language: Vietnamese.

      Text to process:
      ${rawText}
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: questionSchema,
        },
      });
      const text = cleanJsonText(response.text || "{}");
      const data = JSON.parse(text);
      
      // Sanitize and ensure unique IDs
      const questions = (data.questions || []).map((q: any) => ({
        ...q,
        id: generateUniqueId()
      }));

      return questions;
    } catch (error) {
        console.error("Error parsing upload:", error);
        throw error;
    }
}

// Analyze uploaded context to extract Curriculum Structure (Chapters -> Lessons)
export const analyzeCurriculum = async (contextMaterial: string): Promise<Chapter[]> => {
  const ai = getAi();
  const prompt = `
    Analyze the provided educational material (textbook/curriculum).
    Extract the structure of the content.
    Return a list of Chapters (or Topics/Units) and the list of specific Lessons within each Chapter.
    Language: Vietnamese.
    
    Format:
    - Determine the main "Chapters" or "Topics".
    - Under each, list the "Lessons" or "Sections".

    Material Content:
    ${contextMaterial.substring(0, 40000)}
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      chapters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Name of the Chapter/Topic" },
            lessons: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of lesson names in this chapter"
            }
          },
          required: ["title", "lessons"]
        }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });
    const text = cleanJsonText(response.text || "{}");
    const data = JSON.parse(text);
    return data.chapters || [];
  } catch (error) {
    console.error("Error analyzing curriculum:", error);
    return [];
  }
};

// NEW: Get Standard Curriculum based on Subject, Grade and Book Series
export const getStandardCurriculum = async (subject: string, grade: string, bookSeries: string): Promise<Chapter[]> => {
  const ai = getAi();
  
  // Prompt được cải tiến để linh hoạt hơn
  const prompt = `
    Bạn là một chuyên gia về chương trình giáo dục phổ thông mới của Việt Nam (GDPT 2018).
    
    Nhiệm vụ: Tạo danh sách cấu trúc chương trình học (Mục lục) cho:
    - Môn học: ${subject}
    - Lớp: ${grade}
    - Bộ sách giáo khoa: ${bookSeries}

    YÊU CẦU QUAN TRỌNG:
    1. Hãy cố gắng trích xuất mục lục chính xác của cuốn sách giáo khoa "${bookSeries}" nếu bạn có dữ liệu.
    2. NẾU KHÔNG CÓ DỮ LIỆU CHÍNH XÁC TUYỆT ĐỐI VỀ BỘ SÁCH NÀY, HÃY SỬ DỤNG CHƯƠNG TRÌNH KHUNG CHUẨN CỦA BỘ GIÁO DỤC (GDPT 2018) cho môn ${subject} lớp ${grade}.
    3. Mục tiêu là PHẢI TRẢ VỀ một danh sách các Chương và Bài học hợp lý để giáo viên chọn, không được trả về danh sách rỗng.
    
    Cấu trúc mong muốn:
    - Chương 1: Tên chương
       - Bài 1: Tên bài
       - Bài 2: Tên bài
    ...

    Language: Vietnamese (Tiếng Việt).
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      chapters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Tên Chương (Ví dụ: Chương 1: Mệnh đề toán học)" },
            lessons: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Danh sách tên các bài học trong chương (Ví dụ: Bài 1: Mệnh đề, Bài 2: Tập hợp...)"
            }
          },
          required: ["title", "lessons"]
        }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.4, // Tăng nhẹ temperature để AI linh hoạt hơn trong việc tạo cấu trúc nếu không khớp 100% sách
      },
    });
    const text = cleanJsonText(response.text || "{}");
    const data = JSON.parse(text);
    
    // Fallback: Nếu trả về rỗng, thử gọi lại hoặc trả về data giả lập (ở đây ta return mảng rỗng để UI xử lý)
    return data.chapters || [];
  } catch (error) {
    console.error("Error fetching standard curriculum:", error);
    return [];
  }
};

export const gradeSubmission = async (
  assignment: Assignment,
  submission: StudentSubmission
): Promise<GradingResult> => {
  const ai = getAi();
  const prompt = `
    Act as a strict but encouraging teacher. Grade the following student submission.
    
    Assignment Context: ${assignment.subject} - ${assignment.topic} (Grade ${assignment.grade}).
    
    Questions Reference (with Correct Answers):
    ${JSON.stringify(assignment.questions.map(q => ({id: q.id, type: q.type, content: q.content, correct: q.correctAnswer})))}
    
    Student Answers (Map of Question ID -> Answer):
    ${JSON.stringify(submission.answers)}
    
    Instructions:
    1. Iterate through every provided Question ID.
    2. For MCQ and True/False, strictly check against the correct answer key.
    3. For Short Answer, check for semantic correctness (fuzzy match allowed).
    4. For Essay, evaluate understanding, logic, and completeness.
    5. Provide a score (0-10) for each question.
    6. Provide constructive feedback in Vietnamese for each question.
    7. Provide an overall encouraging comment for the whole assignment.
  `;

  // UPDATED: Use an Array Schema for robustness. 
  const gradingSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      assessments: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                questionId: { type: Type.STRING },
                score: { type: Type.NUMBER, description: "Score from 0 to 10" },
                feedback: { type: Type.STRING, description: "Detailed feedback in Vietnamese" }
            },
            required: ["questionId", "score", "feedback"]
        }
      },
      overallComment: { type: Type.STRING }
    },
    required: ["assessments", "overallComment"]
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: gradingSchema
      },
    });

    const text = cleanJsonText(response.text || "{}");
    const data = JSON.parse(text);
    
    // Convert Array structure back to Map structure for the frontend Types
    const feedbackMap: Record<string, string> = {};
    let earnedScore = 0;
    const maxScore = assignment.questions.length * 10;

    const assessments = data.assessments || [];
    
    assessments.forEach((item: any) => {
        if (item.questionId) {
            feedbackMap[item.questionId] = item.feedback || "Không có nhận xét.";
            earnedScore += (item.score || 0);
        }
    });

    // Handle missing questions (if AI skipped any)
    assignment.questions.forEach(q => {
        if (!feedbackMap[q.id]) {
            feedbackMap[q.id] = "Chưa có đánh giá (Lỗi hệ thống hoặc bỏ qua).";
        }
    });
    
    // Normalize to 10 scale
    const normalizedScore = maxScore > 0 ? (earnedScore / maxScore) * 10 : 0;

    return {
      score: parseFloat(normalizedScore.toFixed(1)),
      totalScore: 10,
      feedback: feedbackMap,
      overallComment: data.overallComment || "Đã hoàn thành bài tập."
    };

  } catch (error) {
    console.error("Grading error details:", error);
    throw new Error("AI Grading failed: " + (error as Error).message);
  }
};