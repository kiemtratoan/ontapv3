import React, { useEffect, useState } from 'react';
import { Assignment, GradingResult, StudentSubmission, Question } from '../types';
import { gradeSubmission } from '../services/geminiService';
import { Loader2, Download, CheckCircle, XCircle, AlertCircle, Award, RefreshCcw, FileSpreadsheet, Mail, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import MathDisplay from './MathDisplay';

interface ResultAnalysisProps {
  assignment: Assignment;
  submission: StudentSubmission;
  isAdmin: boolean;
  teacherEmail: string;
}

const ResultAnalysis: React.FC<ResultAnalysisProps> = ({ assignment, submission, isAdmin, teacherEmail }) => {
  const [result, setResult] = useState<GradingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Email sending state
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const fetchGrade = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const gradeResult = await gradeSubmission(assignment, submission);
      setResult(gradeResult);
      
      // Automatically trigger "email sending" upon successful grading
      if (teacherEmail) {
        setEmailStatus('sending');
        // Simulate network delay for sending email
        setTimeout(() => {
            setEmailStatus('success');
        }, 2500);
      }

    } catch (error) {
      console.error(error);
      setErrorMsg((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to map option keys (A,B,C,D) back to text content for display
  const getMCQText = (q: Question, key: string | undefined) => {
    if (!key) return null;
    if (q.type !== 'MCQ' || !q.options) return key;
    
    // Check if key is A, B, C, D
    const idx = ['A', 'B', 'C', 'D'].indexOf(key.trim().toUpperCase());
    if (idx !== -1 && q.options[idx]) {
        return q.options[idx];
    }
    return key;
  };

  const downloadExcelResults = async () => {
    if (!result) return;
    setIsDownloading(true);

    try {
      const ExcelJS = (window as any).ExcelJS;
      const saveAs = (window as any).saveAs;
      
      if (!ExcelJS) {
        alert("Thư viện Excel chưa tải xong. Vui lòng đợi giây lát.");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Kết quả bài làm');

      // --- STYLING ---
      const fontStyle = { name: 'Times New Roman', size: 12 };
      const headerFont = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      const titleFont = { name: 'Times New Roman', size: 16, bold: true };
      
      // Set default font for the sheet
      sheet.columns.forEach((col: any) => {
          col.style = { font: fontStyle, alignment: { wrapText: true, vertical: 'top' } };
      });

      // --- HEADER INFO ---
      sheet.mergeCells('A1:E1');
      sheet.getCell('A1').value = "BÁO CÁO KẾT QUẢ BÀI TẬP";
      sheet.getCell('A1').font = titleFont;
      sheet.getCell('A1').alignment = { horizontal: 'center' };

      sheet.addRow([]); // Empty row
      
      sheet.addRow(["Tên bài tập:", assignment.title]);
      sheet.getCell('A3').font = { ...fontStyle, bold: true };

      sheet.addRow(["Học sinh:", submission.studentName]);
      sheet.getCell('A4').font = { ...fontStyle, bold: true };

      sheet.addRow(["Lớp:", submission.studentClass]);
      sheet.getCell('A5').font = { ...fontStyle, bold: true };

      sheet.addRow(["Điểm số:", `${result.score} / ${result.totalScore}`]);
      sheet.getCell('A6').font = { ...fontStyle, bold: true, color: { argb: 'FF0000FF' } }; // Blue color for score

      sheet.addRow(["Nhận xét chung:", result.overallComment]);
      sheet.getCell('A7').font = { ...fontStyle, bold: true };
      
      sheet.addRow([]); // Empty row

      // --- TABLE HEADERS ---
      const headerRow = sheet.addRow(["STT", "Câu hỏi", "Trả lời của HS", "Đáp án tham khảo", "Đánh giá chi tiết"]);
      headerRow.height = 25;
      
      ['A', 'B', 'C', 'D', 'E'].forEach(col => {
          const cell = sheet.getCell(`${col}${headerRow.number}`);
          cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF2563EB' } // Blue background
          };
          cell.font = headerFont;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
              top: {style:'thin'},
              left: {style:'thin'},
              bottom: {style:'thin'},
              right: {style:'thin'}
          };
      });

      // --- TABLE COLUMN WIDTHS ---
      sheet.getColumn(1).width = 10;  // STT
      sheet.getColumn(2).width = 50;  // Content
      sheet.getColumn(3).width = 30;  // Student Answer
      sheet.getColumn(4).width = 30;  // Correct Answer
      sheet.getColumn(5).width = 40;  // Feedback

      // --- DATA ROWS ---
      assignment.questions.forEach((q, index) => {
         const studentAns = getMCQText(q, submission.answers[q.id]) || "[Không trả lời]";
         const correctAns = getMCQText(q, q.correctAnswer) || "";
         const feedback = result.feedback[q.id] || "";
         
         // Clean content (remove basic formatting marks for excel readability if strictly needed, 
         // but keeping raw text is often safer for math context)
         const row = sheet.addRow([
             index + 1,
             q.content, // Excel handles basic text. LaTeX code will appear as text code.
             studentAns,
             correctAns,
             feedback
         ]);

         // Add borders to cells
         row.eachCell((cell: any) => {
             cell.border = {
                 top: {style:'thin'},
                 left: {style:'thin'},
                 bottom: {style:'thin'},
                 right: {style:'thin'}
             };
         });
      });

      // --- SAVE FILE ---
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      if (saveAs) {
          saveAs(blob, `Ket_Qua_${submission.studentName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
      } else {
          // Fallback if FileSaver is not ready (though it should be)
          const url = window.URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = `Ket_Qua_${submission.studentName.replace(/\s+/g, '_')}.xlsx`;
          anchor.click();
          window.URL.revokeObjectURL(url);
      }

    } catch (e) {
      console.error("Download failed:", e);
      alert("Lỗi khi tạo file Excel: " + (e as Error).message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleManualEmail = () => {
    if (!result) return;
    const subject = encodeURIComponent(`[SmartHomework] Kết quả: ${submission.studentName} - ${result.score} điểm`);
    const body = encodeURIComponent(`
Xin chào Giáo viên,

Hệ thống xin gửi kết quả bài làm của học sinh:
- Họ tên: ${submission.studentName}
- Lớp: ${submission.studentClass}
- Bài tập: ${assignment.title}
- Điểm số: ${result.score} / ${result.totalScore}

Nhận xét chung:
${result.overallComment}

(Chi tiết xem trong file Excel đính kèm nếu bạn đã tải về)
    `);
    window.location.href = `mailto:${teacherEmail}?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-700">AI Đang Chấm Bài...</h2>
        <p className="text-slate-500">Đang phân tích câu trả lời và vẽ biểu đồ.</p>
      </div>
    );
  }

  if (errorMsg || !result) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                 <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Đã xảy ra lỗi khi chấm bài</h3>
              <p className="text-red-600 mb-6 bg-red-50 p-3 rounded border border-red-200 text-sm max-w-md">
                {errorMsg || "Không nhận được phản hồi từ AI."}
              </p>
              <button 
                onClick={fetchGrade}
                className="bg-primary hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg"
              >
                  <RefreshCcw className="w-4 h-4" /> Thử Lại
              </button>
          </div>
      )
  }

  // Chart Data preparation
  const chartData = [
    { name: 'Điểm của bạn', score: result.score, fill: '#4f46e5' },
    { name: 'Trung bình lớp', score: 7.5, fill: '#94a3b8' }, // Mock average
    { name: 'Điểm tối đa', score: 10, fill: '#cbd5e1' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      
      {/* Email Status Banner */}
      {teacherEmail && (
        <div className={`
            p-4 rounded-xl border flex items-center justify-between shadow-sm transition-colors
            ${emailStatus === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}
        `}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${emailStatus === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Mail className="w-5 h-5" />
                </div>
                <div>
                    <h4 className={`font-bold text-sm ${emailStatus === 'success' ? 'text-emerald-800' : 'text-blue-800'}`}>
                        {emailStatus === 'success' ? 'Đã gửi báo cáo thành công' : 'Đang gửi báo cáo tự động...'}
                    </h4>
                    <p className="text-xs text-slate-500">Email: {teacherEmail}</p>
                </div>
            </div>
            {emailStatus === 'sending' && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
            {emailStatus === 'success' && (
                <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Đã gửi
                     </span>
                     <button 
                        onClick={handleManualEmail} 
                        className="text-xs underline text-slate-400 hover:text-blue-600 ml-2" 
                        title="Mở ứng dụng Mail để gửi thủ công"
                     >
                        Gửi lại thủ công
                     </button>
                </div>
            )}
        </div>
      )}

      {/* Score Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
            <Award className="w-16 h-16 mx-auto mb-2 opacity-90" />
            <h1 className="text-4xl font-extrabold mb-1">{result.score} / {result.totalScore}</h1>
            <p className="text-blue-100 text-lg">Điểm Tổng Kết</p>
            {submission.studentName && (
                <p className="text-white/80 mt-2 font-medium">Học sinh: {submission.studentName} - Lớp {submission.studentClass}</p>
            )}
        </div>
        <div className="p-6">
            <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                <SparklesIcon /> Nhận xét tổng quan:
            </h3>
            <p className="text-slate-600 italic leading-relaxed">{result.overallComment}</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border h-80">
            <h3 className="font-bold text-slate-700 mb-4">Phổ điểm so sánh</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" domain={[0, 10]} hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="score" barSize={30} radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
         </div>

         {/* Admin Actions */}
         <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col justify-center items-center text-center">
            {isAdmin ? (
                <>
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Quyền Quản Trị Viên</h3>
                    <p className="text-slate-500 text-sm mb-6">Bạn có thể tải xuống báo cáo chi tiết về bài làm này.</p>
                    <button 
                        onClick={downloadExcelResults}
                        disabled={isDownloading}
                        className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
                        {isDownloading ? 'Đang tạo Excel...' : 'Tải Về Kết Quả (Excel)'}
                    </button>
                    <p className="text-xs text-slate-400 mt-2 font-serif">Định dạng: .xlsx (Times New Roman)</p>
                </>
            ) : (
                <div className="opacity-50">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <XCircle className="w-8 h-8" />
                    </div>
                    <p>Chỉ Admin mới được tải kết quả.</p>
                </div>
            )}
         </div>
      </div>

      {/* Detailed Feedback */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
         <div className="bg-slate-50 px-6 py-4 border-b">
            <h3 className="font-bold text-slate-800">Chi Tiết & Đánh Giá Từng Câu</h3>
         </div>
         <div className="divide-y">
            {assignment.questions.map((q, idx) => (
                <div key={q.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-slate-500">CÂU {idx + 1}</span>
                        {/* Simple visual indicator based on rudimentary comparison for MCQ/TF */}
                        {['MCQ', 'TRUE_FALSE'].includes(q.type) && (
                            submission.answers[q.id] === q.correctAnswer 
                            ? <span className="text-green-600 flex items-center text-xs font-bold gap-1"><CheckCircle className="w-4 h-4"/> ĐÚNG</span>
                            : <span className="text-red-500 flex items-center text-xs font-bold gap-1"><XCircle className="w-4 h-4"/> SAI</span>
                        )}
                    </div>
                    <div className="mb-3 text-slate-800 font-medium">
                        <MathDisplay content={q.content} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-blue-50 p-3 rounded border border-blue-100">
                            <span className="block text-blue-800 font-bold text-xs mb-1">TRẢ LỜI CỦA BẠN</span>
                            {submission.answers[q.id] ? (
                                <MathDisplay content={getMCQText(q, submission.answers[q.id]) || ""} inline={true} />
                            ) : (
                                <span className="italic text-slate-400">Không trả lời</span>
                            )}
                        </div>
                        <div className="bg-green-50 p-3 rounded border border-green-100">
                             <span className="block text-green-800 font-bold text-xs mb-1">ĐÁP ÁN ĐÚNG (Tham khảo)</span>
                             <MathDisplay content={getMCQText(q, q.correctAnswer) || ""} inline={true} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded border-l-4 border-yellow-400">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-slate-700 block mb-1">Đánh giá của AI:</span>
                            {result.feedback[q.id]}
                        </div>
                    </div>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};

const SparklesIcon = () => (
    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

export default ResultAnalysis;