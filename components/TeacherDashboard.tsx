import React, { useState, useRef, useEffect } from 'react';
import { Assignment, Question, QuestionType } from '../types';
import { generateAssignment, parseUploadedContent, GenerationConfig, analyzeCurriculum, getStandardCurriculum, Chapter } from '../services/geminiService';
import MathDisplay from './MathDisplay';
import { Loader2, Upload, Sparkles, BookOpen, CheckCircle, FileText, AlertCircle, Trash2, Book, ChevronRight, List } from 'lucide-react';

interface TeacherDashboardProps {
  onAssign: (assignment: Assignment) => void;
}

// Labels for UI
const TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.MCQ]: "Trắc nghiệm 4 lựa chọn (A, B, C, D)",
  [QuestionType.TRUE_FALSE]: "Trắc nghiệm Đúng/Sai",
  [QuestionType.SHORT_ANSWER]: "Trả lời ngắn",
  [QuestionType.ESSAY]: "Tự luận"
};

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onAssign }) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'AI' | 'UPLOAD'>('AI');
  
  // AI Form State
  const [subject, setSubject] = useState('Toán học');
  const [grade, setGrade] = useState('10');
  const [bookSeries, setBookSeries] = useState('Kết nối tri thức với cuộc sống');
  
  // Topic/Curriculum State
  const [manualTopic, setManualTopic] = useState('');
  const [curriculum, setCurriculum] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(false);

  // Context Material State
  const [contextFile, setContextFile] = useState<{name: string, content: string} | null>(null);
  const contextInputRef = useRef<HTMLInputElement>(null);

  // Configuration per type
  const [typeConfigs, setTypeConfigs] = useState<Record<QuestionType, { selected: boolean; difficulty: string; count: number }>>({
    [QuestionType.MCQ]: { selected: true, difficulty: 'Hiểu', count: 5 },
    [QuestionType.TRUE_FALSE]: { selected: true, difficulty: 'Biết', count: 5 },
    [QuestionType.SHORT_ANSWER]: { selected: false, difficulty: 'Vận dụng', count: 3 },
    [QuestionType.ESSAY]: { selected: false, difficulty: 'Vận dụng', count: 2 },
  });

  // Upload Form State
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result State
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);

  // Effect: Fetch Standard Curriculum when Subject/Grade/BookSeries changes (if no file)
  useEffect(() => {
    // If a context file is uploaded, we don't overwrite it with standard curriculum
    if (contextFile) return;

    const fetchStandard = async () => {
        setIsLoadingCurriculum(true);
        // Clear previous selection to avoid confusion
        setCurriculum([]);
        setSelectedChapter('');
        setSelectedLesson('');
        
        try {
            const data = await getStandardCurriculum(subject, grade, bookSeries);
            setCurriculum(data);
            // Select first chapter by default if available
            if (data.length > 0) {
                setSelectedChapter(data[0].title);
                if (data[0].lessons.length > 0) setSelectedLesson(data[0].lessons[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingCurriculum(false);
        }
    };

    fetchStandard();
  }, [subject, grade, bookSeries, contextFile]);

  // Update selected selected lesson logic when selections change
  useEffect(() => {
    // If user changes chapter, reset lesson to first lesson of that chapter
    if (selectedChapter) {
        const chap = curriculum.find(c => c.title === selectedChapter);
        if (chap && chap.lessons.length > 0) {
            // Only reset if current lesson is NOT in the new chapter list
            if (!selectedLesson || !chap.lessons.includes(selectedLesson)) {
               setSelectedLesson(chap.lessons[0]);
            }
        } else {
            setSelectedLesson('');
        }
    }
  }, [selectedChapter, curriculum]);

  const handleConfigChange = (type: QuestionType, field: 'selected' | 'difficulty' | 'count', value: any) => {
    setTypeConfigs(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  // Helper to read PDF content
  const readPdfContent = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfLib = (window as any).pdfjsLib;
    if (!pdfLib) throw new Error("Thư viện đọc PDF chưa tải xong. Vui lòng thử lại sau vài giây.");
    
    const pdf = await pdfLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    
    // Iterate over all pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n`;
    }
    return fullText;
  };

  // Helper to read file content (Word, PDF, or Text)
  const readFileContent = async (file: File): Promise<string> => {
     const name = file.name.toLowerCase();
     if (name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = (window as any).mammoth;
        if (!mammoth) throw new Error("Thư viện đọc file Word chưa sẵn sàng.");
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } else if (name.endsWith('.pdf')) {
        return await readPdfContent(file);
    } else {
        return await file.text();
    }
  };

  const handleContextUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsAnalyzingFile(true);
    try {
        const text = await readFileContent(file);
        setContextFile({ name: file.name, content: text });
        
        // After reading file, analyze curriculum
        const chapters = await analyzeCurriculum(text);
        if (chapters && chapters.length > 0) {
            setCurriculum(chapters);
            // Auto select first
            setSelectedChapter(chapters[0].title);
            if (chapters[0].lessons.length > 0) setSelectedLesson(chapters[0].lessons[0]);
        }
    } catch (e) {
        alert("Lỗi đọc/phân tích file nguồn: " + (e as Error).message);
    } finally {
        setIsAnalyzingFile(false);
        if(contextInputRef.current) contextInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    // Determine the effective topic
    let finalTopic = manualTopic;
    if (selectedChapter || selectedLesson) {
        finalTopic = `Chương: ${selectedChapter}${selectedLesson ? ` - Bài: ${selectedLesson}` : ''}`;
    }

    // Filter selected configs
    const activeConfigs: GenerationConfig[] = (Object.entries(typeConfigs) as [string, { selected: boolean; difficulty: string; count: number }][])
      .filter(([_, cfg]) => cfg.selected && cfg.count > 0)
      .map(([type, cfg]) => ({
        type: type as QuestionType,
        difficulty: cfg.difficulty,
        count: cfg.count
      }));

    if (activeConfigs.length === 0) {
      alert("Vui lòng chọn ít nhất một loại câu hỏi và số lượng lớn hơn 0!");
      return;
    }

    setLoading(true);
    try {
      const questions = await generateAssignment(
          subject, 
          grade, 
          finalTopic, 
          activeConfigs, 
          contextFile?.content // Pass context material only
      );
      setGeneratedQuestions(questions);
    } catch (e) {
      alert("Lỗi tạo đề: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);

    try {
        const text = await readFileContent(file);
        setRawText(text);
    } catch (error) {
        console.error(error);
        alert("Lỗi khi đọc file. Hãy chắc chắn file không bị hỏng. " + (error as Error).message);
        setRawText('');
        setFileName('');
    } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadParse = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    try {
      const questions = await parseUploadedContent(rawText);
      setGeneratedQuestions(questions);
    } catch (e) {
      alert("Lỗi phân tích nội dung.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearFile = () => {
      setRawText('');
      setFileName('');
      setGeneratedQuestions([]);
  };

  const handleConfirmAssign = () => {
    // Determine the effective topic for the title
    let finalTopic = manualTopic;
    if (selectedLesson) {
        finalTopic = selectedLesson;
    } else if (selectedChapter) {
        finalTopic = selectedChapter;
    }

    const newAssignment: Assignment = {
      id: crypto.randomUUID(),
      title: `Bài tập ${subject} - ${finalTopic || 'Tổng hợp'}`,
      subject,
      grade,
      topic: finalTopic || 'Tổng hợp',
      questions: generatedQuestions,
      createdAt: Date.now()
    };
    onAssign(newAssignment);
  };

  // Derived state for lesson dropdown
  const availableLessons = curriculum.find(c => c.title === selectedChapter)?.lessons || [];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-slate-100">
      <div className="mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Tạo Bài Tập Mới
        </h2>
        <p className="text-slate-500">Thiết lập thông số để tạo đề hoặc tải lên file (Word, PDF) từ máy tính.</p>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMode('AI')}
          className={`flex-1 py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition-colors ${
            mode === 'AI' 
              ? 'border-primary bg-blue-50 text-primary' 
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          Tạo Bằng AI
        </button>
        <button
          onClick={() => setMode('UPLOAD')}
          className={`flex-1 py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition-colors ${
            mode === 'UPLOAD' 
              ? 'border-secondary bg-indigo-50 text-secondary' 
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Upload className="w-5 h-5" />
          Tải Đề Có Sẵn
        </button>
      </div>

      {/* Input Area */}
      <div className="bg-slate-50 p-6 rounded-lg mb-6">
        {mode === 'AI' ? (
          <div className="space-y-6">
            {/* General Info - Grid Updated for Book Series */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Môn học</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-2 border rounded-md">
                  <option>Toán học</option>
                  <option>Vật lý</option>
                  <option>Hóa học</option>
                  <option>Sinh học</option>
                  <option>Tiếng Anh</option>
                  <option>Lịch sử</option>
                  <option>Địa lý</option>
                  <option>Ngữ văn</option>
                  <option>Giáo dục công dân</option>
                  <option>Tin học</option>
                  <option>Công nghệ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lớp</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full p-2 border rounded-md">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Lớp {g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bộ sách</label>
                <select value={bookSeries} onChange={(e) => setBookSeries(e.target.value)} className="w-full p-2 border rounded-md">
                  <option value="Kết nối tri thức với cuộc sống">Kết nối tri thức</option>
                  <option value="Chân trời sáng tạo">Chân trời sáng tạo</option>
                  <option value="Cánh diều">Cánh diều</option>
                  <option value="Hiện hành (Cũ)">Hiện hành (Sách cũ)</option>
                </select>
              </div>

               {/* Context Material Upload Section - Adjusted layout */}
               <div className="md:col-span-3">
                  {/* Source Material */}
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <label className="block text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
                          <Book className="w-4 h-4"/> 
                          Nguồn dữ liệu (SGK)
                      </label>
                      <p className="text-xs text-emerald-600 mb-3 min-h-[20px]">Tải file nội dung (Word/PDF) để AI bám sát bài học.</p>
                      
                      {!contextFile ? (
                          <div 
                              onClick={() => !isAnalyzingFile && contextInputRef.current?.click()} 
                              className={`cursor-pointer border-2 border-dashed border-emerald-300 bg-white rounded-md p-6 text-center hover:bg-emerald-100 transition-colors ${isAnalyzingFile ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                              <input 
                                  type="file" 
                                  ref={contextInputRef} 
                                  className="hidden" 
                                  onChange={handleContextUpload} 
                                  accept=".docx,.pdf,.txt" 
                              />
                              {isAnalyzingFile ? (
                                  <p className="text-sm text-emerald-700 font-medium flex items-center justify-center gap-2">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Đang phân tích...
                                  </p>
                              ) : (
                                  <p className="text-sm text-emerald-700 font-medium flex items-center justify-center gap-2">
                                      <Upload className="w-4 h-4" />
                                      Tải file nội dung
                                  </p>
                              )}
                          </div>
                      ) : (
                          <div className="flex items-center justify-between bg-white p-3 rounded border border-emerald-200 shadow-sm">
                              <div className="flex items-center gap-2 overflow-hidden">
                                  <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                  <span className="text-sm font-bold text-emerald-800 truncate block max-w-full">{contextFile.name}</span>
                              </div>
                              <button 
                                  onClick={() => { 
                                      setContextFile(null); 
                                      setCurriculum([]);
                                  }} 
                                  className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      )}
                  </div>
               </div>

              {/* Dynamic Topic Selection */}
              <div className="md:col-span-3">
                {isLoadingCurriculum ? (
                     <div className="p-4 border rounded-md bg-white text-center text-slate-500 flex items-center justify-center gap-2 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        Đang lấy mục lục {bookSeries}...
                     </div>
                ) : curriculum.length > 0 ? (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                                Chọn Chương / Chủ đề
                                {!contextFile && <span className="text-xs text-blue-500 italic bg-blue-50 px-2 rounded">Bộ: {bookSeries}</span>}
                            </label>
                            <div className="relative">
                                <select 
                                    value={selectedChapter} 
                                    onChange={(e) => {
                                        setSelectedChapter(e.target.value);
                                    }} 
                                    className="w-full p-3 border border-slate-300 rounded-lg appearance-none font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                                >
                                    {curriculum.map((c, i) => (
                                        <option key={i} value={c.title}>{c.title}</option>
                                    ))}
                                </select>
                                <List className="w-5 h-5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                            </div>
                        </div>
                        
                        {/* New Lesson Frame */}
                        {selectedChapter && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                    <BookOpen className="w-4 h-4 text-blue-500" />
                                    Danh sách Bài học (Chọn 1 bài):
                                </label>
                                {availableLessons.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                                        {availableLessons.map((l, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedLesson(l)}
                                                className={`text-left text-sm p-3 rounded-lg border transition-all flex items-start gap-2 group ${
                                                    selectedLesson === l 
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                                    selectedLesson === l ? 'border-white' : 'border-slate-300 group-hover:border-blue-400'
                                                }`}>
                                                    {selectedLesson === l && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                </div>
                                                <span className="leading-tight">{l}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-6 bg-white rounded-lg border border-dashed border-slate-300 text-slate-500 italic text-sm">
                                        Không tìm thấy bài học chi tiết cho chương này.
                                    </div>
                                )}
                                
                                {/* Option to select whole chapter */}
                                <div className="mt-3 pt-3 border-t border-slate-200/60">
                                    <button
                                         onClick={() => setSelectedLesson('')}
                                         className={`text-xs flex items-center gap-2 px-3 py-2 rounded transition-colors ${!selectedLesson ? 'bg-slate-200 text-slate-800 font-bold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center ${!selectedLesson ? 'bg-slate-600 border-slate-600' : ''}`}></div>
                                        Tổng hợp cả chương / Không chọn bài
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Chủ đề / Chương (Nhập thủ công)</label>
                        <input 
                        type="text" 
                        value={manualTopic} 
                        onChange={(e) => setManualTopic(e.target.value)} 
                        className="w-full p-2 border rounded-md"
                        placeholder="Ví dụ: Hình học không gian, Định luật Newton..."
                        />
                         <p className="text-xs text-slate-400 mt-1">Hệ thống chưa tìm thấy dữ liệu mục lục cho bộ sách này, vui lòng nhập chủ đề.</p>
                    </div>
                )}
              </div>
            </div>

            {/* Structure Configuration */}
            <div className="bg-white p-5 border rounded-lg shadow-sm">
               <h3 className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider border-b pb-2">Cấu trúc đề thi</h3>
               <div className="space-y-6">
                  {/* Loop through types to render config rows */}
                  {(Object.keys(TYPE_LABELS) as QuestionType[]).map((type) => (
                    <div key={type} className="flex flex-col gap-3">
                        {/* Checkbox Header */}
                        <label className="flex items-center space-x-2 cursor-pointer w-fit">
                            <input 
                                type="checkbox"
                                checked={typeConfigs[type].selected}
                                onChange={(e) => handleConfigChange(type, 'selected', e.target.checked)}
                                className="w-5 h-5 text-primary border-slate-300 rounded focus:ring-primary"
                            />
                            <span className="font-semibold text-slate-700">{TYPE_LABELS[type]}</span>
                        </label>

                        {/* Config Inputs (Conditionally rendered) */}
                        {typeConfigs[type].selected && (
                            <div className="ml-7 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-md border border-slate-100 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Độ khó</label>
                                    <select 
                                        value={typeConfigs[type].difficulty}
                                        onChange={(e) => handleConfigChange(type, 'difficulty', e.target.value)}
                                        className="w-full p-2 border rounded text-sm"
                                    >
                                        <option value="Biết">Biết</option>
                                        <option value="Hiểu">Hiểu</option>
                                        <option value="Vận dụng">Vận dụng</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Số câu hỏi</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={typeConfigs[type].count}
                                        onChange={(e) => handleConfigChange(type, 'count', parseInt(e.target.value) || 0)}
                                        className="w-full p-2 border rounded text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                  ))}
               </div>
            </div>
            
            <div className="mt-4">
               <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {loading ? 'Đang tạo đề...' : 'Tạo Đề Ngay'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
             {/* File Upload Area for Parsing */}
            {!fileName ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-300 rounded-lg p-8 flex flex-col items-center justify-center bg-white hover:bg-indigo-50 transition-colors cursor-pointer text-center"
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept=".docx, .pdf, .txt"
                    />
                    <div className="bg-indigo-100 p-3 rounded-full mb-3">
                        {loading ? <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /> : <Upload className="w-6 h-6 text-indigo-600" />}
                    </div>
                    <p className="text-slate-700 font-medium">Nhấn để chọn file Word (.docx) hoặc PDF (.pdf)</p>
                    <p className="text-slate-400 text-xs mt-1">Hệ thống sẽ tự động đọc nội dung câu hỏi từ file.</p>
                </div>
            ) : (
                <div className="bg-white p-4 rounded border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-500" />
                        <div>
                            <p className="font-bold text-slate-700">{fileName}</p>
                            <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Đã đọc xong</p>
                        </div>
                    </div>
                    <button onClick={handleClearFile} className="text-red-500 hover:text-red-700 p-2">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Preview extracted text */}
            {rawText && (
                <div className="animate-fade-in">
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">Nội dung trích xuất (Kiểm tra lại nếu cần):</label>
                    </div>
                    <textarea 
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        rows={6}
                        className="w-full p-3 border rounded-md font-mono text-sm bg-white mb-4"
                    />
                     <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-sm text-yellow-800 mb-4 flex gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>Lưu ý: Nếu công thức toán trong Word không hiển thị đúng (do định dạng Equation), hãy đảm bảo đề bài rõ ràng. AI sẽ cố gắng khôi phục lại cấu trúc câu hỏi.</p>
                    </div>
                    <button 
                        onClick={handleUploadParse}
                        disabled={loading || !rawText}
                        className="w-full bg-secondary hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Upload />}
                        {loading ? 'Đang phân tích...' : 'Tạo Đề Từ Nội Dung Này'}
                    </button>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Section */}
      {generatedQuestions.length > 0 && (
        <div className="border-t pt-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-bold text-slate-800">Xem Trước ({generatedQuestions.length} câu)</h3>
             <button 
                onClick={handleConfirmAssign}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg flex items-center gap-2 font-bold shadow-lg"
             >
                <CheckCircle className="w-5 h-5" />
                Giao Bài Cho HS
             </button>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {generatedQuestions.map((q, idx) => (
              <div key={q.id} className="p-4 bg-white border rounded-lg shadow-sm">
                <div className="flex justify-between mb-2">
                    <span className="font-bold text-sm text-slate-500 uppercase tracking-wide">Câu {idx + 1} ({q.type})</span>
                </div>
                <div className="mb-3 text-slate-800">
                    <MathDisplay content={q.content} />
                </div>
                {q.imageSvg && (
                  <div className="mb-3 p-4 bg-white border rounded flex justify-center">
                    <div dangerouslySetInnerHTML={{ __html: q.imageSvg }} className="w-64 h-64" />
                  </div>
                )}
                {q.type === 'MCQ' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {q.options?.map((opt, i) => (
                      <div key={i} className="p-2 bg-slate-50 rounded border text-sm flex gap-1">
                        {/* A, B, C, D removed */}
                        <MathDisplay content={opt} inline={true} />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-xs text-green-600 font-mono flex gap-1 items-center">
                    <span className="font-bold">Đáp án:</span>
                    {/* Display text of correct answer if MCQ to match user request */}
                    <MathDisplay 
                        content={(q.type === 'MCQ' && q.options && ['A','B','C','D'].includes(q.correctAnswer || '')) 
                            ? (q.options[['A','B','C','D'].indexOf(q.correctAnswer || '')] || q.correctAnswer)
                            : q.correctAnswer} 
                        inline={true} 
                        className="text-green-600" 
                    />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;