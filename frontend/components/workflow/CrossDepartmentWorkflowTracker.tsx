import React, { useState } from 'react';
import { 
  Building2, HardHat, Package, CheckCircle2, ArrowRight, 
  Settings, PenTool, TrendingUp, ShieldCheck, FileText, Zap
} from 'lucide-react';

const WORKFLOW_STAGES = [
  { id: 'sales', label: 'Kinh Doanh', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-200 dark:border-blue-800', desc: 'Chốt HĐ, Thu Tiền' },
  { id: 'tech', label: 'Kỹ Thuật', icon: PenTool, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/40', border: 'border-indigo-200 dark:border-indigo-800', desc: 'Thiết kế BOM & SLD' },
  { id: 'epc', label: 'Dự Án EPC', icon: HardHat, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-200 dark:border-amber-800', desc: 'Lập Kế Hoạch & Thi Công' },
  { id: 'procurement', label: 'Mua Hàng', icon: Package, color: 'text-fuchsia-500', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', border: 'border-fuchsia-200 dark:border-fuchsia-800', desc: 'Tạo PO, Đặt Hàng' },
  { id: 'warehouse', label: 'Kho Vận', icon: Building2, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-200 dark:border-rose-800', desc: 'Xuất/Nhập Serial' },
  { id: 'om', label: 'O&M', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-200 dark:border-emerald-800', desc: 'Bảo Hành & Bảo Trì' },
];

export const CrossDepartmentWorkflowTracker: React.FC = () => {
  const [activeStage, setActiveStage] = useState<string>('tech');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings size={18} className="text-gray-500" />
            Luồng Quy Trình Cốt Lõi (Core Cross-Department Workflow)
          </h2>
          <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ tự động chuyển tiếp dữ liệu và sinh phiếu yêu cầu giữa các phòng ban.</p>
        </div>
        <div className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
          Trạng Thái: Active
        </div>
      </div>

      <div className="p-6">
        {/* Stages Timeline */}
        <div className="flex items-center justify-between relative mb-12">
          {/* Connector Line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-slate-700 -z-10 rounded-full"></div>
          
          {WORKFLOW_STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = activeStage === stage.id;
            
            return (
              <div 
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`relative flex flex-col items-center gap-3 cursor-pointer group transition-all ${isActive ? 'scale-110' : 'hover:scale-105'}`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 ${isActive ? `border-white dark:border-slate-800 shadow-lg ${stage.bg}` : 'border-white dark:border-slate-800 bg-gray-100 dark:bg-slate-800 shadow-sm'}`}>
                  <Icon size={24} className={isActive ? stage.color : 'text-gray-400 dark:text-slate-500'} />
                </div>
                
                <div className="text-center absolute top-16 w-32">
                  <div className={`text-[11px] font-extrabold uppercase tracking-wider ${isActive ? stage.color : 'text-gray-500'}`}>
                    {stage.label}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">
                    {stage.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stage Details Panel */}
        <div className="mt-8 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${WORKFLOW_STAGES.find(s => s.id === activeStage)?.bg}`}>
              {React.createElement(WORKFLOW_STAGES.find(s => s.id === activeStage)?.icon || FileText, {
                size: 24,
                className: WORKFLOW_STAGES.find(s => s.id === activeStage)?.color
              })}
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Trình Kích Hoạt (Triggers) - {WORKFLOW_STAGES.find(s => s.id === activeStage)?.label}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Các quy tắc tự động hóa được gán cho trạm quy trình này.</p>
              </div>

              {activeStage === 'sales' && (
                <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi Hợp đồng ký xong $\rightarrow$ Tạo Request Khảo sát cho Kỹ thuật.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi Khách thanh toán cọc $\rightarrow$ Thông báo cho Kế toán & Ban GĐ.</li>
                </ul>
              )}

              {activeStage === 'tech' && (
                <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi Bản vẽ PVSyst duyệt $\rightarrow$ Tạo BOM Dự án.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi chốt BOM $\rightarrow$ Tự động sinh `Purchase Request` gửi Mua Hàng & sinh `Project` cho EPC.</li>
                </ul>
              )}

              {activeStage === 'procurement' && (
                <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi PO được duyệt $\rightarrow$ Cập nhật ngày dự kiến hàng về.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi Hàng đang đi đường $\rightarrow$ Gắn task chuẩn bị Nhập Kho cho Warehouse.</li>
                </ul>
              )}

              {activeStage === 'warehouse' && (
                <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi hàng nhập đủ $\rightarrow$ Báo Notification cho EPC có thể xuất vật tư.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi xuất Pin/Inverter $\rightarrow$ Tự động lưu Serial Number vào hồ sơ Bảo hành.</li>
                </ul>
              )}

              {activeStage === 'epc' && (
                <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi Milestones hoàn thành $\rightarrow$ Báo Kế toán xuất hóa đơn thanh toán.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi Commissioning xong $\rightarrow$ Chuyển giao trạng thái dự án sang O&M.</li>
                </ul>
              )}

              {activeStage === 'om' && (
                <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Sinh tự động Lịch bảo trì 3 tháng / lần cho Hệ thống.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Tự động check Ticket lỗi từ khách hàng để phân phối Task sự cố.</li>
                </ul>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
