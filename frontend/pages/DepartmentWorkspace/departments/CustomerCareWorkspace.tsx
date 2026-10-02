import React, { useState, useEffect } from 'react';
import { 
  Headphones, PhoneCall, Mail, MessageSquare, Star, 
  Clock, CheckCircle2, AlertCircle, HeartHandshake,
  Send, User, Wrench, RefreshCw, Paperclip, Loader2, Plus, X
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { useAuth } from '../../../contexts/AuthContext';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';
import { useNotifications } from '../../../contexts/NotificationContext';
import { statusLabel } from '../../../utils/workspaceStatus';
import { useSlaPolicies, isSlaBreached } from '../hooks/useSla';

export const CustomerCareWorkspace: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const slaPolicies = useSlaPolicies();
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
  const [tktCategory, setTktCategory] = useState('Khiếu nại chung');

  // Renewal Form State
  const [rnCustomer, setRnCustomer] = useState('');
  const [rnExpiry, setRnExpiry] = useState('');
  const [rnValue, setRnValue] = useState('');

  const nowTime = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeTicket) return;
    const ticketId = activeTicket.id;
    const newMsg = {
      id: Date.now().toString(),
      sender: 'agent' as const,
      text: inputText.trim(),
      time: nowTime(),
      author: user?.name || 'CSKH'
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
          time: nowTime()
        }]
      }));
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', title: 'Đóng ticket thất bại', message: 'Vui lòng thử lại.' });
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
          time: nowTime()
        }]
      }));
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', title: 'Chuyển O&M thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const fetchCsData = async () => {
    setLoading(true);
    try {
      const [ticketData, renewalData, freshKpis] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-cs', 'tickets'),
        departmentWorkspaceService.getRecords('dept-cs', 'renewals'),
        departmentWorkspaceService.getKpis('dept-cs'),
      ]);
      setTickets(ticketData);
      setRenewals(renewalData);
      if (freshKpis) setKpis(freshKpis);
      // Đồng bộ ticket đang chọn với dữ liệu mới nhất, tránh object cũ (stale closure).
      setActiveTicket((prev: any) => {
        if (prev) return ticketData.find((t: any) => t.id === prev.id) || prev;
        return ticketData.length > 0 ? ticketData[0] : null;
      });
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCsData();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tktCustomer.trim() || !tktTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const created = await departmentWorkspaceService.createRecord('dept-cs', 'tickets', {
        customer: tktCustomer.trim(),
        channel: tktChannel,
        title: tktTitle.trim(),
        status: 'Pending',
        time: new Date().toISOString().slice(0, 10),
        agent: user?.name || 'Chuyên viên CSKH',
        avatar: '',
        category: tktCategory
      });
      // Auto-routing: sự cố kỹ thuật -> sinh cảnh báo O&M luôn (khỏi chờ chuyển tay).
      if (tktCategory === 'Sự cố kỹ thuật') {
        try {
          await departmentWorkspaceService.createRecord('dept-om', 'alarms', {
            site: tktCustomer.trim(),
            inverter: '',
            fault: tktTitle.trim(),
            time: new Date().toISOString().slice(0, 10),
            severity: 'high',
            status: 'active'
          });
          showToast({ type: 'info', title: 'Đã chuyển O&M', message: 'Sự cố kỹ thuật đã tự sinh cảnh báo sang O&M.' });
        } catch (e) {
          console.error(e);
        }
      }
      setIsAddTicketOpen(false);
      setTktCustomer('');
      setTktTitle('');
      setTktChannel('Hotline 24/7');
      setTktCategory('Khiếu nại chung');
      if (created?.id) setActiveTicket(created);
      fetchCsData();
    } catch (err) {
      console.error('Error creating ticket:', err);
      showToast({ type: 'error', title: 'Tạo ticket thất bại', message: 'Vui lòng thử lại.' });
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
      setRnExpiry('');
      setRnValue('');
      fetchCsData();
    } catch (err) {
      console.error('Error creating renewal:', err);
      showToast({ type: 'error', title: 'Lưu tái ký thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pipeline tái ký: contacting -> quoted -> renewed / lost.
  const renewalStatusMeta = (status: string) => {
    if (status === 'quoted') return { label: 'Đã báo giá', cls: 'bg-blue-100 text-blue-700' };
    if (status === 'renewed') return { label: 'Đã tái ký', cls: 'bg-emerald-100 text-emerald-700' };
    if (status === 'lost') return { label: 'Thất bại', cls: 'bg-slate-200 text-slate-500' };
    return { label: 'Đang liên hệ', cls: 'bg-amber-100 text-amber-800' };
  };

  const handleRenewalStatus = async (rn: any, status: string) => {
    try {
      const updated = { ...rn, status };
      await departmentWorkspaceService.updateRecord('dept-cs', 'renewals', rn.id, updated);
      setRenewals(prev => prev.map(r => r.id === rn.id ? updated : r));
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', title: 'Cập nhật tái ký thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const handleRateTicket = async (tkt: any, stars: number) => {
    try {
      const updated = { ...tkt, csat: stars };
      await departmentWorkspaceService.updateRecord('dept-cs', 'tickets', tkt.id, updated);
      setTickets(prev => prev.map(t => t.id === tkt.id ? updated : t));
      setActiveTicket(updated);
      showToast({ type: 'success', title: 'Đã ghi nhận đánh giá', message: `CSAT ${stars}/5 sao.` });
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', title: 'Lưu đánh giá thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const ratedTickets = tickets.filter((t: any) => t.csat != null);
  const avgCsat = kpis.csatAvg ?? (ratedTickets.length > 0
    ? Math.round((ratedTickets.reduce((s: number, t: any) => s + Number(t.csat), 0) / ratedTickets.length) * 10) / 10
    : null);

  // Tuổi ticket (ngày) + SLA policy-driven (fallback heuristic cũ khi chưa tải được policies).
  const ticketAgeDays = (t: any): number | null => {
    const base = t.createdAt || t.time;
    if (!base) return null;
    const d = new Date(String(base).length <= 10 ? `${base}T00:00:00` : base).getTime();
    if (!Number.isFinite(d)) return null;
    return Math.max(0, Math.floor((Date.now() - d) / 86400000));
  };
  const isTicketStuck = (t: any) => {
    if (t.status === 'Resolved') return false;
    if (slaPolicies.length > 0) return isSlaBreached('cs', t, slaPolicies);
    const age = ticketAgeDays(t);
    if (age === null) return false;
    return age > (t.channel === 'Hotline 24/7' ? 1 : 3);
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
            {kpis.pendingTickets ?? tickets.filter(t => t.status !== 'Resolved').length} <span className="text-lg font-medium text-slate-500">phiếu đang xử lý</span>
          </div>
          <div className="text-xs text-fuchsia-600 font-bold mt-2">
            Đa kênh: Hotline, Zalo OA, Email hỗ trợ
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            CSAT trung bình: {avgCsat === null ? '—' : `${avgCsat}/5`} ({kpis.csatCount ?? ratedTickets.length} lượt đánh giá)
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
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* Danh sách ticket */}
                  <div className="lg:col-span-2 space-y-3">
                    {tickets.map(tkt => (
                      <button
                        key={tkt.id}
                        onClick={() => setActiveTicket(tkt)}
                        className={`w-full text-left p-4 border rounded-2xl space-y-2 transition-colors ${
                          activeTicket?.id === tkt.id
                            ? 'bg-fuchsia-50 dark:bg-fuchsia-950/30 border-fuchsia-300 dark:border-fuchsia-700'
                            : 'bg-gray-50 dark:bg-slate-700/30 border-gray-100 dark:border-slate-700 hover:border-fuchsia-200'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{tkt.customer}</h4>
                          <span className="text-[11px] font-bold text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded-full whitespace-nowrap">{tkt.channel}</span>
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-2">{tkt.title}</div>
                        <div className="border-t border-gray-100 dark:border-slate-700 pt-2 flex justify-between items-center text-xs text-slate-400">
                          <span>{tkt.time}{ticketAgeDays(tkt) !== null ? ` • ${ticketAgeDays(tkt)} ngày` : ''}</span>
                          <span className="flex items-center gap-1">
                            {isTicketStuck(tkt) && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Tồn đọng</span>
                            )}
                            <span className={`font-bold ${tkt.status === 'Resolved' ? 'text-emerald-600' : 'text-amber-600'}`}>{statusLabel(tkt.status)}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Panel trao đổi + xử lý */}
                  <div className="lg:col-span-3 p-5 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex flex-col min-h-[320px]">
                    {!activeTicket ? (
                      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Chọn một ticket để trao đổi và xử lý</div>
                    ) : (
                      <>
                        <div className="flex flex-wrap justify-between items-start gap-2 pb-3 border-b border-gray-200 dark:border-slate-600">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{activeTicket.customer}</h4>
                            <div className="text-xs text-slate-500 mt-0.5">{activeTicket.title}</div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              {activeTicket.channel} • {activeTicket.agent} • {activeTicket.time}{ticketAgeDays(activeTicket) !== null ? ` • ${ticketAgeDays(activeTicket)} ngày` : ''} • <span className={`font-bold ${activeTicket.status === 'Resolved' ? 'text-emerald-600' : 'text-amber-600'}`}>{statusLabel(activeTicket.status)}</span>
                              {isTicketStuck(activeTicket) && (
                                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Tồn đọng quá SLA</span>
                              )}
                            </div>
                            {activeTicket.status === 'Resolved' && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <span className="text-[11px] text-slate-400">Hài lòng (CSAT):</span>
                                {[1, 2, 3, 4, 5].map(s => (
                                  <button
                                    key={s}
                                    onClick={() => handleRateTicket(activeTicket, s)}
                                    title={`${s} sao`}
                                    className={`text-base leading-none ${(activeTicket.csat || 0) >= s ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {activeTicket.status !== 'Resolved' && (
                            <div className="flex items-center gap-2">
                              {activeTicket.status === 'Pending' && (
                                <Button size="sm" onClick={handleTransferToOM} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl">
                                  <Wrench size={14} className="mr-1" /> Chuyển O&M
                                </Button>
                              )}
                              <Button size="sm" onClick={handleCloseTicket} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                                <CheckCircle2 size={14} className="mr-1" /> Đóng Ticket
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 py-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[280px]">
                          {(ticketMessages[activeTicket.id] || []).length === 0 && (
                            <div className="text-center text-slate-400 text-xs py-6">Chưa có trao đổi nào — ghi nhận ý kiến khách hàng bên dưới</div>
                          )}
                          {(ticketMessages[activeTicket.id] || []).map(m => (
                            <div key={m.id} className={`flex ${m.sender === 'agent' ? 'justify-end' : m.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
                                m.sender === 'agent'
                                  ? 'bg-fuchsia-600 text-white'
                                  : m.sender === 'system'
                                    ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 italic'
                                    : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                              }`}>
                                <div>{m.text}</div>
                                <div className={`text-[10px] mt-1 ${m.sender === 'agent' ? 'text-fuchsia-100' : 'text-slate-400'}`}>
                                  {m.author ? `${m.author} • ` : ''}{m.time}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {activeTicket.status !== 'Resolved' && (
                          <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-slate-600">
                            <input
                              type="text"
                              value={inputText}
                              onChange={(e) => setInputText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                              placeholder="Nhập trao đổi với khách hàng..."
                              className="flex-1 px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-fuchsia-500"
                            />
                            <Button size="sm" onClick={handleSendMessage} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-bold rounded-xl">
                              <Send size={14} className="mr-1" /> Gửi
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
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
                {renewals.map(rn => {
                  const meta = renewalStatusMeta(rn.status);
                  return (
                  <div key={rn.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{rn.customer}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Hết hạn bảo dưỡng: <span className="font-bold text-rose-500">{rn.expiry}</span></div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-sm text-emerald-600">{rn.value}</div>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    {rn.status === 'contacting' && (
                      <Button size="sm" onClick={() => handleRenewalStatus(rn, 'quoted')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl">
                        Đã báo giá gói O&M
                      </Button>
                    )}
                    {rn.status === 'quoted' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleRenewalStatus(rn, 'renewed')} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                          Đã tái ký
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRenewalStatus(rn, 'lost')} className="text-xs font-bold rounded-xl">
                          Thất bại
                        </Button>
                      </div>
                    )}
                  </div>
                  );
                })}
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
                  Phân Loại (Sự cố kỹ thuật sẽ tự chuyển O&M)
                </label>
                <select
                  value={tktCategory}
                  onChange={(e) => setTktCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="Khiếu nại chung">Khiếu nại chung</option>
                  <option value="Sự cố kỹ thuật">Sự cố kỹ thuật</option>
                  <option value="Yêu cầu bảo hành">Yêu cầu bảo hành</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nội Dung Khiếu Nại / Yêu Cầu *
                </label>                <textarea
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
