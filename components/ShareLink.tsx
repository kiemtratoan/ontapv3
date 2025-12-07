import React from 'react';
import { Assignment } from '../types';
import { Share2, Link as LinkIcon, ExternalLink, Copy, MousePointerClick, AlertTriangle } from 'lucide-react';

interface ShareLinkProps {
  assignment: Assignment;
  onOpenExam: () => void;
}

const ShareLink: React.FC<ShareLinkProps> = ({ assignment, onOpenExam }) => {
  // Use window.location to create a link that looks valid for the current host
  // Using a hash prevents server-side routing errors if copied (though state won't persist on refresh in this React demo)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const dummyLink = `${origin}/#exam=${assignment.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(dummyLink);
    alert("Đã sao chép liên kết vào bộ nhớ tạm! (Lưu ý: Đây là link demo, vui lòng bấm trực tiếp hoặc dán vào tab hiện tại)");
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Simulate clicking the link -> Go to Student Login
    onOpenExam();
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow-lg border border-slate-100 text-center mt-10 animate-fade-in-up">
      <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <Share2 className="w-10 h-10" />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Đã tạo bài tập thành công!</h2>
      <p className="text-slate-500 mb-8">
        Bài tập <span className="font-bold text-slate-700">"{assignment.title}"</span> đã sẵn sàng.
        <br />Hãy gửi liên kết bên dưới cho học sinh.
      </p>

      {/* Shared Link Box */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between mb-2 group hover:border-blue-300 transition-colors text-left">
        <div className="flex items-center gap-3 overflow-hidden flex-1">
            <LinkIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <a 
                href={dummyLink}
                onClick={handleLinkClick}
                className="text-blue-600 font-mono text-sm truncate underline hover:text-blue-800 cursor-pointer block"
                title="Nhấn để bắt đầu làm bài"
            >
                {dummyLink}
            </a>
        </div>
        <button 
            onClick={handleCopy}
            className="text-slate-500 hover:text-blue-600 font-bold text-sm flex items-center gap-1 ml-4 border-l pl-4 flex-shrink-0"
            title="Sao chép liên kết"
        >
            <Copy className="w-4 h-4" /> Sao chép
        </button>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-8 text-sm text-yellow-800 flex gap-3 text-left">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
            <p className="font-bold">Lưu ý quan trọng:</p>
            <p>
                Đây là bản Demo chạy trực tiếp trên trình duyệt (không có máy chủ lưu trữ). 
                Vui lòng <b>bấm trực tiếp vào link trên</b> để chuyển sang màn hình Học Sinh. 
                Nếu bạn copy link sang tab khác hoặc máy khác, dữ liệu bài tập sẽ không truy cập được.
            </p>
        </div>
      </div>

      <div className="border-t pt-8">
         <p className="text-slate-400 text-sm mb-4 font-medium uppercase tracking-wider">Hoặc bấm nút bên dưới</p>
         <button
            onClick={onOpenExam}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 shadow-lg transition-transform active:scale-95"
         >
            <ExternalLink className="w-5 h-5" />
            Mở Giao Diện Học Sinh
         </button>
      </div>
    </div>
  );
};

export default ShareLink;