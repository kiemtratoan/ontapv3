import React, { useState } from 'react';
import { UserCircle, ArrowRight } from 'lucide-react';
import { Assignment } from '../types';

interface StudentLoginProps {
  assignment: Assignment;
  onLogin: (name: string, className: string) => void;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ assignment, onLogin }) => {
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && className.trim()) {
      onLogin(name, className);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-xl border border-slate-100 mt-10 animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Thông Tin Học Sinh</h2>
        <p className="text-slate-500 mt-2 text-sm">
            Vui lòng điền thông tin để bắt đầu làm bài: <br/>
            <span className="font-semibold text-indigo-600">{assignment.title}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="Ví dụ: Nguyễn Văn A"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Lớp</label>
          <input
            type="text"
            required
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="Ví dụ: 10A1"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-md transition-all mt-4"
        >
          Bắt đầu làm bài
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default StudentLogin;