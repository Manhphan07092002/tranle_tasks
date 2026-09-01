import React, { useState } from 'react';
import { 
  Send, Inbox, FileText, ArrowRight, CornerDownRight,
  Building2, PlusCircle, AlertCircle, Clock
} from 'lucide-react';

export const DepartmentRequestPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'outbox' | 'new'>('inbox');

  const requests = [
    { 
      id: 'REQ-234', title: 'Đề nghị mua 10 Laptop Dell cho team Design', 
      from: 'IT', to: 'Mua Hàng', priority: 'High', 
      status: 'Pending Review', date: '10:30 AM - Hôm nay', type: 'inbox' 
    },
    { 
      id: 'REQ-233', title: 'Yêu cầu thẩm định HĐ Thiết kế PVSyst', 
      from: 'Kỹ Thuật', to: 'Pháp Chế', priority: 'Medium', 
      status: 'Approved', date: 'Hôm qua', type: 'outbox' 
    },
    { 
      id: 'REQ-230', title: 'Khảo sát hiện trạng nhà xưởng KCN A', 
      from: 'Kinh Doanh', to: 'Kỹ Thuật', priority: 'High', 
      status: 'In Progress', date: '01/08/2026', type: 'outbox' 
    }
  ];

  const inboxRequests = requests.filter(r => r.type === 'inbox');
  const outboxRequests = requests.filter(r => r.type === 'outbox');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="text-blue-500" size={20} />
          Yêu Cầu Liên Phòng Ban (Cross-Department)
        </h3>
        
        <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            <Inbox size={14} /> Inbox ({inboxRequests.length})
          </button>
          <button 
            onClick={() => setActiveTab('outbox')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'outbox' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            <Send size={14} /> Outbox
          </button>
          <button 
            onClick={() => setActiveTab('new')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'new' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
          >
            <PlusCircle size={14} /> Tạo Yêu Cầu
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'new' ? (
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Phòng Ban Tiếp Nhận (Target Department) <span className="text-rose-500">*</span></label>
              <select className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                <option value="">-- Chọn phòng ban --</option>
                <option value="legal">Phòng Pháp Chế</option>
                <option value="procurement">Phòng Mua Hàng</option>
                <option value="hr">Phòng Nhân Sự</option>
                <option value="engineering">Phòng Kỹ Thuật</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Tiêu đề Yêu Cầu <span className="text-rose-500">*</span></label>
              <input type="text" placeholder="Ví dụ: Xin phê duyệt dự toán mua máy chủ..." className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Chi tiết / Nội dung <span className="text-rose-500">*</span></label>
              <textarea rows={4} placeholder="Mô tả cụ thể yêu cầu của bạn..." className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"></textarea>
            </div>
            <div className="flex justify-end pt-2">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-2">
                <Send size={16} /> Gửi Yêu Cầu
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {(activeTab === 'inbox' ? inboxRequests : outboxRequests).map(req => (
              <div key={req.id} className="p-5 hover:bg-gray-50 dark:hover:bg-slate-750/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
                    <span className="text-blue-600 dark:text-blue-400">{req.id}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {req.from} <ArrowRight size={12} className="mx-0.5" /> {req.to}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    req.status === 'Pending Review' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                    req.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                  }`}>
                    {req.status}
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                  {req.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Clock size={14}/> {req.date}</span>
                  {req.priority === 'High' && (
                    <span className="flex items-center gap-1 text-rose-500 font-bold"><AlertCircle size={14}/> Ưu tiên cao</span>
                  )}
                  <span className="flex items-center gap-1 text-gray-400"><FileText size={14}/> Có đính kèm</span>
                </div>
              </div>
            ))}
            {(activeTab === 'inbox' ? inboxRequests : outboxRequests).length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-slate-400 text-sm">
                Không có dữ liệu trong mục này.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
