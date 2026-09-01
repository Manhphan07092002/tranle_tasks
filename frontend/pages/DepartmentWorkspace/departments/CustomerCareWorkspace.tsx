import React, { useState, useEffect } from 'react';
import { 
  Headphones, PhoneCall, Mail, MessageSquare, Star, 
  Clock, CheckCircle2, AlertCircle, HeartHandshake,
  Send, User, Wrench, RefreshCw, Paperclip, Loader2, Plus, X
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';

export const CustomerCareWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'retention'>('tickets');
  const [tickets, setTickets] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ totalTickets: 0, pendingTickets: 0, inProgressTickets: 0, totalRenewals: 0 });
  const [inputText, setInputText] = useState('');
  const [ticketMessages, setTicketMessages] = useState<Record<string, Array<{ id: string; sender: 'customer' | 'agent' | 'system'; text: string; time: string; author?: string }>>>({});

  // Modal State
  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [isAddRenewalOpen, setIsAddRenewalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ticket Form State
  const [tktCustomer, setTktCustomer] = useState('');
  const [tktTitle, setTktTitle] = useState('');
  const [tktChannel, setTktChannel] = useState('Hotline 24/7');

  // Renewal Form State
  const [rnCustomer, setRnCustomer] = useState('');
  const [rnExpiry, setRnExpiry] = useState('');
  const [rnValue, setRnValue] = useState('');

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeTicket) return;
    const ticketId = activeTicket.id;
    const newMsg = {
      id: Date.now().toString(),
      sender: 'agent' as const,
      text: inputText.trim(),
      time: 'Vừa xong',
      author: 'CSKH'
    };
    setTicketMessages(prev => ({
      ...prev,
      [ticketId]: [...(prev[ticketId] || []), newMsg]
    }));
    setInputText('');
  };

  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    try {
      const updated = { ...activeTicket, status: 'Resolved' };
      await departmentWorkspaceService.updateRecord('dept-cs', 'tickets', activeTicket.id, updated);
      setTickets(prev => prev.map(t => t.id === activeTicket.id ? updated : t));
      setActiveTicket(updated);
      setTicketMessages(prev => ({
        ...prev,
        [activeTicket.id]: [...(prev[activeTicket.id] || []), {
          id: Date.now().toString(),
          sender: 'system' as const,
          text: 'Ticket đã được đánh dấu hoàn thành (Đóng Ticket).',
          time: 'Vừa xong'
        }]
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleTransferToOM = async () => {
    if (!activeTicket) return;
    try {
      const updated = { ...activeTicket, status: 'In Progress' };
      await departmentWorkspaceService.updateRecord('dept-cs', 'tickets', activeTicket.id, updated);
      setTickets(prev => prev.map(t => t.id === activeTicket.id ? updated : t));
      setActiveTicket(updated);
      setTicketMessages(prev => ({
        ...prev,
        [activeTicket.id]: [...(prev[activeTicket.id] || []), {
          id: Date.now().toString(),
          sender: 'system' as const,
          text: 'Ticket đã được chuyển tiếp sang hàng chờ kỹ thuật O&M.',
          time: 'Vừa xong'
        }]
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCsData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'tickets') {
        const data = await departmentWorkspaceService.getRecords('dept-cs', 'tickets');
        setTickets(data);
        if (data.length > 0 && !activeTicket) {
          setActiveTicket(data[0]);
        }
      } else if (activeTab === 'retention') {
        const data = await departmentWorkspaceService.getRecords('dept-cs', 'renewals');
        setRenewals(data);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    departmentWorkspaceService.getKpis('dept-cs').then(setKpis).catch(console.error);
  }, []);

  useEffect(() => {
    fetchCsData();
  }, [activeTab]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tktCustomer.trim() || !tktTitle.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-cs', 'tickets', {
        customer: tktCustomer.trim(),
        channel: tktChannel,
        title: tktTitle.trim(),
        status: 'Pending',
        time: 'Vừa xong',
        agent: 'Chuyên viên CSKH',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
      });
      setIsAddTicketOpen(false);
      setTktCustomer('');
      setTktTitle('');
      fetchCsData();
    } catch (err) {
      console.error('Error creating ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rnCustomer.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-cs', 'renewals', {
        customer: rnCustomer.trim(),
        expiry: rnExpiry,
        value: rnValue,
        status: 'contacting'
      });
      setIsAddRenewalOpen(false);
      setRnCustomer('');
      fetchCsData();
    } catch (err) {
      console.error('Error creating renewal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. HEADER & KPI DASHBOARD */}
      <div className="bg-gradient-to-r from-fuchsia-900 via-purple-900 to-indigo-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden border border-fuchsia-500/30">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-fuchsia-500/20 rounded-xl border border-fuchsia-400/30 backdrop-blur-sm">
                <Headphones className="text-fuchsia-300" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Customer Care & Experience Hub</h2>
            </div>
            <p className="text-fuchsia-100/80 text-sm max-w-2xl leading-relaxed">
              Tiếp nhận khiếu nại, hỗ trợ kỹ thuật bảo hành 24/7, đo lường sự hài lòng khách hàng (CSAT) và quản lý hợp đồng tái ký bảo dưỡng mở rộng.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsAddTicketOpen(true)}
              className="bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-900 font-black text-xs px-4 py-2.5 shadow-lg rounded-xl transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Tiếp Nhận Ticket Mới
            </Button>
            <Button
              onClick={() => setIsAddRenewalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <HeartHandshake size={16} /> Thêm HĐ Tái Ký
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ticket CSKH Đang Xử Lý</span>
            <div className="p-2 bg-fuchsia-50 dark:bg-fuchsia-900/30 rounded-lg text-fuchsia-600">
              <Headphones size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">
            {tickets.length} <span className="text-lg font-medium text-slate-500">phiếu yêu cầu</span>
          </div>
          <div className="text-xs text-fuchsia-600 font-bold mt-2">
            Đa kênh: Hotline, Zalo OA, Email hỗ trợ
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hợp Đồng Đến Hạn Tái Ký (Retention)</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
              <HeartHandshake size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">
            {renewals.length} <span className="text-lg font-medium text-slate-500">hợp đồng</span>
          </div>
          <div className="text-xs text-indigo-500 font-bold mt-2">
            Cần chào bán gói bảo trì định kỳ O&M mở rộng
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[500px]">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 px-6 pt-4 gap-2">
          <button 
            onClick={() => setActiveTab('tickets')}
            className={`px-6 py-3 text-sm font-bold rounded-t-2xl transition-colors flex items-center gap-2 ${
              activeTab === 'tickets' 
                ? 'bg-white dark:bg-slate-800 text-fuchsia-600 dark:text-fuchsia-400 border-t border-l border-r border-gray-200 dark:border-slate-700 -mb-[1px]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Headphones size={16} /> Phiếu Hỗ Trợ Khách Hàng ({tickets.length})
          </button>
          <button 
            onClick={() => setActiveTab('retention')}
            className={`px-6 py-3 text-sm font-bold rounded-t-2xl transition-colors flex items-center gap-2 ${
              activeTab === 'retention' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-t border-l border-r border-gray-200 dark:border-slate-700 -mb-[1px]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <HeartHandshake size={16} /> Tái Ký & Gia Hạn Gói O&M ({renewals.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin text-fuchsia-600" size={28} />
              <span className="text-xs">Đang tải dữ liệu CSKH...</span>
            </div>
          ) : activeTab === 'tickets' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Hàng Đợi Yêu Cầu Chăm Sóc & Khiếu Nại
                </h3>
                <Button size="sm" onClick={() => setIsAddTicketOpen(true)} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-bold rounded-xl">
                  <Plus size={14} className="mr-1" /> Thêm Ticket
                </Button>
              </div>

              {tickets.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">Chưa có ticket khiếu nại nào từ khách hàng</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tickets.map(tkt => (
                    <div key={tkt.id} className="p-5 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{tkt.customer}</h4>
                        <span className="text-xs font-bold text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded-full">{tkt.channel}</span>
                      </div>
                      <div className="text-xs text-slate-500">{tkt.title}</div>
                      <div className="border-t border-gray-100 dark:border-slate-700 pt-2 flex justify-between items-center text-xs text-slate-400">
                        <span>{tkt.time}</span>
                        <span className={`font-bold ${tkt.status === 'Resolved' ? 'text-emerald-600' : 'text-amber-600'}`}>{tkt.status}</span>
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
                  Hợp Đồng Dự Án Đến Hạn Tái Ký Gói Bảo Dưỡng O&M
                </h3>
                <Button size="sm" onClick={() => setIsAddRenewalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
                  <Plus size={14} className="mr-1" /> Thêm Hợp Đồng Tái Ký
                </Button>
              </div>

              {renewals.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">Chưa có hợp đồng nào đến hạn tái ký</div>
              ) : (
                <div className="space-y-3">
                  {renewals.map(rn => (
                    <div key={rn.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{rn.customer}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Hết hạn bảo dưỡng: <span className="font-bold text-rose-500">{rn.expiry}</span></div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-sm text-emerald-600">{rn.value}</div>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                          {rn.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: TẠO TICKET */}
      {isAddTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-fuchsia-800 to-purple-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Headphones size={18} /> Tiếp Nhận Ticket CSKH 24/7
              </h3>
              <button onClick={() => setIsAddTicketOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Khách Hàng / Nhà Máy *
                </label>
                <input
                  type="text"
                  required
                  value={tktCustomer}
                  onChange={(e) => setTktCustomer(e.target.value)}
                  placeholder="VD: Chủ đầu tư Nhà máy Dệt Tân Bình..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Kênh Tiếp Nhận
                </label>
                <select
                  value={tktChannel}
                  onChange={(e) => setTktChannel(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="Hotline 24/7">Hotline 24/7</option>
                  <option value="Zalo OA">Zalo OA</option>
                  <option value="Email Support">Email Support</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nội Dung Khiếu Nại / Yêu Cầu *
                </label>
                <textarea
                  rows={3}
                  required
                  value={tktTitle}
                  onChange={(e) => setTktTitle(e.target.value)}
                  placeholder="Mô tả hiện tượng sự cố, yêu cầu bảo hành..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddTicketOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM TÁI KÝ */}
      {isAddRenewalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-indigo-800 to-purple-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <HeartHandshake size={18} /> Thêm Hợp Đồng Tái Ký Gói O&M
              </h3>
              <button onClick={() => setIsAddRenewalOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateRenewal} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Khách Hàng / Dự Án *
                </label>
                <input
                  type="text"
                  required
                  value={rnCustomer}
                  onChange={(e) => setRnCustomer(e.target.value)}
                  placeholder="VD: Solar Farm Bình Thuận 2 MWp..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Ngày Hết Hạn Bảo Trì
                  </label>
                  <input
                    type="date"
                    value={rnExpiry}
                    onChange={(e) => setRnExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Giá Trị Gói Tái Ký
                  </label>
                  <input
                    type="text"
                    value={rnValue}
                    onChange={(e) => setRnValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddRenewalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Tái Ký'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
