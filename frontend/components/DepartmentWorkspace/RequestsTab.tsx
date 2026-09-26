import React from 'react';
import { ArrowDownLeft, ArrowUpRight, PlayCircle } from 'lucide-react';
import { Button } from '../UI';
import { DepartmentRequest } from '../../types';

interface RequestsTabProps {
  incomingRequests: DepartmentRequest[];
  outgoingRequests: DepartmentRequest[];
  requestTab: 'incoming' | 'outgoing';
  setRequestTab: (tab: 'incoming' | 'outgoing') => void;
  departments: any[];
  onCreateRequest: () => void;
  onConvert: (reqId: string) => void;
  isNewRequestOpen: boolean;
  setIsNewRequestOpen: (open: boolean) => void;
  selectedDeptId: string;
  targetDeptId: string;
  setTargetDeptId: (id: string) => void;
  reqTitle: string;
  setReqTitle: (title: string) => void;
  reqDesc: string;
  setReqDesc: (desc: string) => void;
  reqPriority: 'Urgent' | 'High' | 'Medium' | 'Low';
  setReqPriority: (priority: 'Urgent' | 'High' | 'Medium' | 'Low') => void;
  reqDueDate: string;
  setReqDueDate: (date: string) => void;
  reqRelatedProj: string;
  setReqRelatedProj: (proj: string) => void;
  handleCreateRequest: (e: React.FormEvent) => Promise<void>;
  user: any;
  projects: any[];
}

export function RequestsTab({
  incomingRequests,
  outgoingRequests,
  requestTab,
  setRequestTab,
  departments,
  onCreateRequest,
  onConvert,
  isNewRequestOpen,
  setIsNewRequestOpen,
  selectedDeptId,
  targetDeptId,
  setTargetDeptId,
  reqTitle,
  setReqTitle,
  reqDesc,
  setReqDesc,
  reqPriority,
  setReqPriority,
  reqDueDate,
  setReqDueDate,
  reqRelatedProj,
  setReqRelatedProj,
  handleCreateRequest,
  user,
  projects
}: RequestsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRequestTab('incoming')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              requestTab === 'incoming'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <ArrowDownLeft size={14} />
            <span>Yêu Cầu Nhận Về ({incomingRequests.length})</span>
          </button>

          <button
            onClick={() => setRequestTab('outgoing')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              requestTab === 'outgoing'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <ArrowUpRight size={14} />
            <span>Yêu Cầu Gửi Đi ({outgoingRequests.length})</span>
          </button>
        </div>

        <Button onClick={onCreateRequest} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5">
          <PlayCircle size={15} />
          <span>Tạo Phiếu Yêu Cầu Mới</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(requestTab === 'incoming' ? incomingRequests : outgoingRequests).map(reqItem => {
          const otherDept = departments.find(d => d.id === (requestTab === 'incoming' ? reqItem.sourceDepartmentId : reqItem.targetDepartmentId));
          return (
            <div
              key={reqItem.id}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                    {reqItem.requestNumber}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    reqItem.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : reqItem.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {reqItem.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {reqItem.title}
                </h3>

                {reqItem.description && (
                  <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2">
                    {reqItem.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                  <span className="font-medium">
                    {requestTab === 'incoming' ? 'Từ:' : 'Gửi đến:'}
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {otherDept?.name || 'Phòng ban liên quan'}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-slate-700 pt-3 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  Hạn: {reqItem.dueDate || 'Không thời hạn'}
                </div>

                {requestTab === 'incoming' && reqItem.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => onConvert(reqItem.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1"
                  >
                    <PlayCircle size={14} />
                    <span>Tiếp Nhận & Tạo Task</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isNewRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Tạo Phiếu Yêu Cầu Liên Phòng Ban</h3>
              <button onClick={() => setIsNewRequestOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Gửi Đến Phòng Ban *
                </label>
                <select
                  required
                  value={targetDeptId}
                  onChange={(e) => setTargetDeptId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Chọn phòng ban nhận --</option>
                  {departments.filter(d => d.id !== selectedDeptId).map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tiêu Đề Yêu Cầu *
                </label>
                <input
                  type="text"
                  required
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  placeholder="VD: Yêu cầu khảo sát PVSyst & báo giá dự án..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nội Dung & Yêu Cầu Chi Tiết
                </label>
                <textarea
                  rows={3}
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  placeholder="Mô tả các yêu cầu kỹ thuật, tài liệu bàn giao, thông số..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Độ Ưu Tiên</label>
                  <select
                    value={reqPriority}
                    onChange={(e) => setReqPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Hạn Bàn Giao</label>
                  <input
                    type="date"
                    value={reqDueDate}
                    onChange={(e) => setReqDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsNewRequestOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Gửi Yêu Cầu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}