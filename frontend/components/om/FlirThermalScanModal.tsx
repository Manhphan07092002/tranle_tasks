import React, { useState } from 'react';
import { Activity, X, CheckCircle2, AlertTriangle, Send, Thermometer, Flame, Eye } from 'lucide-react';
import { Button } from '../UI';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface FlirThermalScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlirThermalScanModal: React.FC<FlirThermalScanModalProps> = ({ isOpen, onClose }) => {
  const { saveTask } = useData();
  const { showToast } = useNotifications();

  const [reportCode] = useState(`FLIR-2026-TH-${Math.floor(100 + Math.random() * 900)}`);
  const [siteName, setSiteName] = useState('Nhà máy May Việt Tiến (1.2 MWp)');
  const [cameraModel, setCameraModel] = useState('FLIR T540 (Độ phân giải nhiệt 464x348)');
  const [solarIrradiance, setSolarIrradiance] = useState('840 W/m²');
  const [ambientTemp, setAmbientTemp] = useState('34.5°C');

  // Hotspot Finding
  const [locationTag, setLocationTag] = useState('Mái Nhà Xưởng B — String DC 04 — Tấm Pin #18 (AIKO 650Wp)');
  const [maxTemp, setMaxTemp] = useState<number>(68.5); // °C
  const [bgTemp, setBgTemp] = useState<number>(44.0); // °C
  const deltaT = Number((maxTemp - bgTemp).toFixed(1));

  const [defectType, setDefectType] = useState<'hotspot_cell' | 'diode_bypass' | 'mc4_connector' | 'soiling'>('hotspot_cell');
  const [recommendation, setRecommendation] = useState('Phát hiện 01 điểm Hotspot nghiêm trọng (ΔT = 24.5°C) do nứt ẩn vi mô Cell pin. Khuyến nghị thay thế tấm pin AIKO 650Wp mới theo diện bảo hành 30 năm để tránh nguy cơ suy giảm sản lượng và cháy nổ.');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const defectNames: Record<string, string> = {
    'hotspot_cell': 'Hotspot Điểm Nóng Tế Bào Quang Điện (Cell)',
    'diode_bypass': 'Hỏng / Ngắn Mạch Diode Bypass Hộp Nối J-Box',
    'mc4_connector': 'Quá Nhiệt Tiếp Xúc Ngàm Đầu Nối MC4',
    'soiling': 'Phát Nhiệt Cục Bộ Do Bám Bẩn Phân Chim / Lá Cây'
  };

  const getSeverityBadge = () => {
    if (deltaT >= 20) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">Cực Kỳ Nghiêm Trọng (Nguy Cơ Cháy)</span>;
    }
    if (deltaT >= 10) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">Nghiêm Trọng (Cần Xử Lý)</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">Bình Thường</span>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await saveTask({
        id: `flir-${Date.now()}`,
        title: `[Quét Nhiệt FLIR] ${reportCode} — ${siteName} (ΔT = ${deltaT}°C)`,
        description: `BÁO CÁO KIỂM TRA QUÉT NHIỆT HỒNG NGOẠI FLIR:\n` +
          `• Mã báo cáo: ${reportCode}\n` +
          `• Địa điểm: ${siteName}\n` +
          `• Thiết bị đo: ${cameraModel} | Bức xạ nắng: ${solarIrradiance} | Môi trường: ${ambientTemp}\n` +
          `• Vị trí phát hiện: ${locationTag}\n` +
          `• Dữ liệu nhiệt: T_max = ${maxTemp}°C | T_nền = ${bgTemp}°C | Chênh lệch ΔT = ${deltaT}°C\n` +
          `• Phân loại lỗi: ${defectNames[defectType]}\n` +
          `• Đề xuất xử lý: ${recommendation}`,
        status: 'in_progress' as any,
        priority: deltaT >= 20 ? 'Urgent' as any : 'High' as any,
        departmentId: 'dept-om',
        department: 'Trung Tâm Dịch Vụ SAJ & O&M',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tags: ['FLIR_Scan', 'Hotspot', 'Thermography', defectType],
        _isNew: true
      } as any);

      setSuccessMsg(`✅ Đã lưu Báo Cáo Quét Nhiệt FLIR ${reportCode} thành công!`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1800);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Lỗi lưu báo cáo: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 via-rose-900 to-slate-900 text-white p-6 flex items-center justify-between border-b border-rose-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center text-red-400">
              <Flame size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Báo Cáo Quét Nhiệt Hồng Ngoại FLIR (Hotspot Tracker)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-400/30">
                  {reportCode}
                </span>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                Chẩn đoán quang điện, phát hiện điểm nóng Hotspot tấm pin & tiếp xúc ngàm MC4.
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Tên Nhà Máy Điện Mặt Trời:</label>
              <input
                type="text"
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                className="w-full px-3.5 py-2 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Thiết Bị Camera Hồng Ngoại:</label>
              <input
                type="text"
                value={cameraModel}
                onChange={e => setCameraModel(e.target.value)}
                className="w-full px-3.5 py-2 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Bức Xạ Mặt Trời Lúc Đo:</label>
              <input
                type="text"
                value={solarIrradiance}
                onChange={e => setSolarIrradiance(e.target.value)}
                placeholder="≥ 600 W/m² chuẩn IEC"
                className="w-full px-3.5 py-2 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Nhiệt Độ Môi Trường Xung Quanh:</label>
              <input
                type="text"
                value={ambientTemp}
                onChange={e => setAmbientTemp(e.target.value)}
                placeholder="34°C"
                className="w-full px-3.5 py-2 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Vị Trí & Tọa Độ Điểm Nóng:</label>
            <input
              type="text"
              value={locationTag}
              onChange={e => setLocationTag(e.target.value)}
              className="w-full px-3.5 py-2 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          {/* Temperature Diff Card */}
          <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-950 dark:text-red-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Thermometer size={16} className="text-red-600" />
                Thông Số Chênh Lệch Nhiệt Độ (ΔT)
              </span>
              {getSeverityBadge()}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-gray-600 dark:text-slate-400 mb-1">Nhiệt Độ Điểm Nóng (Tmax)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    value={maxTemp}
                    onChange={e => setMaxTemp(Number(e.target.value))}
                    className="w-full px-3 py-1.5 font-black text-red-600 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 rounded-lg"
                  />
                  <span className="font-bold text-gray-500">°C</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 dark:text-slate-400 mb-1">Nhiệt Độ Nền Chuẩn (Tbg)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    value={bgTemp}
                    onChange={e => setBgTemp(Number(e.target.value))}
                    className="w-full px-3 py-1.5 font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg"
                  />
                  <span className="font-bold text-gray-500">°C</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 dark:text-slate-400 mb-1">Chênh Lệch ΔT</label>
                <div className="text-xl font-black text-red-600 dark:text-red-400 py-1 font-mono">
                  +{deltaT} °C
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Phân Loại Nguyên Nhân Khiếm Khuyết:</label>
            <select
              value={defectType}
              onChange={(e: any) => setDefectType(e.target.value)}
              className="w-full px-3.5 py-2 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
            >
              <option value="hotspot_cell">Hotspot Điểm Nóng Tế Bào Quang Điện (Cell)</option>
              <option value="diode_bypass">Hỏng / Ngắn Mạch Diode Bypass Hộp Nối J-Box</option>
              <option value="mc4_connector">Quá Nhiệt Tiếp Xúc Ngàm Đầu Nối MC4</option>
              <option value="soiling">Phát Nhiệt Cục Bộ Do Bám Bẩn Phân Chim / Lá Cây</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Đề Xuất Hành Động Khắc Phục (O&M Action):</label>
            <textarea
              rows={3}
              value={recommendation}
              onChange={e => setRecommendation(e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl font-medium text-gray-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md"
            >
              <Send size={14} className="mr-1.5" /> Lưu Báo Cáo & Kích Hoạt Bảo Dưỡng O&M
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
