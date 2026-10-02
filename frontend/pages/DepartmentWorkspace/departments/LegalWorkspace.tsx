import React, { useState, useEffect } from 'react';
import { 
  Scale, FileText, CheckSquare, BookOpen, AlertCircle, Clock, 
  ShieldAlert, PenTool, Search, Briefcase, Users, FileSignature, 
  CheckCircle2, Loader2, Plus, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/UI';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';
import { useNotifications } from '../../../contexts/NotificationContext';

interface LegalWorkspaceProps {
  contracts?: any[];
}

export const LegalWorkspace: React.FC<LegalWorkspaceProps> = ({ contracts: propContracts }) => {
  const navigate = useNavigate();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<'contracts' | 'approvals' | 'library'>('contracts');

  const [contracts, setContracts] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ pendingApprovals: 0, totalContracts: 0 });
  const [accessDenied, setAccessDenied] = useState(false);

  // Modal State
  const [isAddContractOpen, setIsAddContractOpen] = useState(false);
  const [isAddApprovalOpen, setIsAddApprovalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contract Form
  const [contractTitle, setContractTitle] = useState('');
  const [contractPartner, setContractPartner] = useState('');
  const [contractType, setContractType] = useState('Hợp đồng EPC Solar');
  const [contractValue, setContractValue] = useState('');
  const [contractExpiry, setContractExpiry] = useState('');

  // Approval Form
  const [approvalTitle, setApprovalTitle] = useState('');
  const [approvalEntity, setApprovalEntity] = useState('');
  const [approvalRequester, setApprovalRequester] = useState('');
  const [approvalUrgency, setApprovalUrgency] = useState('HIGH');

  // Library Form
  const [isAddLibraryOpen, setIsAddLibraryOpen] = useState(false);
  const [libTitle, setLibTitle] = useState('');
  const [libCategory, setLibCategory] = useState('Biểu mẫu ISO');
  const [libDate, setLibDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchLegalData = async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const [contractData, approvalData, libraryData, freshKpis] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-legal', 'contracts'),
        departmentWorkspaceService.getRecords('dept-legal', 'approvals'),
        departmentWorkspaceService.getRecords('dept-legal', 'library'),
        departmentWorkspaceService.getKpis('dept-legal')
      ]);
      // Guard mảng để UI .map không bao giờ crash kể cả khi API trả hình dạng lạ.
      setContracts(Array.isArray(contractData) ? contractData : []);
      setApprovals(Array.isArray(approvalData) ? approvalData : []);
      setLibrary(Array.isArray(libraryData) ? libraryData : []);
      if (freshKpis && typeof freshKpis === 'object') setKpis(freshKpis);
    } catch (err: any) {
      if (err?.status === 403) setAccessDenied(true);
      console.error('Error fetching legal records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegalData();
  }, []);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractTitle.trim() || !contractPartner.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-legal', 'contracts', {
        title: contractTitle.trim(),
        partner: contractPartner.trim(),
        type: contractType,
        value: contractValue,
        status: 'active',
        expiry: contractExpiry
      });
      setIsAddContractOpen(false);
      setContractTitle('');
      setContractPartner('');
      setContractValue('');
      setContractExpiry('');
      fetchLegalData();
    } catch (err) {
      console.error('Error creating contract:', err);
      showToast({ type: 'error', title: 'Lưu hợp đồng thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Workflow thẩm định: Đang thẩm định -> Đạt / Yêu cầu bổ sung / Trả về.
  const handleApprovalStep = async (app: any, step: string) => {
    try {
      await departmentWorkspaceService.updateRecord('dept-legal', 'approvals', app.id, {
        ...app,
        step
      });
      fetchLegalData();
    } catch (err) {
      console.error('Error updating approval step:', err);
      showToast({ type: 'error', title: 'Cập nhật thẩm định thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const approvalStepMeta = (step: string) => {
    if (step === 'Đạt') return 'bg-emerald-100 text-emerald-800';
    if (step === 'Trả về') return 'bg-rose-100 text-rose-700';
    if (step === 'Yêu cầu bổ sung') return 'bg-blue-100 text-blue-700';
    return 'bg-amber-100 text-amber-800';
  };

  const handleCreateApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalTitle.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-legal', 'approvals', {
        title: approvalTitle.trim(),
        entity: approvalEntity,
        requester: approvalRequester,
        step: 'Đang thẩm định',
        urgency: approvalUrgency
      });
      setIsAddApprovalOpen(false);
      setApprovalTitle('');
      setApprovalEntity('');
      setApprovalRequester('');
      setApprovalUrgency('HIGH');
      fetchLegalData();
    } catch (err) {
      console.error('Error submitting approval:', err);
      showToast({ type: 'error', title: 'Gửi thẩm định thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libTitle.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-legal', 'library', {
        title: libTitle.trim(),
        category: libCategory,
        date: libDate || new Date().toISOString().slice(0, 10)
      });
      setIsAddLibraryOpen(false);
      setLibTitle('');
      setLibCategory('Biểu mẫu ISO');
      setLibDate(new Date().toISOString().slice(0, 10));
      fetchLegalData();
    } catch (err) {
      console.error('Error creating library doc:', err);
      showToast({ type: 'error', title: 'Lưu văn bản thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {accessDenied && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm font-semibold">
          <ShieldAlert size={18} className="flex-shrink-0" />
          <span>Bạn không có quyền xem dữ liệu Pháp chế. Vui lòng liên hệ Trưởng phòng hoặc Quản trị viên để được cấp quyền.</span>
        </div>
      )}
      {/* 1. HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-gray-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute right-0 top-0 w-96 h-96 bg-slate-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-slate-700/40 rounded-xl border border-slate-600/50 backdrop-blur-sm">
                <Scale className="text-slate-300" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Pháp Chế & Hợp Đồng</h2>
            </div>
            <p className="text-slate-300/80 text-sm max-w-2xl leading-relaxed">
              Quản lý vòng đời hợp đồng, thẩm định rủi ro pháp lý, kiểm soát tuân thủ quy chuẩn kỹ thuật/PCCC và lưu trữ hồ sơ pháp quy doanh nghiệp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsAddContractOpen(true)}
              className="bg-white hover:bg-gray-100 text-slate-900 font-black text-xs px-4 py-2.5 shadow-lg rounded-xl transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Thêm Hợp Đồng Mới
            </Button>
            <Button
              onClick={() => setIsAddApprovalOpen(true)}
              className="bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600/50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all backdrop-blur-md flex items-center gap-2"
            >
              <FileSignature size={16} /> Trình Thẩm Định
            </Button>
          </div>
        </div>
      </div>

      {/* KPI strip (server) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 px-5 py-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase">Hợp đồng theo dõi</span>
          <span className="text-2xl font-black text-slate-800 dark:text-white">{kpis.totalContracts ?? contracts.length}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 px-5 py-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase">Thẩm định chờ xử lý</span>
          <span className="text-2xl font-black text-amber-600">{kpis.pendingApprovals ?? approvals.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'contracts'
              ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Briefcase size={18} />
          Sổ Hợp Đồng ({contracts.length})
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'approvals'
              ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'
          }`}
        >
          <CheckSquare size={18} />
          Thẩm Định Pháp Lý ({approvals.length})
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'library'
              ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'
          }`}
        >
          <BookOpen size={18} />
          Thư Viện Pháp Quy ({library.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="animate-spin text-slate-600" size={28} />
            <span className="text-xs">Đang tải dữ liệu Pháp chế...</span>
          </div>
        ) : activeTab === 'contracts' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Sổ Theo Dõi Hợp Đồng Doanh Nghiệp
              </h3>
              <Button size="sm" onClick={() => setIsAddContractOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl">
                <Plus size={14} className="mr-1" /> Thêm Hợp Đồng
              </Button>
            </div>

            {contracts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">Chưa có hợp đồng nào trong sổ theo dõi</div>
            ) : (
              <div className="space-y-3">
                {contracts.map(c => (
                  <div key={c.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{c.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Đối tác: <span className="font-semibold text-slate-700 dark:text-slate-200">{c.partner}</span> • Loại: {c.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-slate-900 dark:text-white">{c.value}</div>
                      <div className="text-[11px] text-slate-400">Hết hạn: {c.expiry}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'approvals' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Tờ Trình Thẩm Định Rủi Ro & Điều Khoản Hợp Đồng
              </h3>
              <Button size="sm" onClick={() => setIsAddApprovalOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl">
                <Plus size={14} className="mr-1" /> Trình Thẩm Định Mới
              </Button>
            </div>

            {approvals.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">Không có yêu cầu thẩm định nào</div>
            ) : (
              <div className="space-y-3">
                {approvals.map(app => (
                  <div key={app.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{app.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Đơn vị trình: {app.requester} • Dự án: {app.entity} • Khẩn: {app.urgency}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${approvalStepMeta(app.step)}`}>
                        {app.step}
                      </span>
                    </div>
                    {app.step !== 'Đạt' && app.step !== 'Trả về' && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleApprovalStep(app, 'Đạt')} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                          Đạt
                        </button>
                        <button onClick={() => handleApprovalStep(app, 'Yêu cầu bổ sung')} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200">
                          Yêu cầu bổ sung
                        </button>
                        <button onClick={() => handleApprovalStep(app, 'Trả về')} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-rose-600 border border-rose-200">
                          Trả về
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Thư Viện Văn Bản Pháp Quy & Biểu Mẫu
              </h3>
              <Button size="sm" onClick={() => setIsAddLibraryOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl">
                <Plus size={14} className="mr-1" /> Thêm Văn Bản
              </Button>
            </div>

            {library.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">Chưa có văn bản pháp quy nào trong thư viện</div>
            ) : (
              <div className="space-y-3">
                {library.map((doc: any) => (
                  <div key={doc.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{doc.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Phân loại: <span className="font-semibold text-slate-700 dark:text-slate-200">{doc.category}</span></div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                      {doc.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: THÊM HỢP ĐỒNG */}
      {isAddContractOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Briefcase size={18} /> Thêm Hợp Đồng Mới
              </h3>
              <button onClick={() => setIsAddContractOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Hợp Đồng / Thỏa Thuận *
                </label>
                <input
                  type="text"
                  required
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  placeholder="VD: Hợp đồng Tổng thầu EPC Solar Nhà máy Dệt Tân Bình..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Đối Tác Ký Kết
                  </label>
                  <input
                    type="text"
                    required
                    value={contractPartner}
                    onChange={(e) => setContractPartner(e.target.value)}
                    placeholder="VD: Tập đoàn Dệt May..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Loại Hợp Đồng
                  </label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="Hợp đồng EPC Solar">Hợp đồng EPC Solar</option>
                    <option value="Hợp đồng Mua bán Thiết bị">Hợp đồng Mua bán Thiết bị</option>
                    <option value="Hợp đồng Dịch vụ O&M">Hợp đồng Dịch vụ O&M</option>
                    <option value="Hợp đồng Thuê thầu phụ">Hợp đồng Thuê thầu phụ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Giá Trị (VNĐ)
                  </label>
                  <input
                    type="text"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Ngày Hết Hạn
                  </label>
                  <input
                    type="date"
                    value={contractExpiry}
                    onChange={(e) => setContractExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddContractOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-slate-800 hover:bg-slate-900 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Hợp Đồng'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRÌNH THẨM ĐỊNH */}
      {isAddApprovalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileSignature size={18} /> Trình Thẩm Định Pháp Lý Hợp Đồng
              </h3>
              <button onClick={() => setIsAddApprovalOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateApproval} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nội Dung Trình Thẩm Định *
                </label>
                <input
                  type="text"
                  required
                  value={approvalTitle}
                  onChange={(e) => setApprovalTitle(e.target.value)}
                  placeholder="VD: Rà soát điều khoản bảo hành & phạt trễ hạn EPC..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Dự Án / Hợp Đồng
                  </label>
                  <input
                    type="text"
                    value={approvalEntity}
                    onChange={(e) => setApprovalEntity(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Đơn Vị Trình
                  </label>
                  <input
                    type="text"
                    value={approvalRequester}
                    onChange={(e) => setApprovalRequester(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Mức Độ Khẩn
                  </label>
                  <select
                    value={approvalUrgency}
                    onChange={(e) => setApprovalUrgency(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Khẩn</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddApprovalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-slate-800 hover:bg-slate-900 text-white font-bold">
                  {isSubmitting ? 'Đang gửi...' : 'Gửi Thẩm Định'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM VĂN BẢN THƯ VIỆN */}
      {isAddLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <BookOpen size={18} /> Thêm Văn Bản Pháp Quy
              </h3>
              <button onClick={() => setIsAddLibraryOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateLibrary} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Văn Bản / Biểu Mẫu *
                </label>
                <input
                  type="text"
                  required
                  value={libTitle}
                  onChange={(e) => setLibTitle(e.target.value)}
                  placeholder="VD: Luật Điện lực 2024, Mẫu HĐ EPC..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Phân Loại
                  </label>
                  <select
                    value={libCategory}
                    onChange={(e) => setLibCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="Biểu mẫu ISO">Biểu mẫu ISO</option>
                    <option value="Luật & Nghị định">Luật & Nghị định</option>
                    <option value="Hợp đồng mẫu">Hợp đồng mẫu</option>
                    <option value="PCCC & An toàn">PCCC & An toàn</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Ngày Ban Hành
                  </label>
                  <input
                    type="date"
                    value={libDate}
                    onChange={(e) => setLibDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddLibraryOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-slate-800 hover:bg-slate-900 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Văn Bản'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
