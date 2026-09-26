import React, { useState } from 'react';
import { Landmark, X, CheckCircle2, AlertCircle, FileText, Send, ChevronRight, DollarSign } from 'lucide-react';
import { Button } from '../UI';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface MilestonePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MilestonePaymentModal: React.FC<MilestonePaymentModalProps> = ({ isOpen, onClose }) => {
  const { saveTask, projects } = useData();
  const { showToast } = useNotifications();

  const [selectedProject, setSelectedProject] = useState('P-EPC-1049');
  const [milestone, setMilestone] = useState<'dot_1' | 'dot_2' | 'dot_3' | 'dot_4' | 'dot_5'>('dot_2');
  const [invoiceAmount, setInvoiceAmount] = useState<number>(4500000000); // 4.5 Tỷ
  const [note, setNote] = useState('Đã nghiệm thu giao hàng đợt 1 bao gồm: 850 tấm pin AIKO 650Wp và 5 Biến tần SAJ C6-100K tại kho công trường.');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const milestoneNames = {
    'dot_1': 'Đợt 1 (30%) - Tạm Ứng Ký Hợp Đồng EPC',
    'dot_2': 'Đợt 2 (40%) - Tập Kết Vật Tư Pin AIKO & SAJ',
    'dot_3': 'Đợt 3 (20%) - Hoàn Thành Lắp Đặt & Kéo Cáp DC',
    'dot_4': 'Đợt 4 (5%) - Đóng Điện Hòa Lưới EVN (COD)',
    'dot_5': 'Đợt 5 (5%) - Quyết Toán Bảo Hành Tạm Giữ'
  };

  const projectOptions = projects.map(p => ({
    id: p.projectCode,
    name: p.name,
    client: 'Chủ Đầu Tư Nội Bộ'
  }));
  // Fallback defaults if no projects loaded
  if (projectOptions.length === 0) {
    projectOptions.push(
      { id: 'P-EPC-1049', name: 'Nhà máy May Việt Tiến', client: 'Việt Tiến' },
      { id: 'P-EPC-1050', name: 'KCN Long Đức (1.2MWp)', client: 'KCN Long Đức' }
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const projName = projectOptions.find(p => p.id === selectedProject)?.name || selectedProject;
      
      await saveTask({
        id: `pay-${Date.now()}`,
        title: `[Yêu Cầu Xuất Hóa Đơn] ${milestoneNames[milestone]} - ${projName}`,
        description: `CHỈ THỊ KÍCH HOẠT THANH TOÁN THEO TIẾN ĐỘ EPC:\n` +
          `• Dự án: ${projName} (${selectedProject})\n` +
          `• Giai đoạn: ${milestoneNames[milestone]}\n` +
          `• Giá trị đề nghị xuất HĐ: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoiceAmount)}\n` +
          `• Ghi chú Kỹ sư / Giám đốc dự án: ${note}\n\n` +
          `Kế toán vui lòng rà soát Biên bản nghiệm thu đính kèm trên hệ thống và phát hành Hóa đơn VAT điện tử gửi Chủ đầu tư trong hôm nay.`,
        status: 'todo' as any,
        priority: 'High' as any,
        departmentId: 'dept-fin',
        department: 'Phòng Tài Chính - Kế Toán',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Trong 24h
        tags: ['Payment', 'Invoice', 'EPC_Milestone'],
        _isNew: true
      } as any);

      setSuccessMsg(`✅ Yêu cầu xuất hóa đơn ${milestoneNames[milestone]} đã được gửi sang Kế toán!`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1800);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Lỗi tạo yêu cầu thanh toán: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-900 via-purple-900 to-slate-900 text-white p-6 flex items-center justify-between border-b border-violet-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-400">
              <Landmark size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Kích Hoạt Thanh Toán Theo Mốc Tiến Độ (Milestone Payment)</h2>
              </div>
              <p className="text-xs text-violet-200/80 mt-0.5">
                Xác nhận hoàn thành khối lượng thi công và yêu cầu Kế toán xuất hóa đơn thu tiền.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          <div className="space-y-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Dự Án Đang Thi Công (EPC):</label>
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="w-full px-3.5 py-2 font-semibold bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              >
                {projectOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Mốc Nghiệm Thu Kích Hoạt Thanh Toán:</label>
              <select
                value={milestone}
                onChange={(e: any) => setMilestone(e.target.value)}
                className="w-full px-3.5 py-2 font-bold bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl text-violet-700 dark:text-violet-400"
              >
                <option value="dot_1">{milestoneNames['dot_1']}</option>
                <option value="dot_2">{milestoneNames['dot_2']}</option>
                <option value="dot_3">{milestoneNames['dot_3']}</option>
                <option value="dot_4">{milestoneNames['dot_4']}</option>
                <option value="dot_5">{milestoneNames['dot_5']}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Giá Trị Yêu Cầu Xuất Hóa Đơn (VNĐ):</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign size={16} className="text-gray-400" />
                </div>
                <input
                  type="number"
                  value={invoiceAmount}
                  onChange={e => setInvoiceAmount(Number(e.target.value))}
                  className="w-full pl-9 pr-3.5 py-2.5 font-black bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-base"
                />
              </div>
              <p className="text-[11px] font-bold text-emerald-600 mt-1">
                (Bằng chữ: {new Intl.NumberFormat('vi-VN').format(invoiceAmount)} VNĐ)
              </p>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Căn Cứ Pháp Lý & Ghi Chú Đính Kèm:</label>
            <textarea
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl font-medium text-gray-900 dark:text-white"
              placeholder="Ghi chú các hồ sơ đã nghiệm thu..."
            />
            <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500 font-medium">
              <FileText size={14} className="text-gray-400" />
              Tự động đính kèm Biên bản nghiệm thu hiện trường & Khối lượng hoàn thành từ Nhật trình EPC.
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              Hủy Bỏ
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md"
            >
              <Send size={14} className="mr-1.5" /> Xác Nhận & Gửi Kế Toán (Finance)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
