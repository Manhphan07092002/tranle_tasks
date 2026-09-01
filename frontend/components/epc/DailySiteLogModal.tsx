import React, { useState } from 'react';
import {
  HardHat, X, Camera, CheckCircle2, AlertTriangle, CloudSun,
  Users, Wrench, ShieldAlert, Sparkles, Send, MapPin, Calendar, FileText
} from 'lucide-react';
import { Button } from '../UI';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

interface DailySiteLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailySiteLogModal: React.FC<DailySiteLogModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { projects, saveTask } = useData();

  // Form states
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState<'sunny' | 'cloudy' | 'rainy' | 'windy'>('sunny');
  const [temperature, setTemperature] = useState('33°C');
  
  // Manpower
  const [engineersCount, setEngineersCount] = useState<number>(4);
  const [electriciansCount, setElectriciansCount] = useState<number>(18);
  const [mechanicsCount, setMechanicsCount] = useState<number>(12);

  // Executed Work Volumes
  const [railsInstalled, setRailsInstalled] = useState<number>(450); // m²
  const [panelsMounted, setPanelsMounted] = useState<number>(180); // tấm AIKO 650Wp
  const [dcCablePulled, setDcCablePulled] = useState<number>(1200); // mét cáp 1500V
  const [invertersHung, setInvertersHung] = useState<number>(2); // bộ SAJ C6
  const [workNotes, setWorkNotes] = useState('Đã hoàn thành lắp ráp 100% hệ khung Rail nhôm trên mái xưởng B. Kéo xong 8 string cáp DC về trạm biến tần số 2. Kiểm tra Megger cách điện đạt chuẩn > 50 MΩ.');

  // HSE Safety
  const [toolboxDone, setToolboxDone] = useState(true);
  const [harnessChecked, setHarnessChecked] = useState(true);
  const [lotoChecked, setLotoChecked] = useState(true);
  const [nearMissIncident, setNearMissIncident] = useState('Không có sự cố an toàn nào trong ngày.');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      // Create a daily site log task record in MySQL
      await saveTask({
        id: `sitelog-${Date.now()}`,
        title: `[Nhật Trình Thi Công] ${currentProject?.name} - ${logDate}`,
        description: `BÁO CÁO HIỆN TRƯỜNG NGÀY ${logDate}:\n` +
          `• Dự án: ${currentProject?.name} (${currentProject?.projectCode})\n` +
          `• Thời tiết: ${weather === 'sunny' ? 'Nắng ráo' : weather === 'rainy' ? 'Có mưa' : 'Nhiều mây'} (${temperature})\n` +
          `• Nhân lực: ${engineersCount} Kỹ sư, ${electriciansCount} Thợ điện, ${mechanicsCount} Thợ cơ khí (Tổng: ${engineersCount + electriciansCount + mechanicsCount} người)\n` +
          `• Khối lượng hoàn thành:\n` +
          `  - Giàn nhôm Rail: ${railsInstalled} m²\n` +
          `  - Lắp tấm pin AIKO 650Wp: ${panelsMounted} tấm (~${((panelsMounted * 650) / 1000).toFixed(1)} kWp)\n` +
          `  - Kéo cáp Solar DC 1500V: ${dcCablePulled} mét\n` +
          `  - Lắp Biến tần SAJ C6: ${invertersHung} bộ\n` +
          `• Ghi chú thi công: ${workNotes}\n` +
          `• An toàn HSE: Toolbox đầu giờ: ${toolboxDone ? 'ĐẠT' : 'CHƯA'} | Dây an toàn: ${harnessChecked ? 'ĐẠT' : 'CHƯA'} | Sự cố: ${nearMissIncident}`,
        status: 'completed' as any,
        priority: 'Medium' as any,
        departmentId: 'dept-epc',
        department: 'Khối Tổng Thầu EPC',
        projectId: selectedProjectId,
        dueDate: logDate,
        tags: ['DailySiteLog', 'EPC', 'AIKO', 'SAJ'],
        _isNew: true
      } as any);

      setSuccessMsg('✅ Đã lưu Nhật Trình Công Trường thành công vào hệ thống EPC!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1800);
    } catch (err: any) {
      alert('Lỗi lưu nhật trình: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <HardHat size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Nhật Trình Thi Công Hiện Trường (Daily Site Log)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Khối Tổng Thầu EPC
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Ghi nhận nhân lực, khối lượng lắp đặt tấm pin AIKO & biến tần SAJ, kiểm soát an toàn HSE hàng ngày.
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

        {/* Success message */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Top Row: Project & Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-200 dark:border-slate-700">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Dự Án Công Trường:</label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.projectCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Ngày Nhật Trình:</label>
              <input
                type="date"
                value={logDate}
                onChange={e => setLogDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Thời Tiết & Nhiệt Độ:</label>
              <div className="flex gap-2">
                <select
                  value={weather}
                  onChange={(e: any) => setWeather(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl font-semibold text-gray-900 dark:text-white outline-none"
                >
                  <option value="sunny">☀️ Nắng Tốt</option>
                  <option value="cloudy">⛅ Nhiều Mây</option>
                  <option value="rainy">🌧️ Có Mưa</option>
                  <option value="windy">💨 Gió Lớn</option>
                </select>
                <input
                  type="text"
                  value={temperature}
                  onChange={e => setTemperature(e.target.value)}
                  placeholder="33°C"
                  className="w-20 px-2 py-2 text-center bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl font-semibold text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Manpower Grid */}
          <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Users size={16} className="text-emerald-600" />
                Điểm Danh Quân Số & Nhân Lực Hiện Trường
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Tổng: {engineersCount + electriciansCount + mechanicsCount} Nhân sự
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-slate-700/40 rounded-xl border border-gray-200 dark:border-slate-600">
                <label className="block text-gray-500 font-bold mb-1">Kỹ Sư Giám Sát / QA-QC</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={engineersCount}
                    onChange={e => setEngineersCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 font-bold bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
                  />
                  <span className="text-gray-400 font-medium">Người</span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-slate-700/40 rounded-xl border border-gray-200 dark:border-slate-600">
                <label className="block text-gray-500 font-bold mb-1">Thợ Điện Kéo Cáp / Đấu Tủ</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={electriciansCount}
                    onChange={e => setElectriciansCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 font-bold bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
                  />
                  <span className="text-gray-400 font-medium">Người</span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-slate-700/40 rounded-xl border border-gray-200 dark:border-slate-600">
                <label className="block text-gray-500 font-bold mb-1">Thợ Cơ Khí Giàn Khung</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={mechanicsCount}
                    onChange={e => setMechanicsCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 font-bold bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
                  />
                  <span className="text-gray-400 font-medium">Người</span>
                </div>
              </div>
            </div>
          </div>

          {/* Executed Volumes */}
          <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Wrench size={16} className="text-blue-600" />
              Khối Lượng Thi Công Hoàn Thành Trong Ngày
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">Giàn Nhôm Rail (m²)</label>
                <input
                  type="number"
                  value={railsInstalled}
                  onChange={e => setRailsInstalled(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 font-bold bg-white dark:bg-slate-700 border border-blue-300 dark:border-blue-700 rounded-lg text-blue-700 dark:text-blue-300"
                />
              </div>

              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">Tấm Pin AIKO (Tấm)</label>
                <input
                  type="number"
                  value={panelsMounted}
                  onChange={e => setPanelsMounted(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 font-bold bg-white dark:bg-slate-700 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-700 dark:text-emerald-300"
                />
              </div>

              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">Cáp Solar DC (Mét)</label>
                <input
                  type="number"
                  value={dcCablePulled}
                  onChange={e => setDcCablePulled(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 font-bold bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-700 dark:text-amber-300"
                />
              </div>

              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <label className="block text-gray-600 dark:text-slate-300 font-bold mb-1">Inverter SAJ C6 (Bộ)</label>
                <input
                  type="number"
                  value={invertersHung}
                  onChange={e => setInvertersHung(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 font-bold bg-white dark:bg-slate-700 border border-purple-300 dark:border-purple-700 rounded-lg text-purple-700 dark:text-purple-300"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Ghi Chú Kỹ Thuật & Nghiệm Thu QA/QC:</label>
              <textarea
                rows={3}
                value={workNotes}
                onChange={e => setWorkNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* HSE Checklist */}
          <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <ShieldAlert size={16} className="text-amber-500" />
              Kiểm Soát An Toàn Lao Động & Vệ Sinh Môi Trường (HSE)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-slate-700/40 rounded-xl border border-gray-200 dark:border-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toolboxDone}
                  onChange={e => setToolboxDone(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-bold text-gray-800 dark:text-slate-200">Họp Toolbox Meeting Đầu Giờ</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-slate-700/40 rounded-xl border border-gray-200 dark:border-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={harnessChecked}
                  onChange={e => setHarnessChecked(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-bold text-gray-800 dark:text-slate-200">100% Dây An Toàn Làm Việc Cao</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-slate-700/40 rounded-xl border border-gray-200 dark:border-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lotoChecked}
                  onChange={e => setLotoChecked(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-bold text-gray-800 dark:text-slate-200">Khóa Cảnh Báo An Toàn Điện (LOTO)</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
            >
              <Send size={14} className="mr-1.5" /> Lưu & Cập Nhật Tiến Độ Hiện Trường
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
