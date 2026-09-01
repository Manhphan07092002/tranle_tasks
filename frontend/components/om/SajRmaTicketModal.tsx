import React, { useState } from 'react';
import { ShieldCheck, X, Wrench, AlertCircle, CheckCircle2, Send, Cpu, Layers } from 'lucide-react';
import { Button } from '../UI';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

interface SajRmaTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SajRmaTicketModal: React.FC<SajRmaTicketModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { saveTask } = useData();

  const [ticketCode] = useState(`RMA-${new Date().getFullYear()}-SAJ-${Math.floor(100 + Math.random() * 900)}`);
  const [siteName, setSiteName] = useState('Nhà máy May Việt Tiến (Đồng Nai)');
  const [inverterModel, setInverterModel] = useState('SAJ C6-100K-T4');
  const [serialNumber, setSerialNumber] = useState('SAJ100K2026030991');
  const [errorCode, setErrorCode] = useState('E002');
  const [partsNeeded, setPartsNeeded] = useState<'igbt_module' | 'power_board' | 'cpu_board' | 'fan_ip68'>('igbt_module');
  const [engineerName, setEngineerName] = useState('Võ Anh Tuấn (Kỹ Sư SAJ Certified)');
  const [faultDescription, setFaultDescription] = useState('Inverter báo lỗi PV Isolation Low vào đầu giờ sáng khi sương mù ẩm cao. Sau khi kiểm tra chuỗi PV DC, phát hiện bo công suất IGBT nhánh 02 bị rò điện trở cách điện.');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const errorCodeNames: Record<string, string> = {
    'E001': 'E001 - Grid Voltage High / Quá áp lưới điện EVN',
    'E002': 'E002 - PV Isolation Low / Lỗi chạm đất cách điện DC',
    'E015': 'E015 - Relay Fault / Lỗi tiếp điểm đóng cắt',
    'E032': 'E032 - IGBT Over-Temp / Quá nhiệt tầng công suất',
    'E045': 'E045 - AFCI DC Arc Fault / Phát hiện tia lửa điện DC',
    'COMM': 'COMM - Datalogger WiFi/4G Mất kết nối SCADA'
  };

  const partsNames: Record<string, string> = {
    'igbt_module': 'Module Công Suất IGBT Infineon 1200V / 150A',
    'power_board': 'Bo Mạch Nguồn & Lọc Sóng DC/DC C6 Series',
    'cpu_board': 'Bo Mạch Điều Khiển Trung Tâm DSP & Firmware SAJ',
    'fan_ip68': 'Quạt Làm Mát Tản Nhiệt Chống Bụi Nước IP68'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await saveTask({
        id: `rma-${Date.now()}`,
        title: `[Phiếu RMA SAJ] ${ticketCode} — ${siteName} (${inverterModel})`,
        description: `PHIẾU BẢO HÀNH & SỬA CHỮA INVERTER SAJ ỦY QUYỀN:\n` +
          `• Mã phiếu: ${ticketCode}\n` +
          `• Địa điểm: ${siteName}\n` +
          `• Model: ${inverterModel} | Serial: ${serialNumber}\n` +
          `• Mã lỗi: ${errorCodeNames[errorCode]}\n` +
          `• Linh kiện xuất kho thay thế: ${partsNames[partsNeeded]}\n` +
          `• Kỹ sư phụ trách: ${engineerName}\n` +
          `• Mô tả sự cố: ${faultDescription}\n` +
          `• Cam kết SLA: Xử lý thay thế bo mạch trong vòng < 4 Giờ & Chạy nghiệm thu 24h.`,
        status: 'in_progress' as any,
        priority: 'High' as any,
        departmentId: 'dept-om',
        department: 'Trung Tâm Dịch Vụ SAJ & O&M',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tags: ['SAJ_RMA', 'Warranty', 'IGBT', errorCode],
        _isNew: true
      } as any);

      setSuccessMsg(`✅ Đã phát hành Phiếu Bảo Hành RMA ${ticketCode} thành công!`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1800);
    } catch (err: any) {
      alert('Lỗi tạo phiếu RMA: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900 via-sky-900 to-slate-900 text-white p-6 flex items-center justify-between border-b border-cyan-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <Wrench size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Tạo Phiếu Dịch Vụ & Bảo Hành SAJ (RMA)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  {ticketCode}
                </span>
              </div>
              <p className="text-xs text-cyan-200/80 mt-0.5">
                Trung Tâm Dịch Vụ & Bảo Hành Ủy Quyền SAJ Electric Tại Việt Nam.
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
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Tên Nhà Máy / Công Trình:</label>
              <input
                type="text"
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                className="w-full px-3.5 py-2 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Model Biến Tần SAJ:</label>
              <select
                value={inverterModel}
                onChange={e => setInverterModel(e.target.value)}
                className="w-full px-3.5 py-2 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              >
                <option value="SAJ C6-100K-T4">SAJ C6-100K-T4 (100 kW)</option>
                <option value="SAJ C6-50K-T4">SAJ C6-50K-T4 (50 kW)</option>
                <option value="SAJ R6-15K-T2">SAJ R6-15K-T2 (15 kW)</option>
                <option value="SAJ Hybrid H2-10K">SAJ Hybrid H2-10K-T2 (10 kW)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Mã Serial Number Inverter:</label>
              <input
                type="text"
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                className="w-full px-3.5 py-2 font-mono font-bold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-cyan-600 dark:text-cyan-400"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Mã Lỗi Inverter Hiển Thị:</label>
              <select
                value={errorCode}
                onChange={e => setErrorCode(e.target.value)}
                className="w-full px-3.5 py-2 font-bold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-red-600 dark:text-red-400"
              >
                <option value="E002">E002 — PV Isolation Low (Chạm đất DC)</option>
                <option value="E001">E001 — Grid Voltage High (Quá áp EVN)</option>
                <option value="E015">E015 — Relay Fault (Hỏng tiếp điểm)</option>
                <option value="E032">E032 — IGBT Over-Temp (Quá nhiệt IGBT)</option>
                <option value="E045">E045 — AFCI Arc Fault (Tia lửa điện DC)</option>
                <option value="COMM">COMM — Datalogger WiFi Offline</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Linh Kiện Chính Hãng SAJ Cần Cấp Phát:</label>
            <select
              value={partsNeeded}
              onChange={(e: any) => setPartsNeeded(e.target.value)}
              className="w-full px-3.5 py-2 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-400"
            >
              <option value="igbt_module">Module Công Suất IGBT Infineon 1200V / 150A</option>
              <option value="power_board">Bo Mạch Nguồn & Lọc Sóng DC/DC C6</option>
              <option value="cpu_board">Bo Mạch Điều Khiển DSP & Firmware SAJ</option>
              <option value="fan_ip68">Quạt Tản Nhiệt Chống Nước IP68</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Kỹ Sư Phụ Trách Hiện Trường:</label>
            <input
              type="text"
              value={engineerName}
              onChange={e => setEngineerName(e.target.value)}
              className="w-full px-3.5 py-2 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Mô Tả Chẩn Đoán Kỹ Thuật:</label>
            <textarea
              rows={3}
              value={faultDescription}
              onChange={e => setFaultDescription(e.target.value)}
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
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md"
            >
              <Send size={14} className="mr-1.5" /> Phát Hành Phiếu RMA & Xuất Kho
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
