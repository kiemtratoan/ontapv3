import React, { useState, useEffect } from 'react';
import { Assignment, QuestionType, StudentSubmission } from '../types';
import MathDisplay from './MathDisplay';
import { CheckCircle, Menu, X, ChevronLeft, ChevronRight, Send, Save, Eye, Edit3, FileText, AlertCircle, AlertTriangle } from 'lucide-react';

interface StudentExamProps {
  assignment: Assignment;
  studentName: string;
  studentClass: string;
  onSubmit: (submission: StudentSubmission) => void;
}

const StudentExam: React.FC<StudentExamProps> = ({ assignment, studentName, studentClass, onSubmit }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false); // New state for custom modal
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(45 * 60); 
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentDate = new Date().toLocaleDateString('vi-VN');

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  // Triggered when user clicks "Nộp bài" - Opens the modal
  const handlePreSubmit = () => {
      setShowSubmitModal(true);
  };

  // Triggered inside the modal to actually submit
  const handleConfirmSubmit = () => {
    setIsSubmitting(true);
    setShowSubmitModal(false);
    
    // Short delay to allow UI to update to disabled state
    setTimeout(() => {
      onSubmit({
        assignmentId: assignment.id,
        studentName,
        studentClass,
        answers,
        submittedAt: Date.now()
      });
    }, 500);
  };

  const goToQuestion = (index: number) => {
      if (index >= 0 && index < assignment.questions.length) {
          setCurrentQuestionIndex(index);
          setIsReviewing(false); 
          setShowSidebar(false);
      }
  };

  const handleNext = () => {
      if (currentQuestionIndex < assignment.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
      } else {
          setIsReviewing(true);
      }
  };

  const handlePrev = () => {
      if (isReviewing) {
          setIsReviewing(false);
          return;
      }
      if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex(prev => prev - 1);
      }
  };

  const currentQ = assignment.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === assignment.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // Stats for modal
  const answeredCount = Object.keys(answers).length;
  const totalCount = assignment.questions.length;
  const unansweredCount = totalCount - answeredCount;

  // Helper to get display text for MCQ answer
  const getAnswerDisplay = (qId: string) => {
      const q = assignment.questions.find(item => item.id === qId);
      const ansKey = answers[qId];
      if (!q || !ansKey) return <span className="text-red-500 italic">Chưa làm</span>;

      if (q.type === QuestionType.MCQ && q.options) {
          const idx = ['A', 'B', 'C', 'D'].indexOf(ansKey);
          if (idx !== -1) {
              return (
                  <span className="flex items-center gap-2">
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 rounded border border-blue-200">{ansKey}</span>
                      <span className="text-slate-600 text-sm truncate max-w-[200px] inline-block align-bottom">
                         <MathDisplay content={q.options[idx]} inline={true} />
                      </span>
                  </span>
              );
          }
      }
      return <span className="font-medium text-slate-700 truncate max-w-[200px] inline-block">{ansKey}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-10 relative">
      {/* Custom Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
                <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        Xác nhận nộp bài
                    </h3>
                    <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase font-bold">Tổng số câu</p>
                            <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-200"></div>
                        <div className="text-center">
                            <p className="text-xs text-emerald-600 uppercase font-bold">Đã làm</p>
                            <p className="text-2xl font-bold text-emerald-600">{answeredCount}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-200"></div>
                        <div className="text-center">
                            <p className="text-xs text-red-500 uppercase font-bold">Chưa làm</p>
                            <p className="text-2xl font-bold text-red-500">{unansweredCount}</p>
                        </div>
                    </div>

                    {unansweredCount > 0 ? (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-red-700 text-sm flex gap-2">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <p>Bạn vẫn còn <b>{unansweredCount}</b> câu chưa hoàn thành. Bạn có chắc chắn muốn nộp bài không?</p>
                        </div>
                    ) : (
                         <div className="mb-6 p-3 bg-emerald-50 border border-emerald-100 rounded text-emerald-700 text-sm flex gap-2">
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            <p>Tuyệt vời! Bạn đã hoàn thành tất cả câu hỏi.</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowSubmitModal(false)}
                            className="flex-1 py-3 px-4 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Xem lại
                        </button>
                        <button 
                            onClick={handleConfirmSubmit}
                            className="flex-1 py-3 px-4 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md transition-all active:scale-95 flex justify-center items-center gap-2"
                        >
                            Nộp bài ngay
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Header Info Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30 py-4 mb-6 shadow-sm -mx-4 px-4 md:mx-0 md:px-0 md:rounded-xl md:top-4 animate-fade-in-down">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Bài kiểm tra - {currentDate}</h1>
            <p className="text-sm text-slate-500 font-medium">Thí sinh: {studentName} ({studentClass})</p>
          </div>
          <div className="flex items-center gap-3">
             <button
                onClick={handlePreSubmit}
                disabled={isSubmitting}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-md transition-transform active:scale-95 disabled:opacity-50"
             >
                <Save className="w-4 h-4" />
                Nộp Bài
             </button>

             <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-mono text-xl font-bold border border-red-100 shadow-inner min-w-[100px] text-center">
                {formatTime(timeLeft)}
             </div>
             <button 
                className="lg:hidden p-2 bg-slate-100 rounded-lg"
                onClick={() => setShowSidebar(!showSidebar)}
             >
                {showSidebar ? <X /> : <Menu />}
             </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start relative h-full">
        {/* LEFT COLUMN */}
        <div className="flex-1 w-full flex flex-col min-h-[500px]">
            {isReviewing ? (
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 flex-grow animate-fade-in">
                    <div className="mb-6 pb-4 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Eye className="w-6 h-6 text-blue-600" />
                            Xem lại bài làm
                        </h2>
                        <span className="text-sm font-medium text-slate-500">
                            Đã làm: <b className="text-blue-600">{answeredCount}</b> / {totalCount} câu
                        </span>
                    </div>

                    <div className="space-y-3 mb-8">
                        {assignment.questions.map((q, idx) => {
                            const isAnswered = !!answers[q.id];
                            return (
                                <div key={q.id} className={`p-4 rounded-lg border flex items-center justify-between hover:bg-slate-50 transition-colors ${isAnswered ? 'border-slate-200 bg-white' : 'border-orange-200 bg-orange-50'}`}>
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isAnswered ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-slate-400 uppercase">{q.type}</span>
                                            <div className="text-sm">{getAnswerDisplay(q.id)}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => goToQuestion(idx)}
                                        className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 flex items-center gap-1 text-sm font-bold whitespace-nowrap"
                                    >
                                        <Edit3 className="w-4 h-4" /> Sửa
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex justify-between items-center mt-auto pt-4 border-t">
                        <button
                            onClick={() => setIsReviewing(false)}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Quay lại làm bài
                        </button>

                        <button
                            onClick={handlePreSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-8 py-3 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-transform active:scale-95"
                        >
                            {isSubmitting ? 'Đang nộp...' : 'Nộp bài ngay'}
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 flex-grow flex flex-col animate-fade-in">
                    <div className="mb-6 pb-4 border-b border-slate-100 flex justify-between items-center">
                        <span className="inline-block bg-slate-100 text-slate-700 text-sm font-bold px-3 py-1 rounded">
                            Câu {currentQuestionIndex + 1} / {totalCount}
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {currentQ.type}
                        </span>
                    </div>
                    
                    <div className="mb-6">
                        <div className="text-xl text-slate-800 font-medium leading-relaxed">
                        <MathDisplay content={currentQ.content} />
                        </div>
                    </div>

                    {currentQ.imageSvg && (
                        <div className="mb-8 p-4 bg-slate-50 border rounded-lg inline-block self-center">
                            <div dangerouslySetInnerHTML={{ __html: currentQ.imageSvg }} className="w-full max-w-md" />
                        </div>
                    )}

                    <div className="mt-4 flex-grow">
                        {currentQ.type === QuestionType.MCQ && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentQ.options?.map((opt, i) => {
                                const letter = ['A', 'B', 'C', 'D'][i];
                                const isSelected = answers[currentQ.id] === letter;
                                return (
                                    <div 
                                        key={i}
                                        onClick={() => handleAnswerChange(currentQ.id, letter)}
                                        className={`
                                            cursor-pointer p-4 rounded-xl border flex items-center gap-4 transition-all hover:shadow-md
                                            ${isSelected 
                                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
                                        `}
                                    >
                                        <div className={`
                                                w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border flex-shrink-0 transition-colors
                                                ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-500 border-slate-300'}
                                        `}>
                                            {letter}
                                        </div>
                                        <div className={`text-base ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                                                <MathDisplay content={opt} inline={true} />
                                        </div>
                                    </div>
                                )
                            })}
                            </div>
                        )}

                        {currentQ.type === QuestionType.TRUE_FALSE && (
                            <div className="flex gap-6 justify-center mt-6">
                                {['Đúng', 'Sai'].map((val) => {
                                    const isSelected = answers[currentQ.id] === val;
                                    return (
                                        <div 
                                            key={val}
                                            onClick={() => handleAnswerChange(currentQ.id, val)}
                                            className={`
                                                cursor-pointer px-10 py-5 rounded-xl border flex items-center gap-3 transition-all text-lg
                                                ${isSelected 
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-500' 
                                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'}
                                            `}
                                        >
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                                                {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                            </div>
                                            <span>{val}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {currentQ.type === QuestionType.SHORT_ANSWER && (
                            <div className="mt-2">
                                <input
                                    type="text"
                                    className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                                    placeholder="Nhập câu trả lời của bạn..."
                                    value={answers[currentQ.id] || ''}
                                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                                />
                            </div>
                        )}

                        {currentQ.type === QuestionType.ESSAY && (
                            <div className="mt-2 h-full">
                                <textarea
                                    className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[200px] text-lg"
                                    placeholder="Nhập bài làm tự luận..."
                                    value={answers[currentQ.id] || ''}
                                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center mt-6 pt-4 border-t">
                        <button
                            onClick={handlePrev}
                            disabled={isFirstQuestion}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all
                                ${isFirstQuestion 
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:shadow-sm'}
                            `}
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Quay lại
                        </button>

                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-8 py-3 rounded-lg font-bold bg-primary hover:bg-blue-700 text-white shadow-lg transition-transform active:scale-95"
                        >
                            {!isLastQuestion ? 'Tiếp theo' : 'Xem lại bài làm'}
                            {!isLastQuestion ? <ChevronRight className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className={`
            fixed inset-0 bg-black/50 z-40 lg:static lg:bg-transparent lg:w-80 lg:block
            ${showSidebar ? 'block' : 'hidden'}
        `}>
             <div className="bg-white h-full w-3/4 lg:w-full max-w-xs p-6 lg:rounded-xl lg:shadow-sm lg:border lg:border-slate-100 lg:sticky lg:top-4 overflow-y-auto">
                <div className="flex justify-between items-center mb-4 lg:hidden">
                    <h3 className="font-bold text-lg">Menu</h3>
                    <button onClick={() => setShowSidebar(false)}><X className="w-6 h-6"/></button>
                </div>

                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-400" />
                    Danh sách câu hỏi
                </h3>
                
                <div className="flex gap-4 mb-4 text-xs text-slate-500 flex-wrap">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                        <span>Đã làm</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm border-2 border-orange-400 bg-white"></div>
                        <span>Đang làm</span>
                    </div>
                     <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm border border-slate-200 bg-white"></div>
                        <span>Chưa làm</span>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-2 mb-8">
                    {assignment.questions.map((q, idx) => {
                        const isDone = !!answers[q.id];
                        const isCurrent = currentQuestionIndex === idx && !isReviewing;
                        return (
                            <button
                                key={q.id}
                                onClick={() => goToQuestion(idx)}
                                className={`
                                    h-10 rounded-lg text-sm font-bold transition-all border
                                    ${isCurrent 
                                        ? 'border-2 border-orange-400 text-orange-600 bg-orange-50 transform scale-110 shadow-sm z-10' 
                                        : isDone
                                            ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }
                                `}
                            >
                                {idx + 1}
                            </button>
                        )
                    })}
                </div>

                <div className="pt-4 border-t space-y-3">
                    <button 
                        onClick={() => setIsReviewing(true)}
                        className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold border
                            ${isReviewing 
                                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }
                        `}
                    >
                        <Eye className="w-4 h-4" /> Xem tổng quan
                    </button>

                    <button
                        onClick={handlePreSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
                        <CheckCircle className="w-5 h-5" />
                    </button>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default StudentExam;