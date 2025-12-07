export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  ESSAY = 'ESSAY'
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string; // Markdown supported, Math in LaTeX format $...$
  options?: string[]; // For MCQ
  correctAnswer?: string; // For auto-grading (hidden from student in real app)
  imageSvg?: string; // SVG code for geometry figures
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  topic: string;
  questions: Question[];
  createdAt: number;
}

export interface StudentSubmission {
  assignmentId: string;
  studentName: string;
  studentClass: string;
  answers: Record<string, string>; // questionId -> answer
  submittedAt: number;
}

export interface GradingResult {
  score: number;
  totalScore: number;
  feedback: Record<string, string>; // questionId -> AI feedback
  overallComment: string;
}

export enum AppView {
  TEACHER_DASHBOARD = 'TEACHER_DASHBOARD',
  SHARE_LINK = 'SHARE_LINK',
  STUDENT_LOGIN = 'STUDENT_LOGIN',
  STUDENT_EXAM = 'STUDENT_EXAM',
  RESULTS = 'RESULTS'
}