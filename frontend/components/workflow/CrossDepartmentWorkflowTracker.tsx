import React, { useState, useEffect } from 'react';
import {
  Building2, HardHat, Package, CheckCircle2, ArrowRight,
  Settings, PenTool, TrendingUp, ShieldCheck, FileText, Zap
} from 'lucide-react';
import { departmentWorkspaceService } from '../../services/departmentWorkspaceService';

const WORKFLOW_STAGES = [
  { id: 'sales', label: 'Kinh Doanh', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-200 dark:border-blue-800', desc: 'Chốt HĐ, Thu Tiền', deptId: 'dept-sales' },
  { id: 'tech', label: 'Kỹ Thuật', icon: PenTool, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/40', border: 'border-indigo-200 dark:border-indigo-800', desc: 'Thiết kế BOM & SLD', deptId: 'dept-eng' },
  { id: 'epc', label: 'Dự Án EPC', icon: HardHat, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-200 dark:border-amber-800', desc: 'Lập Kế Hoạch & Thi Công', deptId: 'dept-epc' },
  { id: 'procurement', label: 'Mua Hàng', icon: Package, color: 'text-fuchsia-500', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', border: 'border-fuchsia-200 dark:border-fuchsia-800', desc: 'Tạo PO, Đặt Hàng', deptId: 'dept-proc' },
  { id: 'warehouse', label: 'Kho Vận', icon: Building2, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-200 dark:border-rose-800', desc: 'Xuất/Nhập Serial', deptId: 'dept-wh' },
  { id: 'om', label: 'O&M', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-200 dark:border-emerald-800', desc: 'Bảo Hành & Bảo Trì', deptId: 'dept-om' },
];

// Số việc chờ xử lý theo trạm — đọc trực tiếp KPI từng phòng ban (số thật, không hardcode).
function pendingOf(stageId: string, kpis: Record<string, any>): number | null {
  const k = kpis[stageId];
  if (!k) return null;
  switch (stageId) {
    case 'sales':
      return (k.totalLeads ?? 0) - (k.wonLeads ?? 0);
    case 'tech':
      return k.pendingRequests ?? 0;
    case 'epc':
      return k.activeProjects ?? 0;
    case 'procurement':
      return (k.pendingPrs ?? 0) + (k.pendingPos ?? 0);
    case 'warehouse':
      return k.inboundToday ?? 0;
    case 'om':
      return k.activeAlarms ?? 0;
    default:
      return null;
  }
}

export const CrossDepartmentWorkflowTracker: React.FC = () => {
  const [activeStage, setActiveStage] = useState<string>('tech');
  const [kpis, setKpis] = useState<Record<string, any>>({});
  const [live, setLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const entries = await Promise.all(
          WORKFLOW_STAGES.map(async (s) => {
            try {
              const k = await departmentWorkspaceService.getKpis(s.deptId);
              return [s.id, k] as const;
            } catch {
              return [s.id, null] as const;
            }
          })
        );
        if (!mounted) return;
        const map: Record<string, any> = {};
        entries.forEach(([id, k]) => { if (k) map[id] = k; });
        setKpis(map);
        setLive(Object.keys(map).length > 0);
      } catch {
        setLive(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

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
        <div className={`px-3 py-1 text-xs font-bold rounded-lg border ${
          live
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : 'bg-gray-100 text-gray-500 border-gray-200'
        }`}>
          Trạng Thái: {live ? 'Active (số liệu trực tiếp)' : 'Ngoại tuyến'}
        </div>
      </div>

      <div className="p-6">
        {/* Stages Timeline */}
        <div className="flex items-center justify-between relative mb-12">
          {/* Connector Line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-slate-700 -z-10 rounded-full"></div>

          {WORKFLOW_STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeStage === stage.id;
            const pending = pendingOf(stage.id, kpis);

            return (
              <div
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`relative flex flex-col items-center gap-3 cursor-pointer group transition-all ${isActive ? 'scale-110' : 'hover:scale-105'}`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 ${isActive ? `border-white dark:border-slate-800 shadow-lg ${stage.bg}` : 'border-white dark:border-slate-800 bg-gray-100 dark:bg-slate-800 shadow-sm'}`}>
                  <Icon size={24} className={isActive ? stage.color : 'text-gray-400 dark:text-slate-500'} />
                </div>
                {pending !== null && pending > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center shadow">
                    {pending}
                  </span>
                )}

                <div className="text-center absolute top-16 w-32">
                  <div className={`text-[11px] font-extrabold uppercase tracking-wider ${isActive ? stage.color : 'text-gray-500'}`}>
                    {stage.label}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">
                    {stage.desc}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                    {pending === null ? '—' : `${pending} chờ xử lý`}
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
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi lead Won $\rightarrow$ Tạo Dự án + Request Khảo sát cho Kỹ thuật.</li>
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
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi PR được duyệt $\rightarrow$ Sinh PO nháp giữ liên kết PR (1-click).</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi PO phát hành $\rightarrow$ Báo nhập kho chờ cho Warehouse.</li>
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
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi Milestones hoàn thành $\rightarrow$ Tạo AR gửi Kế toán (nút Tạo AR, chống trùng).</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Khi Commissioning xong $\rightarrow$ Bàn giao O&M + chuyển dự án sang bảo hành.</li>
                </ul>
              )}

              {activeStage === 'om' && (
                <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Sinh tự động Lịch bảo trì 3 tháng / lần cho Hệ thống.</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Tự động check Ticket lỗi từ khách hàng để phân phối Task sự cố.</li>
                </ul>
              )}

              <button
                onClick={() => window.location.assign('/projects')}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                Xem dòng đời dự án <ArrowRight size={12} />
              </button>
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <ShieldCheck size={12} className="text-emerald-500" /> Mọi chuyển tiếp đều chống tạo trùng và bắn realtime.
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
