import React, { useState, useEffect } from 'react';
import { 
  Server, Shield, Cpu, Activity, AlertTriangle, CheckCircle2, Monitor, 
  Laptop, HardDrive, Network, Lock, Zap, Clock, Ticket, AlertCircle, 
  ArrowUpRight, Search, Loader2, Plus, X
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';

export const ItWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'helpdesk' | 'assets' | 'infrastructure'>('helpdesk');
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [systems, setSystems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ openTickets: 0, totalAssets: 0, systemsDown: 0 });

  // Modal State
  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ticket Form State
  const [ticketIssue, setTicketIssue] = useState('');
  const [ticketRequester, setTicketRequester] = useState('');
  const [ticketPriority, setTicketPriority] = useState('HIGH');

  // Asset Form State
  const [assetName, setAssetName] = useState('');
  const [assetAssignee, setAssetAssignee] = useState('');
  const [assetType, setAssetType] = useState('Laptop');

  const fetchItData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'helpdesk') {
        const data = await departmentWorkspaceService.getRecords('dept-it', 'tickets');
        setTickets(data);
      } else if (activeTab === 'assets') {
        const data = await departmentWorkspaceService.getRecords('dept-it', 'assets');
        setAssets(data);
      } else if (activeTab === 'infrastructure') {
        const data = await departmentWorkspaceService.getRecords('dept-it', 'infrastructure');
        setSystems(data);
      }
    } catch (err) {
      console.error('Error fetching it records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    departmentWorkspaceService.getKpis('dept-it').then(setKpis).catch(console.error);
  }, []);

  useEffect(() => {
    fetchItData();
  }, [activeTab]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketIssue.trim() || !ticketRequester.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-it', 'tickets', {
        issue: ticketIssue.trim(),
        requester: ticketRequester.trim(),
        priority: ticketPriority,
        status: 'open',
        time: 'Vừa xong'
      });
      setIsAddTicketOpen(false);
      setTicketIssue('');
      setTicketRequester('');
      fetchItData();
    } catch (err) {
      console.error('Error creating ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-it', 'assets', {
        name: assetName.trim(),
        assignee: assetAssignee.trim() || 'Chưa cấp phát',
        type: assetType,
        status: 'active'
      });
      setIsAddAssetOpen(false);
      setAssetName('');
      setAssetAssignee('');
      fetchItData();
    } catch (err) {
      console.error('Error creating asset:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. HEADER */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-500/30">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30 backdrop-blur-sm">
                <Server className="text-indigo-300" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">IT & Chuyển Đổi Số</h2>
            </div>
            <p className="text-indigo-100/80 text-sm max-w-2xl leading-relaxed">
              Quản trị hạ tầng công nghệ, nền tảng số, hệ thống bảo mật và hỗ trợ kỹ thuật (Helpdesk) cho toàn bộ nhân sự công ty Trần Lê.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsAddTicketOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 shadow-lg rounded-xl transition-all flex items-center gap-2"
            >
              <Ticket size={16} /> Tạo Ticket Hỗ Trợ
            </Button>
            <Button
              onClick={() => setIsAddAssetOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 shadow-lg rounded-xl transition-all flex items-center gap-2"
            >
              <Monitor size={16} /> Cấp Phát Thiết Bị
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('helpdesk')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'helpdesk'
              ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          <Ticket size={18} />
          Helpdesk & Incidents ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'assets'
              ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          <Monitor size={18} />
          Assets & Licenses ({assets.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
            <span className="text-xs">Đang tải dữ liệu IT...</span>
          </div>
        ) : activeTab === 'helpdesk' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Yêu Cầu Hỗ Trợ Kỹ Thuật (IT Helpdesk)
              </h3>
              <Button size="sm" onClick={() => setIsAddTicketOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl">
                <Plus size={14} className="mr-1" /> Thêm Ticket
              </Button>
            </div>

            {tickets.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">Chưa có ticket hỗ trợ nào</div>
            ) : (
              <div className="space-y-3">
                {tickets.map(t => (
                  <div key={t.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{t.issue}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Người yêu cầu: {t.requester}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.priority}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-1">{t.time || 'Hôm nay'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Danh Mục Thiết Bị Laptop, Máy Đo & Bản Quyền Phần Mềm
              </h3>
              <Button size="sm" onClick={() => setIsAddAssetOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
                <Plus size={14} className="mr-1" /> Thêm Thiết Bị
              </Button>
            </div>

            {assets.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">Chưa có thiết bị nào trong danh mục</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assets.map(ast => (
                  <div key={ast.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{ast.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Người sử dụng: <span className="font-bold text-indigo-600">{ast.assignee}</span></div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                      {ast.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: TẠO TICKET IT */}
      {isAddTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Ticket size={18} /> Gửi Ticket Hỗ Trợ IT Helpdesk
              </h3>
              <button onClick={() => setIsAddTicketOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Mô Tả Sự Cố / Yêu Cầu Hỗ Trợ *
                </label>
                <input
                  type="text"
                  required
                  value={ticketIssue}
                  onChange={(e) => setTicketIssue(e.target.value)}
                  placeholder="VD: Cài đặt bản quyền phần mềm PVsyst, AutoCAD..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Người Yêu Cầu
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketRequester}
                    onChange={(e) => setTicketRequester(e.target.value)}
                    placeholder="VD: Nguyễn Văn Nam"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Mức Độ Khẩn
                  </label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="HIGH">Khẩn</option>
                    <option value="MEDIUM">Bình Thường</option>
                    <option value="LOW">Thấp</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddTicketOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {isSubmitting ? 'Đang gửi...' : 'Gửi Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM THIẾT BỊ IT */}
      {isAddAssetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-indigo-700 to-slate-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Monitor size={18} /> Cấp Phát Tài Sản & Bản Quyền IT
              </h3>
              <button onClick={() => setIsAddAssetOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateAsset} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Thiết Bị / License Bản Quyền *
                </label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="VD: Laptop Dell Precision 3581 / Bản quyền PVsyst..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Cấp Phát Cho Nhân Sự
                  </label>
                  <input
                    type="text"
                    value={assetAssignee}
                    onChange={(e) => setAssetAssignee(e.target.value)}
                    placeholder="VD: Kỹ sư Thiết kế..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Loại Tài Sản
                  </label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Máy Đo Quang Điện">Máy Đo Quang Điện</option>
                    <option value="Bản Quyền Software">Bản Quyền Software</option>
                    <option value="Server / Mạng">Server / Mạng</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddAssetOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Thiết Bị'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
