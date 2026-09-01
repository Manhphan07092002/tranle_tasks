import React, { useState, useEffect } from 'react';
import { 
  Landmark, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, 
  FileText, CheckCircle2, XCircle, Search, Filter, Bell,
  Download, FileSpreadsheet, CreditCard, Receipt, Loader2, Plus, X
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { MilestonePaymentModal } from '../../../components/finance/MilestonePaymentModal';
import { ArAgingDetailModal } from '../../../components/finance/ArAgingDetailModal';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';
import { useAuth } from '../../../contexts/AuthContext';

export const FinanceWorkspace: React.FC = () => {
  const { user, isAdmin, isDirector, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState<'ap' | 'ar'>('ap');
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [isArAgingOpen, setIsArAgingOpen] = useState(false);
  
  const [apRecords, setApRecords] = useState<any[]>([]);
  const [arRecords, setArRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ pendingApAmount: 0, pendingApCount: 0, pendingArAmount: 0, pendingArCount: 0 });

  // Modal State
  const [isAddApOpen, setIsAddApOpen] = useState(false);
  const [isAddArOpen, setIsAddArOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AP Form
  const [apDept, setApDept] = useState('P. Mua Hàng & Cung Ứng');
  const [apDesc, setApDesc] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apVendor, setApVendor] = useState('');

  // AR Form
  const [arProject, setArProject] = useState('');
  const [arCustomer, setArCustomer] = useState('');
  const [arDesc, setArDesc] = useState('');
  const [arAmount, setArAmount] = useState('');
  const [arDueDate, setArDueDate] = useState(new Date().toISOString().split('T')[0]);

  const formatTy = (num: number) => (num / 1e9).toFixed(2);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ap') {
        const data = await departmentWorkspaceService.getRecords('dept-finance', 'ap');
        setApRecords(data);
      } else if (activeTab === 'ar') {
        const data = await departmentWorkspaceService.getRecords('dept-finance', 'ar');
        setArRecords(data);
      }
    } catch (err) {
      console.error('Error fetching finance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    departmentWorkspaceService.getKpis('dept-finance').then(setKpis).catch(console.error);
  }, []);

  useEffect(() => {
    fetchFinanceData();
  }, [activeTab]);

  const handleCreateAp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apDesc.trim() || !apVendor.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-finance', 'ap', {
        dept: apDept,
        desc_text: apDesc.trim(),
        amount: apAmount,
        vendor: apVendor.trim(),
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
      });
      setIsAddApOpen(false);
      setApDesc('');
      setApVendor('');
      fetchFinanceData();
    } catch (err) {
      console.error('Error creating AP:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arProject.trim() || !arCustomer.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-finance', 'ar', {
        project: arProject.trim(),
        customer: arCustomer.trim(),
        desc_text: arDesc,
        amount: arAmount,
        dueDate: arDueDate,
        status: 'pending'
      });
      setIsAddArOpen(false);
      setArProject('');
      setArCustomer('');
      fetchFinanceData();
    } catch (err) {
      console.error('Error creating AR:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. HEADER & DASHBOARD */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden border border-blue-900/50">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-900/50 rounded-xl border border-blue-700/50 backdrop-blur-sm">
                <Landmark className="text-amber-400" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Finance & Accounting</h2>
            </div>
            <p className="text-blue-200/80 text-sm max-w-2xl leading-relaxed">
              Trung tâm Quản trị Tài chính. Kiểm soát luồng tiền Cashflow, Công nợ phải thu (AR) / Phải trả (AP), Phát hành Hóa đơn VAT và Kế toán dự án.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsAddApOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-xs px-4 py-2.5 shadow-lg rounded-xl transition-all"
            >
              <Plus size={16} className="mr-1.5" /> Lập Lệnh Chi (AP)
            </Button>
            <Button
              onClick={() => setIsAddArOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 shadow-lg rounded-xl transition-all"
            >
              <Plus size={16} className="mr-1.5" /> Ghi Nhận Phải Thu (AR)
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Phải Thu Khách Hàng (AR)</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">
            {arRecords.length} <span className="text-lg font-medium text-slate-500">khoản phải thu</span>
          </div>
          <div className="text-xs text-emerald-600 font-bold mt-2">
            Thu tiền theo các mốc nghiệm thu hợp đồng EPC
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Phải Trả Nhà Cung Cấp / Thầu Phụ (AP)</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg text-rose-600">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">
            {apRecords.length} <span className="text-lg font-medium text-slate-500">lệnh chi</span>
          </div>
          <div className="text-xs text-rose-500 font-bold mt-2">
            Ủy nhiệm chi thanh toán vật tư tấm pin, biến tần
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[500px]">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 px-6 pt-4 gap-2">
          <button 
            onClick={() => setActiveTab('ap')}
            className={`px-6 py-3 text-sm font-bold rounded-t-2xl transition-colors flex items-center gap-2 ${
              activeTab === 'ap' 
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-t border-l border-r border-gray-200 dark:border-slate-700 -mb-[1px]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <CreditCard size={16} /> Lệnh Chi Tiền & Phải Trả AP ({apRecords.length})
          </button>
          <button 
            onClick={() => setActiveTab('ar')}
            className={`px-6 py-3 text-sm font-bold rounded-t-2xl transition-colors flex items-center gap-2 ${
              activeTab === 'ar' 
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border-t border-l border-r border-gray-200 dark:border-slate-700 -mb-[1px]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Receipt size={16} /> Thu Hồi Công Nợ AR ({arRecords.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin text-blue-600" size={28} />
              <span className="text-xs">Đang tải dữ liệu Kế toán...</span>
            </div>
          ) : activeTab === 'ap' ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh Sách Lệnh Chi Thanh Toán (AP)</span>
                <Button size="sm" onClick={() => setIsAddApOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl">
                  <Plus size={14} className="mr-1" /> Lập Lệnh Chi Mới
                </Button>
              </div>

              {apRecords.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">Chưa có đề xuất thanh toán AP nào</div>
              ) : (
                apRecords.map(ap => (
                  <div key={ap.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{ap.desc_text}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Đối tượng: {ap.vendor} • Phòng ban: {ap.dept}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-rose-600">{ap.amount}</div>
                      <div className="text-[11px] text-slate-400">{ap.date}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh Sách Các Khoản Thu Hồi Công Nợ (AR)</span>
                <Button size="sm" onClick={() => setIsAddArOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                  <Plus size={14} className="mr-1" /> Ghi Nhận Khoản Thu
                </Button>
              </div>

              {arRecords.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">Chưa có khoản phải thu AR nào</div>
              ) : (
                arRecords.map(ar => (
                  <div key={ar.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">Dự án: {ar.project}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Khách hàng: {ar.customer} • {ar.desc_text}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-emerald-600">{ar.amount}</div>
                      <div className="text-[11px] text-slate-400">Hạn TT: {ar.dueDate}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: LẬP LỆNH CHI AP */}
      {isAddApOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <CreditCard size={18} /> Lập Lệnh Thanh Toán Ủy Nhiệm Chi (AP)
              </h3>
              <button onClick={() => setIsAddApOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateAp} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nội Dung Thanh Toán *
                </label>
                <input
                  type="text"
                  required
                  value={apDesc}
                  onChange={(e) => setApDesc(e.target.value)}
                  placeholder="VD: Thanh toán đợt 1 tiền mua tấm pin AIKO 650Wp..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Nhà Cung Cấp / Đối Tác
                  </label>
                  <input
                    type="text"
                    required
                    value={apVendor}
                    onChange={(e) => setApVendor(e.target.value)}
                    placeholder="VD: Hãng SAJ Electric..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Số Tiền Chi
                  </label>
                  <input
                    type="text"
                    value={apAmount}
                    onChange={(e) => setApAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Phòng Ban Đề Xuất
                </label>
                <select
                  value={apDept}
                  onChange={(e) => setApDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="P. Mua Hàng & Cung Ứng">P. Mua Hàng & Cung Ứng</option>
                  <option value="Khối Tổng Thầu EPC">Khối Tổng Thầu EPC</option>
                  <option value="Trung Tâm Dịch Vụ O&M">Trung Tâm Dịch Vụ O&M</option>
                  <option value="P. Hành Chính Nhân Sự">P. Hành Chính Nhân Sự</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddApOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lập Lệnh Chi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GHI NHẬN AR */}
      {isAddArOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Receipt size={18} /> Ghi Nhận Khoản Thu Hồi Công Nợ (AR)
              </h3>
              <button onClick={() => setIsAddArOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateAr} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Mã / Tên Dự Án *
                </label>
                <input
                  type="text"
                  required
                  value={arProject}
                  onChange={(e) => setArProject(e.target.value)}
                  placeholder="VD: Solar Farm Ninh Thuận 5 MWp..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Khách Hàng / Doanh Nghiệp
                </label>
                <input
                  type="text"
                  required
                  value={arCustomer}
                  onChange={(e) => setArCustomer(e.target.value)}
                  placeholder="VD: Tập đoàn Dệt May Tân Bình..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Số Tiền Phải Thu
                  </label>
                  <input
                    type="text"
                    value={arAmount}
                    onChange={(e) => setArAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Hạn Thanh Toán
                  </label>
                  <input
                    type="date"
                    value={arDueDate}
                    onChange={(e) => setArDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddArOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Khoản Thu'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <MilestonePaymentModal
        isOpen={isMilestoneOpen}
        onClose={() => setIsMilestoneOpen(false)}
      />
      <ArAgingDetailModal
        isOpen={isArAgingOpen}
        onClose={() => setIsArAgingOpen(false)}
      />
    </div>
  );
};
