import React, { useState, useMemo } from 'react';
import {
  Zap, Calculator, Sun, DollarSign, FileText, Send, CheckCircle2,
  AlertCircle, ChevronRight, Download, Printer, ArrowRight, Layers,
  HardHat, RefreshCw, X, ShieldCheck, TrendingUp, Sparkles, Building2
} from 'lucide-react';
import { Button } from '../UI';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface SolarFastQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BOMItem {
  id: string;
  category: string;
  name: string;
  specs: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warranty: string;
  origin: string;
}

export const SolarFastQuoteModal: React.FC<SolarFastQuoteModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { saveContract, saveDepartmentRequest, departments } = useData();
  const { showToast } = useNotifications();

  // Inputs
  const [clientName, setClientName] = useState('Công ty CP Sản Xuất May Mặc An Phú');
  const [projectName, setProjectName] = useState('Dự Án Điện Mặt Trời Mái Nhà Xưởng An Phú 1.0 MWp');
  const [projectType, setProjectType] = useState<'ci_rooftop' | 'residential' | 'hybrid_ess' | 'agri_pv'>('ci_rooftop');
  const [targetKwp, setTargetKwp] = useState<number>(1000);
  const [roofType, setRoofType] = useState<'trapezoidal' | 'seam_lock' | 'concrete' | 'tile'>('seam_lock');
  const [cableDistance, setCableDistance] = useState<number>(120); // mét
  const [evnTariff, setEvnTariff] = useState<number>(2850); // VNĐ/kWh
  
  // Equipment Selection
  const [panelModel, setPanelModel] = useState<'aiko_650' | 'aiko_610' | 'mono_580'>('aiko_650');
  const [inverterModel, setInverterModel] = useState<'saj_100k' | 'saj_50k' | 'saj_15k' | 'saj_hybrid_10k'>('saj_100k');

  // Notification state
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Solar Engineering Constants & Panel specs
  const panelSpecs = useMemo(() => {
    switch (panelModel) {
      case 'aiko_650':
        return { name: 'Tấm Pin AIKO N-Type ABC 650Wp', wattage: 650, efficiency: '24.2%', warranty: 'Bảo hành vật lý 15 năm, hiệu suất 30 năm', price: 2150000, areaPerPanel: 2.58, origin: 'AIKO Solar' };
      case 'aiko_610':
        return { name: 'Tấm Pin AIKO All-Black N-Type 610Wp', wattage: 610, efficiency: '23.6%', warranty: 'Bảo hành vật lý 25 năm, hiệu suất 30 năm', price: 2350000, areaPerPanel: 2.32, origin: 'AIKO Solar' };
      default:
        return { name: 'Tấm Pin Mono Half-Cell 580Wp Tiêu Chuẩn', wattage: 580, efficiency: '22.5%', warranty: 'Bảo hành 12 năm vật lý, 25 năm hiệu suất', price: 1850000, areaPerPanel: 2.56, origin: 'Tier 1' };
    }
  }, [panelModel]);

  const inverterSpecs = useMemo(() => {
    switch (inverterModel) {
      case 'saj_100k':
        return { name: 'Biến Tần Hòa Lưới SAJ C6-100K-T4 (100 kW, 3 Pha 380V)', powerKw: 100, mppt: '4 MPPT / 8 Strings', warranty: '5 năm (Mở rộng 10 năm)', price: 78000000, origin: 'SAJ Electric' };
      case 'saj_50k':
        return { name: 'Biến Tần Hòa Lưới SAJ C6-50K-T4 (50 kW, 3 Pha 380V)', powerKw: 50, mppt: '4 MPPT / 4 Strings', warranty: '5 năm', price: 46000000, origin: 'SAJ Electric' };
      case 'saj_15k':
        return { name: 'Biến Tần Hòa Lưới SAJ R6-15K-T2 (15 kW, 3 Pha 380V)', powerKw: 15, mppt: '2 MPPT', warranty: '5 năm', price: 21000000, origin: 'SAJ Electric' };
      default:
        return { name: 'Biến Tần Hybrid SAJ H2-10K-T2 (10 kW) + Pin Dyness 15.36kWh', powerKw: 10, mppt: '2 MPPT + ESS Lithium', warranty: '10 năm SAJ & Dyness', price: 125000000, origin: 'SAJ & Dyness' };
    }
  }, [inverterModel]);

  // Calculations
  const panelCount = Math.ceil((targetKwp * 1000) / panelSpecs.wattage);
  const actualKwp = Number(((panelCount * panelSpecs.wattage) / 1000).toFixed(2));
  const estimatedRoofArea = Math.ceil(panelCount * panelSpecs.areaPerPanel * 1.15); // +15% khoảng cách luồng gió và lối đi kỹ thuật
  const inverterCount = Math.max(1, Math.ceil(targetKwp / (inverterSpecs.powerKw * 1.15))); // DC/AC ratio ~1.15

  // Generate Detailed BOM Items
  const bomItems: BOMItem[] = useMemo(() => {
    const items: BOMItem[] = [];

    // 1. Tấm pin
    items.push({
      id: 'bom-1',
      category: '1. Tấm Quang Điện (PV Modules)',
      name: panelSpecs.name,
      specs: `Công suất ${panelSpecs.wattage}Wp, Hiệu suất ${panelSpecs.efficiency}, Công nghệ N-Type ABC`,
      unit: 'Tấm',
      quantity: panelCount,
      unitPrice: panelSpecs.price,
      totalPrice: panelCount * panelSpecs.price,
      warranty: panelSpecs.warranty,
      origin: panelSpecs.origin
    });

    // 2. Biến tần
    items.push({
      id: 'bom-2',
      category: '2. Biến Tần Hòa Lưới (Inverter)',
      name: inverterSpecs.name,
      specs: `Công suất ${inverterSpecs.powerKw}kW, Hiệu suất 98.8%, Tích hợp AFCI chống hồ quang`,
      unit: 'Bộ',
      quantity: inverterCount,
      unitPrice: inverterSpecs.price,
      totalPrice: inverterCount * inverterSpecs.price,
      warranty: inverterSpecs.warranty,
      origin: inverterSpecs.origin
    });

    // 3. Khung giàn nhôm & kẹp
    const railPricePerKwp = roofType === 'concrete' ? 380000 : roofType === 'tile' ? 350000 : 260000;
    const totalMounting = Math.round(actualKwp * railPricePerKwp);
    items.push({
      id: 'bom-3',
      category: '3. Khung Giàn & Phụ Kiện Lắp Đặt',
      name: `Hệ Thống Rail Nhôm AL6005-T5 Anodized & Phụ Kiện (${roofType === 'seam_lock' ? 'Kẹp Seam-lock không khoan thủng mái' : roofType === 'trapezoidal' ? 'Mini Rail chống dột' : roofType === 'tile' ? 'Móc ngói Inox 304' : 'Giàn khung nghiêng bê tông 12°'})`,
      specs: 'Nhôm định hình mạ Anodized chống ăn mòn C4, Bulong ốc Inox 304 tiêu chuẩn chịu bão cấp 12',
      unit: 'Hệ / kWp',
      quantity: Math.round(actualKwp),
      unitPrice: railPricePerKwp,
      totalPrice: totalMounting,
      warranty: '15 Năm',
      origin: 'Tran Le EPC OEM'
    });

    // 4. Cáp điện Solar DC 1500V
    const dcCableMeters = Math.round(panelCount * 6.5); // trung bình 6.5m cáp DC / tấm
    const dcCableTotal = dcCableMeters * 18500;
    items.push({
      id: 'bom-4',
      category: '4. Dây Cáp & Đầu Nối Chuyên Dụng',
      name: 'Cáp Điện Năng Lượng Mặt Trời Solar DC 1x4.0mm² / 1x6.0mm² 1500V',
      specs: 'Lõi đồng mạ thiếc, Vỏ cách điện XLPO 2 lớp chống tia UV, Chịu nhiệt 120°C theo chuẩn IEC 62930',
      unit: 'Mét',
      quantity: dcCableMeters,
      unitPrice: 18500,
      totalPrice: dcCableTotal,
      warranty: '25 Năm',
      origin: 'KBE / Helukabel'
    });

    // 5. Cáp điện AC tổng
    const acCableTotal = cableDistance * (actualKwp > 500 ? 580000 : actualKwp > 100 ? 280000 : 95000);
    items.push({
      id: 'bom-5',
      category: '4. Dây Cáp & Đầu Nối Chuyên Dụng',
      name: 'Cáp Điện Đồng Tổng AC 3 Pha Cu/XLPE/PVC/DSTA/PVC',
      specs: `Truyền dẫn từ trạm Inverter về Tủ điện phân phối chính MSB (Khoảng cách ${cableDistance}m)`,
      unit: 'Mét',
      quantity: cableDistance,
      unitPrice: actualKwp > 500 ? 580000 : actualKwp > 100 ? 280000 : 95000,
      totalPrice: acCableTotal,
      warranty: '10 Năm',
      origin: 'Cadivi / LS Vina'
    });

    // 6. Tủ điện phân phối & chống sét
    const panelBoxTotal = Math.round(actualKwp * 120000);
    items.push({
      id: 'bom-6',
      category: '5. Tủ Điện Phân Phối & An Toàn',
      name: 'Tủ Điện AC/DC Tích Hợp Chống Sét Lan Truyền Type 2 & Đo Đếm Điện Năng',
      specs: 'Vỏ tủ sơn tĩnh điện ngoài trời IP65, Thiết bị đóng cắt MCCB Schneider/ABB, Chống sét SPD OBO Bettermann',
      unit: 'Tủ',
      quantity: Math.max(1, Math.ceil(inverterCount / 2)),
      unitPrice: Math.round(panelBoxTotal / Math.max(1, Math.ceil(inverterCount / 2))),
      totalPrice: panelBoxTotal,
      warranty: '5 Năm',
      origin: 'Tran Le Switchboard'
    });

    // 7. Hệ thống tiếp địa chống sét
    const earthingTotal = Math.round(actualKwp > 500 ? 45000000 : actualKwp > 100 ? 25000000 : 12000000);
    items.push({
      id: 'bom-7',
      category: '6. Hệ Thống Tiếp Địa & Chống Sét',
      name: 'Hệ Thống Tiếp Địa An Toàn Khung Pin, Biến Tần & Bãi Cọc Đồng D16',
      specs: 'Bãi cọc đồng D16 dài 2.4m liên kết cáp đồng trần 50mm² hàn hóa nhiệt Cadweld, Điện trở tiếp địa R < 4.0 Ω',
      unit: 'Gói',
      quantity: 1,
      unitPrice: earthingTotal,
      totalPrice: earthingTotal,
      warranty: '10 Năm',
      origin: 'Tran Le EPC'
    });

    // 8. Nhân công xây lắp & nghiệm thu
    const laborPerKwp = 550000;
    const laborTotal = Math.round(actualKwp * laborPerKwp);
    items.push({
      id: 'bom-8',
      category: '7. Nhân Công Xây Lắp & Nghiệm Thu',
      name: 'Thi Công Lắp Đặt Hoàn Thiện, Thí Nghiệm Đo Kiểm QA/QC & Đóng Điện EVN',
      specs: 'Đo Megger cách điện, Đo đường cong I-V Curve, Lập hồ sơ hoàn công, Đăng ký đấu nối với Điện lực EVN',
      unit: 'Hệ / kWp',
      quantity: Math.round(actualKwp),
      unitPrice: laborPerKwp,
      totalPrice: laborTotal,
      warranty: '2 Năm bảo dưỡng miễn phí',
      origin: 'Kỹ Sư Tran Le EPC'
    });

    return items;
  }, [panelSpecs, inverterSpecs, panelCount, actualKwp, inverterCount, roofType, cableDistance]);

  // Financial Summaries
  const totalPreTax = bomItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const vatAmount = Math.round(totalPreTax * 0.08); // 8% VAT
  const totalAfterTax = totalPreTax + vatAmount;
  const costPerWp = Math.round(totalPreTax / (actualKwp * 1000));

  // ROI & Energy Production Metrics
  const annualEnergyKwh = Math.round(actualKwp * 3.85 * 365); // 3.85 giờ nắng trung bình/ngày tại miền Nam/Trung
  const annualSavingVnd = Math.round(annualEnergyKwh * evnTariff);
  const co2ReductionTons = Number((annualEnergyKwh * 0.00085).toFixed(1)); // 0.85 kg CO2 / kWh
  const paybackYears = Number((totalAfterTax / annualSavingVnd).toFixed(1));
  const lifetimeSaving25Y = annualSavingVnd * 25 * 0.90; // Giảm dần hiệu suất sau 25 năm

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Action 1: Save as Contract / Proposal into MySQL
  const handleSaveAsContract = async () => {
    try {
      setIsSubmitting(true);
      const contractCode = `BG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await saveContract({
        id: `contract-${Date.now()}`,
        contractNumber: contractCode,
        contractName: projectName,
        clientName: clientName,
        preTaxValue: totalPreTax,
        vatRate: 8,
        department: 'Phòng Kinh Doanh',
        departmentId: 'dept-sales',
        type: 'output',
        status: 'draft',
        products: bomItems.map(item => ({
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          origin: item.origin,
          unitPrice: item.unitPrice,
          total: item.totalPrice,
          vatRate: 8
        })),
        _isNew: true
      } as any);

      setSuccessMessage(`✅ Đã lưu Báo Giá thành công vào Hệ thống Hợp Đồng với mã: ${contractCode}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Lỗi lưu hợp đồng: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action 2: Send Technical Request to Engineering Department
  const handleSendTechnicalRequest = async () => {
    try {
      setIsSubmitting(true);
      const engDept = departments.find(d => d.code === 'ENG' || d.id === 'dept-eng');
      const salesDept = departments.find(d => d.code === 'SALES' || d.id === 'dept-sales');

      await saveDepartmentRequest({
        sourceDepartmentId: salesDept?.id || 'dept-sales',
        targetDepartmentId: engDept?.id || 'dept-eng',
        requesterId: user?.id,
        title: `[Khảo sát & Thiết kế 3D PVSyst] ${projectName} (${actualKwp} kWp)`,
        description: `Kính gửi Phòng Kỹ Thuật Solar,\nPhòng Kinh Doanh yêu cầu hỗ trợ khảo sát hiện trường và mô phỏng 3D PVSyst cho khách hàng ${clientName}.\nThông số sơ bộ:\n- Công suất: ${actualKwp} kWp\n- Diện tích mái ước tính: ${estimatedRoofArea} m² (${roofType})\n- Pin đề xuất: ${panelSpecs.name} (${panelCount} tấm)\n- Biến tần đề xuất: ${inverterSpecs.name} (${inverterCount} bộ)\n- Chiều dài cáp AC: ${cableDistance}m\n\nKính mong Phòng Kỹ Thuật bóc tách bản vẽ SLD và xuất báo cáo sản lượng PVSyst.`,
        priority: 'High',
        status: 'pending',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      setSuccessMessage('✅ Đã tạo và gửi Phiếu Yêu Cầu Kỹ Thuật (Technical Request) sang Phòng Kỹ Thuật Solar thành công!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Lỗi gửi yêu cầu: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action 3: Trigger Print / PDF
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 flex items-center justify-between border-b border-slate-700 relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Calculator size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Bộ Tính Nhanh Báo Giá Điện Mặt Trời & BOM Vật Tư</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  AIKO & SAJ Solar Engine 2026
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Tự động bóc tách khối lượng vật tư, dự toán tài chính đầu tư và xuất báo giá chuẩn Trần Lê Electricity.
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

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800">Đóng</button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Top Inputs: Project & Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-gray-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Tên Khách Hàng / Chủ Đầu Tư:</label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Tên Dự Án Công Trình:</label>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Phân Loại Dự Án:</label>
              <select
                value={projectType}
                onChange={(e: any) => setProjectType(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
              >
                <option value="ci_rooftop">Nhà Xưởng Công Nghiệp (C&I Rooftop)</option>
                <option value="residential">Biệt Thự / Dân Dụng (Residential)</option>
                <option value="hybrid_ess">Lưu Trữ Điện Năng (Hybrid ESS)</option>
                <option value="agri_pv">Nông Nghiệp / Trang Trại (Agri-PV)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Công Suất Dự Kiến (kWp):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="10000"
                  step="5"
                  value={targetKwp}
                  onChange={e => setTargetKwp(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-600 dark:text-emerald-400"
                />
                <span className="text-xs font-bold text-gray-500">kWp</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Kết Cấu Loại Mái Nhà Xưởng:</label>
              <select
                value={roofType}
                onChange={(e: any) => setRoofType(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
              >
                <option value="seam_lock">Mái Tôn Seam-lock (Kẹp Clamps không khoan)</option>
                <option value="trapezoidal">Mái Tôn Sóng Vuông (Mini Rail bắt vít chống dột)</option>
                <option value="concrete">Sàn Bê Tông Phẳng (Khung nghiêng AL6005)</option>
                <option value="tile">Mái Ngói (Móc treo Inox 304)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">Khoảng Cách Kéo Cáp Về Tủ MSB:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={cableDistance}
                  onChange={e => setCableDistance(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                />
                <span className="text-xs font-bold text-gray-500">mét</span>
              </div>
            </div>
          </div>

          {/* Equipment Model Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Panel Selector */}
            <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Sun size={16} className="text-amber-500" />
                  Chọn Tấm Pin Quang Điện (PV Module)
                </span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                  Chính Hãng AIKO
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPanelModel('aiko_650')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    panelModel === 'aiko_650'
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold ring-2 ring-emerald-500/30'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold">AIKO 650Wp N-Type</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Hiệu suất 24.2% • ABC</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPanelModel('aiko_610')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    panelModel === 'aiko_610'
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold ring-2 ring-emerald-500/30'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold">AIKO 610Wp All-Black</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Thẩm mỹ cao • Biệt thự</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPanelModel('mono_580')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    panelModel === 'mono_580'
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold ring-2 ring-emerald-500/30'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold">Tier 1 Mono 580Wp</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Giá tối ưu dự án</div>
                </button>
              </div>
            </div>

            {/* Inverter Selector */}
            <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Zap size={16} className="text-blue-500" />
                  Chọn Biến Tần Hòa Lưới (Inverter)
                </span>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                  Chính Hãng SAJ C6
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setInverterModel('saj_100k')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    inverterModel === 'saj_100k'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-bold ring-2 ring-blue-500/30'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold">SAJ 100kW</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">C6-100K-T4</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInverterModel('saj_50k')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    inverterModel === 'saj_50k'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-bold ring-2 ring-blue-500/30'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold">SAJ 50kW</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">C6-50K-T4</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInverterModel('saj_15k')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    inverterModel === 'saj_15k'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-bold ring-2 ring-blue-500/30'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold">SAJ 15kW</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">R6-15K-T2</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInverterModel('saj_hybrid_10k')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    inverterModel === 'saj_hybrid_10k'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-bold ring-2 ring-blue-500/30'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold">SAJ Hybrid</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">H2 + Dyness</div>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Technical & Financial Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Tổng Mức Đầu Tư (Sau VAT)</div>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{formatVND(totalAfterTax)}</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">~{costPerWp.toLocaleString()} ₫ / Wp</div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
              <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase">Sản Lượng Điện Hàng Năm</div>
              <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">{annualEnergyKwh.toLocaleString()} kWh</div>
              <div className="text-[11px] text-blue-600 mt-0.5">Tiết kiệm {formatVND(annualSavingVnd)}/năm</div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
              <div className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase">Thời Gian Hoàn Vốn (ROI)</div>
              <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">{paybackYears} Năm</div>
              <div className="text-[11px] text-purple-600 mt-0.5">Tiết kiệm 25 năm: ~{formatVND(lifetimeSaving25Y)}</div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800">
              <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">Quy Mô Công Trình</div>
              <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">{panelCount} Tấm Pin</div>
              <div className="text-[11px] text-amber-600 mt-0.5">{inverterCount} Inverter • ~{estimatedRoofArea} m² mái</div>
            </div>
          </div>

          {/* Detailed Bill of Materials (BOM) Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-emerald-600" />
                Bảng Bóc Tách Khối Lượng Vật Tư Chi Tiết (Bill of Materials - BOM)
              </h3>
              <span className="text-xs text-gray-500 font-semibold">{bomItems.length} Hạng mục chính</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold border-b border-gray-200 dark:border-slate-600">
                    <th className="p-3 w-10">STT</th>
                    <th className="p-3">Hạng Mục & Quy Cách Kỹ Thuật</th>
                    <th className="p-3">Hãng SX</th>
                    <th className="p-3 text-center">ĐVT</th>
                    <th className="p-3 text-right">Số Lượng</th>
                    <th className="p-3 text-right">Đơn Giá</th>
                    <th className="p-3 text-right">Thành Tiền</th>
                    <th className="p-3 text-center">Bảo Hành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {bomItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-3 font-bold text-gray-500 text-center">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{item.specs}</div>
                      </td>
                      <td className="p-3 font-semibold text-gray-700 dark:text-slate-300">{item.origin}</td>
                      <td className="p-3 text-center font-medium text-gray-600 dark:text-slate-400">{item.unit}</td>
                      <td className="p-3 text-right font-bold text-gray-900 dark:text-white">{item.quantity.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono">{formatVND(item.unitPrice)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatVND(item.totalPrice)}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                          {item.warranty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-slate-800 font-bold border-t-2 border-gray-300 dark:border-slate-600 text-xs">
                    <td colSpan={6} className="p-3 text-right text-gray-700 dark:text-slate-300 uppercase">Tổng Giá Trị Thiết Bị Trước Thuế:</td>
                    <td className="p-3 text-right font-mono text-sm text-gray-900 dark:text-white">{formatVND(totalPreTax)}</td>
                    <td></td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-slate-800 font-bold text-xs">
                    <td colSpan={6} className="p-2 text-right text-gray-500">Thuế GTGT (VAT 8%):</td>
                    <td className="p-2 text-right font-mono text-gray-600 dark:text-slate-400">{formatVND(vatAmount)}</td>
                    <td></td>
                  </tr>
                  <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-black text-sm text-emerald-900 dark:text-emerald-200">
                    <td colSpan={6} className="p-3 text-right uppercase">TỔNG MỨC ĐẦU TƯ TRỌN GÓI (ĐÃ CÓ VAT):</td>
                    <td className="p-3 text-right font-mono text-base text-emerald-600 dark:text-emerald-400">{formatVND(totalAfterTax)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 dark:bg-slate-800 p-4 px-6 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            Giá báo đã bao gồm vật tư chính hãng AIKO, SAJ, trọn gói lắp đặt & đo kiểm EVN.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={handlePrint}
              className="text-xs font-bold"
            >
              <Printer size={15} className="mr-1.5" /> In / Xuất PDF
            </Button>

            <Button
              onClick={handleSendTechnicalRequest}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
            >
              <Send size={15} className="mr-1.5" /> Gửi Kỹ Thuật (Site Survey)
            </Button>

            <Button
              onClick={handleSaveAsContract}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
            >
              <FileText size={15} className="mr-1.5" /> Lưu Vào Hợp Đồng (MySQL)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
