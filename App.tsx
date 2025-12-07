import React, { useState } from 'react';
import TeacherDashboard from './components/TeacherDashboard';
import ShareLink from './components/ShareLink';
import StudentLogin from './components/StudentLogin';
import StudentExam from './components/StudentExam';
import ResultAnalysis from './components/ResultAnalysis';
import { AppView, Assignment, StudentSubmission } from './types';
import { GraduationCap, LayoutDashboard, User, Key, Mail, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  // Config State
  const [email, setEmail] = useState<string>('');
  const [isSetup, setIsSetup] = useState(false);

  // App Logic State
  const [currentView, setCurrentView] = useState<AppView>(AppView.TEACHER_DASHBOARD);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [studentInfo, setStudentInfo] = useState<{name: string, className: string} | null>(null);
  const [submission, setSubmission] = useState<StudentSubmission | null>(null);
  const [isAdmin, setIsAdmin] = useState(true); // Toggle for demo purposes

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
        setIsSetup(true);
    } else {
        alert("Vui lòng nhập Email của bạn.");
    }
  };

  const handleAssign = (newAssignment: Assignment) => {
    setAssignment(newAssignment);
    // Instead of going directly to exam, go to Share Link view
    setCurrentView(AppView.SHARE_LINK);
  };

  const handleOpenStudentLogin = () => {
      // Switch mode to Student for demo clarity
      setIsAdmin(false);
      setCurrentView(AppView.STUDENT_LOGIN);
  };

  const handleStudentLogin = (name: string, className: string) => {
      setStudentInfo({ name, className });
      setCurrentView(AppView.STUDENT_EXAM);
  };

  const handleSubmitExam = (sub: StudentSubmission) => {
    setSubmission(sub);
    setCurrentView(AppView.RESULTS);
  };

  const resetApp = () => {
    setAssignment(null);
    setSubmission(null);
    setStudentInfo(null);
    setCurrentView(AppView.TEACHER_DASHBOARD);
    setIsAdmin(true);
  };

  // Determine if we are in an immersive student mode (Login or Exam)
  // In these modes, we hide the global header/footer to prevent navigating back to admin dashboard
  const isImmersiveMode = currentView === AppView.STUDENT_LOGIN || currentView === AppView.STUDENT_EXAM;

  // SETUP SCREEN
  if (!isSetup) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 animate-fade-in-up">
                <div className="text-center mb-8">
                     <div className="w-16 h-16 bg-blue-600 text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg transform rotate-3">
                         <GraduationCap className="w-10 h-10" />
                     </div>
                     <h1 className="text-2xl font-extrabold text-slate-800">SmartHomework AI</h1>
                     <p className="text-slate-500 mt-2">Nền tảng tạo đề và chấm bài tự động bằng Gemini</p>
                </div>

                <form onSubmit={handleSetupSubmit} className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 mb-4">
                        <p>Hệ thống đã được cấu hình sẵn API Key.</p>
                        <p>Vui lòng nhập Email để nhận kết quả bài làm của học sinh.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-blue-500" /> Email giáo viên
                        </label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="teacher@school.edu.vn"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        Bắt đầu sử dụng <ArrowRight className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar - Only show if NOT in immersive student mode */}
      {!isImmersiveMode && (
        <header className="bg-white border-b sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
                <div className="bg-primary p-2 rounded-lg text-white">
                <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                SmartHomework AI
                </span>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 mr-2 bg-slate-100 px-3 py-1 rounded-full">
                     <Mail className="w-3 h-3" />
                     {email}
                </div>
                <button 
                onClick={() => setIsAdmin(!isAdmin)}
                className={`text-xs px-3 py-1 rounded-full border ${isAdmin ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-300'}`}
                >
                {isAdmin ? 'Mode: ADMIN (Teacher)' : 'Mode: STUDENT'}
                </button>
            </div>
            </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-grow ${isImmersiveMode ? 'p-0 bg-white' : 'p-4 md:p-8'}`}>
        {currentView === AppView.TEACHER_DASHBOARD && (
          <div className="animate-fade-in-up">
             {isAdmin ? (
               <TeacherDashboard onAssign={handleAssign} />
             ) : (
               <div className="text-center mt-20">
                 <h2 className="text-2xl font-bold text-slate-400">Vui lòng chờ Giáo viên giao bài...</h2>
                 <p className="text-slate-500 mt-2">Chuyển sang chế độ Admin để tạo đề.</p>
               </div>
             )}
          </div>
        )}

        {currentView === AppView.SHARE_LINK && assignment && (
            <ShareLink assignment={assignment} onOpenExam={handleOpenStudentLogin} />
        )}

        {currentView === AppView.STUDENT_LOGIN && assignment && (
            <div className="min-h-screen bg-slate-50 p-4 md:p-8">
                <StudentLogin assignment={assignment} onLogin={handleStudentLogin} />
            </div>
        )}

        {currentView === AppView.STUDENT_EXAM && assignment && studentInfo && (
          <div className="animate-fade-in-up h-full">
             <StudentExam 
                assignment={assignment} 
                studentName={studentInfo.name} 
                studentClass={studentInfo.className} 
                onSubmit={handleSubmitExam} 
             />
          </div>
        )}

        {currentView === AppView.RESULTS && assignment && submission && (
          <div className="animate-fade-in-up">
            <ResultAnalysis 
                assignment={assignment} 
                submission={submission} 
                isAdmin={isAdmin} 
                teacherEmail={email} // Pass teacher email
            />
          </div>
        )}
      </main>

      {/* Simple Footer - Hide in immersive mode */}
      {!isImmersiveMode && (
        <footer className="bg-white border-t py-6 text-center text-slate-400 text-sm">
            <p>© 2024 SmartHomework AI. Powered by Google Gemini.</p>
        </footer>
      )}
    </div>
  );
};

export default App;