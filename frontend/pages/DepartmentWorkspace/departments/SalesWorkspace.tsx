import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, FileText, Package, Calculator, ArrowRight, DollarSign, 
  Target, Users, Phone, MapPin, Settings, CheckCircle, Clock, Plus, 
  MoreVertical, Loader2, Award, Percent, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';
import { useNotifications } from '../../../contexts/NotificationContext';

interface SalesWorkspaceProps {
  contracts: any[];
  deptContracts: any[];
  products: any[];
  totalContractValue: number;
  formatVND: (num: number) => string;
  onOpenFastQuote: () => void;
}

export const SalesWorkspace: React.FC<SalesWorkspaceProps> = ({
  contracts,
  deptContracts,
  products,
  totalContractValue,
  formatVND,
  onOpenFastQuote
}) => {
  const navigate = useNavigate();
  const { showToast } = useNotifications();
  const [boardData, setBoardData] = useState<any>({ lead: [], qualified: [], quote: [], won: [], lost: [] });
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isAddQuoteOpen, setIsAddQuoteOpen] = useState(false);
  const [quoteLead, setQuoteLead] = useState<any>(null);
  const [quoteAmount, setQuoteAmount] = useState<number | ''>('');
  const [quoteItems, setQuoteItems] = useState('');
  const [loading, setLoading] = useState(true);
  const [salesKpis, setSalesKpis] = useState<any>({ winRate: 0, totalLeads: 0, wonLeads: 0, totalContractValue: 0 });

  // Modals state
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isCommissionOpen, setIsCommissionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Lead Form State
  const [leadName, setLeadName] = useState('');
  const [leadCapacity, setLeadCapacity] = useState('');
  const [leadValue, setLeadValue] = useState<number | ''>('');
  const [leadContact, setLeadContact] = useState('');
  const [leadStage, setLeadStage] = useState('lead');

  // Commission Calculator State
  const [calcContractValue, setCalcContractValue] = useState<number | ''>('');
  const [calcMarginPct, setCalcMarginPct] = useState<number>(15);
  const [calcCommRate, setCalcCommRate] = useState<number>(3.0);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const [leads, perf, quoteData, freshKpis] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-sales', 'leads'),
        departmentWorkspaceService.getRecords('dept-sales', 'performance'),
        departmentWorkspaceService.getRecords('dept-sales', 'quotes'),
        departmentWorkspaceService.getKpis('dept-sales')
      ]);
      
      const newBoard: any = { lead: [], qualified: [], quote: [], won: [], lost: [] };
      const dropped: string[] = [];
      leads.forEach((l: any) => {
        if (newBoard[l.stage]) {
          newBoard[l.stage].push({
            ...l,
            sent: l.sent === 1 || l.sent === true
          });
        } else {
          dropped.push(`${l.name || l.id} (stage="${l.stage}")`);
        }
      });
      if (dropped.length > 0) {
        console.warn(`[Sales] ${dropped.length} lead có stage lạ, tạm ẩn khỏi kanban:`, dropped);
      }
      setBoardData(newBoard);
      setPerformanceData([...perf].reverse());
      setQuotes(quoteData);
      if (freshKpis) setSalesKpis(freshKpis);
    } catch (err) {
      console.error('Error fetching sales records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-sales', 'leads', {
        name: leadName.trim(),
        capacity: leadCapacity.trim(),
        value: leadValue === '' ? 0 : Number(leadValue),
        contact: leadContact.trim(),
        stage: leadStage,
        sent: false
      });
      setIsAddLeadOpen(false);
      setLeadName('');
      setLeadCapacity('');
      setLeadValue('');
      setLeadContact('');
      setLeadStage('lead');
      fetchSalesData();
    } catch (err) {
      console.error('Error creating lead:', err);
      showToast({ type: 'error', title: 'Tạo lead thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceStage = async (item: any, nextStage: string) => {
    try {
      if (nextStage === 'won') {
        await departmentWorkspaceService.convertLeadToProject({
          leadId: item.id,
          projectName: `Dự án Solar ${item.name}`,
          client: item.name,
          capacity: item.capacity,
          value: Number(item.value) || 0,
          notes: `Khách hàng: ${item.name} (${item.contact})`
        });
      } else if (nextStage === 'lost') {
        await departmentWorkspaceService.updateRecord('dept-sales', 'leads', item.id, {
          ...item,
          stage: 'lost'
        });
      } else {
        await departmentWorkspaceService.updateRecord('dept-sales', 'leads', item.id, {
          ...item,
          stage: nextStage
        });
      }
      fetchSalesData();
    } catch (err) {
      console.error('Error moving lead stage:', err);
      showToast({ type: 'error', title: 'Chuyển giai đoạn thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  // Handoff sang Kỹ thuật: tạo yêu cầu khảo sát mái từ lead (liên phòng ban).
  const handleHandoffSurvey = async (item: any) => {
    try {
      await departmentWorkspaceService.createRecord('dept-eng', 'requests', {
        project: item.name,
        type: 'Khảo Sát Mái',
        priority: 'MEDIUM',
        date: new Date().toISOString().slice(0, 10),
        status: 'pending'
      });
      showToast({ type: 'success', title: 'Đã chuyển khảo sát', message: `Yêu cầu khảo sát "${item.name}" đã sang P. Kỹ thuật.` });
    } catch (err) {
      console.error('Error handing off survey:', err);
      showToast({ type: 'error', title: 'Chuyển khảo sát thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const quotesOf = (leadId: string) =>
    quotes.filter((q: any) => q.leadId === leadId).sort((a: any, b: any) => a.version - b.version);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(quoteAmount);
    if (!quoteLead || !Number.isFinite(amount) || amount <= 0) return;

    try {
      setIsSubmitting(true);
      const version = quotesOf(quoteLead.id).reduce((m: number, q: any) => Math.max(m, Number(q.version) || 0), 0) + 1;
      await departmentWorkspaceService.createRecord('dept-sales', 'quotes', {
        leadId: quoteLead.id,
        version,
        amount,
        items: quoteItems.trim(),
        status: 'draft'
      });
      setIsAddQuoteOpen(false);
      setQuoteLead(null);
      setQuoteAmount('');
      setQuoteItems('');
      fetchSalesData();
    } catch (err) {
      console.error('Error creating quote:', err);
      showToast({ type: 'error', title: 'Lưu bản báo giá thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chốt theo bản báo giá: đánh dấu accepted + chuyển lead thành won với giá trị bản đó.
  const handleAcceptQuote = async (lead: any, q: any) => {
    try {
      for (const other of quotesOf(lead.id)) {
        if (other.id !== q.id && other.status !== 'accepted') {
          await departmentWorkspaceService.updateRecord('dept-sales', 'quotes', other.id, {
            ...other,
            status: 'superseded'
          });
        }
      }
      await departmentWorkspaceService.updateRecord('dept-sales', 'quotes', q.id, {
        ...q,
        status: 'accepted'
      });
      await handleAdvanceStage({ ...lead, value: q.amount }, 'won');
    } catch (err) {
      console.error('Error accepting quote:', err);
      showToast({ type: 'error', title: 'Chốt báo giá thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  // Commission math
  const numCalcValue = typeof calcContractValue === 'number' ? calcContractValue : (Number(calcContractValue) || 0);
  const estimatedGrossProfit = (numCalcValue * calcMarginPct) / 100;
  const estimatedCommission = (numCalcValue * calcCommRate) / 100;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. SALES HEADER & KPIs */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-900 text-white p-8 rounded-3xl border border-blue-700 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30 backdrop-blur-sm">
                <TrendingUp className="text-cyan-300" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Sales & CRM Hub</h2>
            </div>
            <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
              Quản lý phễu cơ hội (Pipeline), Báo giá thiết bị Solar AIKO/SAJ, Khách hàng tiềm năng, và theo dõi Hoa hồng (Commission) trực tiếp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsAddLeadOpen(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black text-xs px-4 py-2.5 shadow-lg shadow-cyan-500/20 rounded-xl transition-transform hover:scale-105"
            >
              <Plus size={16} className="mr-1.5" />
              Thêm Cơ Hội Mới
            </Button>
            <Button
              onClick={() => setIsCommissionOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-transform hover:scale-105"
            >
              <Award size={16} className="mr-1.5" />
              Tính Hoa Hồng
            </Button>
            <Button
              onClick={onOpenFastQuote}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 border border-white/20 rounded-xl backdrop-blur-md transition-transform hover:scale-105"
            >
              <Calculator size={16} className="mr-1.5" />
              Báo Giá Nhanh
            </Button>
          </div>
        </div>
      </div>

      {/* 2. SALES STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pipeline Toàn Ngành</span>
            <Target size={20} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white">
            {formatVND(salesKpis.totalContractValue ?? 0)}
          </div>
          <div className="text-xs text-blue-500 font-semibold mt-2">
            {salesKpis.totalLeads ?? 0} cơ hội đang theo đuổi
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tỷ Lệ Chốt Deal (Win-Rate)</span>
            <Award size={20} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {salesKpis.winRate ?? 0}%
          </div>
          <div className="text-xs text-emerald-500 font-semibold mt-2">
            {salesKpis.wonLeads ?? 0} hợp đồng đã ký thành công
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Đang Báo Giá & Đàm Phán</span>
            <Clock size={20} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white">
            {(boardData.quote || []).length} <span className="text-sm font-medium text-slate-400">dự án</span>
          </div>
          <div className="text-xs text-amber-500 font-semibold mt-2">
            Cần thúc đẩy ký kết
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Chờ Khảo Sát Kỹ Thuật</span>
            <MapPin size={20} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white">
            {(boardData.qualified || []).length} <span className="text-sm font-medium text-slate-400">khách hàng</span>
          </div>
          <div className="text-xs text-purple-500 font-semibold mt-2">
            Liên kết với P. Kỹ thuật Solar
          </div>
        </div>
      </div>

      {/* 3. SALES CRM PIPELINE (KANBAN BOARD) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Phễu Cơ Hội Kinh Doanh (Sales Pipeline)</h3>
            <p className="text-xs text-slate-400">Theo dõi tiến độ từ tiếp cận đến ký hợp đồng EPC Solar</p>
          </div>
          <Button 
            onClick={() => setIsAddLeadOpen(true)}
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
          >
            <Plus size={14} className="mr-1" /> Thêm Lead
          </Button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <span className="text-xs">Đang tải dữ liệu Pipeline...</span>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
            
            {/* Column 1: Leads */}
            <div className="flex-shrink-0 w-80 bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[600px] snap-center">
              <div className="flex items-center justify-between mb-4 px-1">
                <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Tiếp Cận (Leads)
                </h4>
                <span className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold px-2 py-0.5 rounded-full">
                  {(boardData.lead || []).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {(boardData.lead || []).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">Chưa có khách hàng tiếp cận</div>
                ) : (boardData.lead || []).map((item: any) => (
                  <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-xs text-blue-600 font-bold mt-1">{formatVND(Number(item.value) || 0)} • {item.capacity}</div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-3 border-t border-gray-100 dark:border-slate-600 pt-2">
                      <Phone size={10} /> {item.contact}
                    </div>
                    <button
                      onClick={() => handleAdvanceStage(item, 'qualified')}
                      className="mt-2 w-full flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold py-1.5 rounded-lg border border-blue-200 transition-colors"
                    >
                      Chuyển Khảo Sát <ArrowRight size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Qualified & Survey */}
            <div className="flex-shrink-0 w-80 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/30 flex flex-col max-h-[600px] snap-center">
              <div className="flex items-center justify-between mb-4 px-1">
                <h4 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Khảo Sát & Lọc
                </h4>
                <span className="bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full">
                  {(boardData.qualified || []).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {(boardData.qualified || []).length === 0 ? (
                  <div className="text-center py-8 text-blue-400/80 text-xs">Chưa có khách hàng khảo sát & lọc</div>
                ) : (boardData.qualified || []).map((item: any) => (
                  <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-200 dark:border-blue-700/50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-xs text-blue-600 font-bold mt-1">{formatVND(Number(item.value) || 0)} • {item.capacity}</div>
                    <button
                      onClick={() => handleHandoffSurvey(item)}
                      className="mt-2 w-full flex items-center justify-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-700 text-[10px] font-bold py-1.5 rounded-lg border border-teal-200 transition-colors"
                    >
                      Tạo YC Khảo Sát <ArrowRight size={10} />
                    </button>
                    <button
                      onClick={() => handleAdvanceStage(item, 'quote')}
                      className="mt-3 w-full flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold py-1.5 rounded-lg border border-amber-200 transition-colors"
                    >
                      Lập Báo Giá <ArrowRight size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Quotation */}
            <div className="flex-shrink-0 w-80 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/30 flex flex-col max-h-[600px] snap-center">
              <div className="flex items-center justify-between mb-4 px-1">
                <h4 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Báo Giá / Đàm Phán
                </h4>
                <span className="bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full">
                  {(boardData.quote || []).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {(boardData.quote || []).length === 0 ? (
                  <div className="text-center py-8 text-amber-500/80 text-xs">Chưa có khách hàng báo giá & đàm phán</div>
                ) : (boardData.quote || []).map((item: any) => (
                  <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-200 dark:border-amber-700/50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-xs text-amber-600 font-bold mt-1">{formatVND(Number(item.value) || 0)} • {item.capacity}</div>
                    {quotesOf(item.id).map((q: any) => (
                      <div key={q.id} className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-700 dark:text-slate-200">Bản v{q.version} • {formatVND(Number(q.amount) || 0)}</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                            q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                            q.status === 'superseded' ? 'bg-slate-200 text-slate-500' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {q.status === 'accepted' ? 'Đã chốt' : q.status === 'superseded' ? 'Hết hiệu lực' : 'Nháp'}
                          </span>
                        </div>
                        {q.items && <div className="text-slate-500 mt-1 line-clamp-2">{q.items}</div>}
                        {q.status !== 'accepted' && (
                          <button
                            onClick={() => handleAcceptQuote(item, q)}
                            className="mt-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 rounded-md transition-colors"
                          >
                            Chốt theo bản này
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => { setQuoteLead(item); setQuoteAmount(Number(item.value) || ''); setIsAddQuoteOpen(true); }}
                      className="mt-2 w-full flex items-center justify-center gap-1 bg-white hover:bg-amber-50 text-amber-700 text-[10px] font-bold py-1.5 rounded-lg border border-amber-200 transition-colors"
                    >
                      <Plus size={10} /> Thêm bản báo giá ({quotesOf(item.id).length})
                    </button>
                    <button
                      onClick={() => handleAdvanceStage(item, 'won')}
                      className="mt-3 w-full flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      <CheckCircle size={12} /> Chốt Hợp Đồng (Won)
                    </button>
                    <button
                      onClick={() => handleAdvanceStage(item, 'lost')}
                      className="mt-2 w-full flex items-center justify-center gap-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                    >
                      Đánh dấu Thua (Lost)
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 4: Won */}
            <div className="flex-shrink-0 w-80 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-800/30 flex flex-col max-h-[600px] snap-center">
              <div className="flex items-center justify-between mb-4 px-1">
                <h4 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Chốt Deal Thành Công (Won)
                </h4>
                <span className="bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-full">
                  {(boardData.won || []).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {(boardData.won || []).length === 0 ? (
                  <div className="text-center py-8 text-emerald-500/80 text-xs">Chưa có hợp đồng chốt deal thành công</div>
                ) : (boardData.won || []).map((item: any) => (
                  <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-200 dark:border-emerald-700/50 shadow-sm">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-xs text-emerald-600 font-bold mt-1">{formatVND(Number(item.value) || 0)} • {item.capacity}</div>
                    <button 
                      onClick={() => navigate('/contracts')}
                      className="mt-3 w-full flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 rounded-md transition-colors"
                    >
                      <FileText size={10} /> Xem Hợp Đồng
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 5: Lost */}
            <div className="flex-shrink-0 w-80 bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-4 border border-rose-100 dark:border-rose-800/30 flex flex-col max-h-[600px] snap-center">
              <div className="flex items-center justify-between mb-4 px-1">
                <h4 className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Thua / Dừng (Lost)
                </h4>
                <span className="bg-rose-100 dark:bg-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold px-2 py-0.5 rounded-full">
                  {(boardData.lost || []).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {(boardData.lost || []).length === 0 ? (
                  <div className="text-center py-8 text-rose-400/80 text-xs">Chưa có lead thua</div>
                ) : (boardData.lost || []).map((item: any) => (
                  <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-200 dark:border-rose-700/50 shadow-sm opacity-80">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-xs text-rose-600 font-bold mt-1">{formatVND(Number(item.value) || 0)} • {item.capacity}</div>
                    <button
                      onClick={() => handleAdvanceStage(item, 'lead')}
                      className="mt-3 w-full flex items-center justify-center gap-1 bg-white hover:bg-rose-100 text-rose-700 text-[10px] font-bold py-1.5 rounded-lg border border-rose-200 transition-colors"
                    >
                      Mở lại Lead
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 4. MODAL: THÊM LEAD MỚI */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-cyan-600" /> Thêm Cơ Hội / Khách Hàng Tiềm Năng
              </h3>
              <button onClick={() => setIsAddLeadOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Khách Hàng / Nhà Máy *
                </label>
                <input
                  type="text"
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="VD: Nhà máy Dệt May Tân Bình Solar..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Công Suất Dự Kiến
                  </label>
                  <input
                    type="text"
                    value={leadCapacity}
                    onChange={(e) => setLeadCapacity(e.target.value)}
                    placeholder="VD: 500 kWp"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Giá Trị Ước Tính (VND)
                  </label>
                  <input
                    type="number"
                    value={leadValue}
                    onChange={(e) => setLeadValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Thông Tin Liên Hệ (SĐT / Email)
                </label>
                <input
                  type="text"
                  value={leadContact}
                  onChange={(e) => setLeadContact(e.target.value)}
                  placeholder="VD: 0912.345.678 (Mr. An)"
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Giai Đoạn Ban Đầu
                </label>
                <select
                  value={leadStage}
                  onChange={(e) => setLeadStage(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="lead">Tiếp cận ban đầu</option>
                  <option value="qualified">Khảo sát & đủ điều kiện</option>
                  <option value="quote">Đang báo giá & đàm phán</option>
                  <option value="won">Chốt deal thành công (Won)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddLeadOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Tạo Cơ Hội'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM BẢN BÁO GIÁ */}
      {isAddQuoteOpen && quoteLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-amber-600 to-orange-700 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileText size={18} /> Báo Giá v{quotesOf(quoteLead.id).length + 1} — {quoteLead.name}
              </h3>
              <button onClick={() => { setIsAddQuoteOpen(false); setQuoteLead(null); }} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateQuote} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Giá Trị Báo Giá (VNĐ) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="VD: 8200000000"
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Cấu Hình / Thiết Bị Báo Giá
                </label>
                <textarea
                  rows={3}
                  value={quoteItems}
                  onChange={(e) => setQuoteItems(e.target.value)}
                  placeholder="VD: 500x AIKO 650Wp + 5x SAJ C6-100K + tủ AC/DC..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => { setIsAddQuoteOpen(false); setQuoteLead(null); }}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Bản Báo Giá'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: BẢNG TÍNH HOA HỒNG KINH DOANH */}
      {isCommissionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Award size={20} /> Bộ Tính Hoa Hồng Nhân Viên Kinh Doanh
              </h3>
              <button onClick={() => setIsCommissionOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Giá Trị Hợp Đồng Dự Kiến (VND)
                </label>
                <input
                  type="number"
                  step={50000000}
                  value={calcContractValue}
                  onChange={(e) => setCalcContractValue(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm font-bold border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Tương đương: {formatVND(numCalcValue)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Biên Lợi Nhuận Gộp (%)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    value={calcMarginPct}
                    onChange={(e) => setCalcMarginPct(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Tỷ Lệ Thưởng Commission (%)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    value={calcCommRate}
                    onChange={(e) => setCalcCommRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* RESULTS CARD */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Ước Tính Lợi Nhuận Gộp:</span>
                  <span className="font-black text-sm text-slate-900 dark:text-white">{formatVND(estimatedGrossProfit)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-emerald-200 dark:border-emerald-800/40 pt-3">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">Hoa Hồng Thực Nhận:</span>
                  <span className="font-black text-xl text-emerald-600 dark:text-emerald-400">{formatVND(estimatedCommission)}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setIsCommissionOpen(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  Đóng Bảng Tính
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
