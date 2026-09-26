import React, { useState, useEffect } from 'react';
import { Megaphone, Loader2, Plus, Calendar, BarChart3, X } from 'lucide-react';
import { Button } from '../../../components/UI';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';
import { useNotifications } from '../../../contexts/NotificationContext';

export const MarketingWorkspace: React.FC = () => {
  const { showToast } = useNotifications();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isAddCampaignOpen, setIsAddCampaignOpen] = useState(false);
  const [isAddLeadSourceOpen, setIsAddLeadSourceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campaign Form State
  const [campTitle, setCampTitle] = useState('');
  const [campChannels, setCampChannels] = useState('');
  const [campStatus, setCampStatus] = useState('Đang Lên Kế Hoạch');

  // Lead Source Form State
  const [sourceName, setSourceName] = useState('');
  const [sourcePct, setSourcePct] = useState('');
  const [sourceCount, setSourceCount] = useState<number | ''>('');
  const [sourceConversion, setSourceConversion] = useState<number | ''>('');

  // Tổng số lead để tính tỷ trọng thật (thay vì chuỗi % tự do).
  const totalLeadCount = leads.reduce((s: number, l: any) => s + (Number(l.leadCount) || 0), 0);

  const fetchMktData = async () => {
    setLoading(true);
    try {
      const [campsData, leadsData] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-mkt', 'campaigns'),
        departmentWorkspaceService.getRecords('dept-mkt', 'leads')
      ]);
      setCampaigns(campsData);
      setLeads(leadsData);
    } catch (err) {
      console.error('Error fetching marketing records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMktData();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campTitle.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-mkt', 'campaigns', {
        title: campTitle.trim(),
        channels: campChannels,
        status: campStatus
      });
      setIsAddCampaignOpen(false);
      setCampTitle('');
      setCampChannels('');
      setCampStatus('Đang Lên Kế Hoạch');
      fetchMktData();
    } catch (err) {
      console.error('Error creating campaign:', err);
      showToast({ type: 'error', title: 'Tạo chiến dịch thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const CAMP_STAGES = ['Đang Lên Kế Hoạch', 'Đang Dựng Media', 'Đã Phát Hành'];
  const nextCampStage = (s: string) => {
    const i = CAMP_STAGES.indexOf(s);
    return i >= 0 && i < CAMP_STAGES.length - 1 ? CAMP_STAGES[i + 1] : null;
  };

  const handleAdvanceCampaign = async (camp: any) => {
    const next = nextCampStage(camp.status);
    if (!next) return;
    try {
      await departmentWorkspaceService.updateRecord('dept-mkt', 'campaigns', camp.id, {
        ...camp,
        status: next
      });
      fetchMktData();
    } catch (err) {
      console.error('Error advancing campaign:', err);
      showToast({ type: 'error', title: 'Chuyển trạng thái thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  // Chuỗi Marketing -> Sales: giao lead từ chiến dịch (chống trùng theo tên).
  const handleHandoffToSales = async (camp: any) => {
    try {
      const existing = await departmentWorkspaceService.getRecords('dept-sales', 'leads');
      const leadName = `Lead từ chiến dịch ${camp.title}`;
      if ((existing || []).some((l: any) => l.name === leadName)) {
        showToast({ type: 'info', title: 'Đã giao trước đó', message: 'Chiến dịch này đã có lead bên Kinh doanh.' });
        return;
      }
      await departmentWorkspaceService.createRecord('dept-sales', 'leads', {
        name: leadName,
        value: 0,
        capacity: '',
        contact: '',
        stage: 'lead',
        sent: false
      });
      showToast({ type: 'success', title: 'Đã giao Sales', message: 'Lead đã chuyển sang pipeline Kinh doanh.' });
    } catch (err) {
      console.error('Error handing off to sales:', err);
      showToast({ type: 'error', title: 'Giao Sales thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const handleCreateLeadSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-mkt', 'leads', {
        source: sourceName.trim(),
        percentage: sourcePct.trim(),
        leadCount: Number(sourceCount) || 0,
        conversion: Number(sourceConversion) || 0
      });
      setIsAddLeadSourceOpen(false);
      setSourceName('');
      setSourcePct('');
      setSourceCount('');
      setSourceConversion('');
      fetchMktData();
    } catch (err) {
      console.error('Error creating lead source:', err);
      showToast({ type: 'error', title: 'Thêm nguồn lead thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Marketing Header Banner */}
      <div className="bg-gradient-to-r from-pink-700 via-rose-700 to-pink-800 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-pink-900/50 rounded-xl border border-pink-400/30">
              <Megaphone size={28} className="text-pink-300" />
            </div>
            <h2 className="text-3xl font-black">Marketing Studio</h2>
          </div>
          <p className="text-pink-100 text-sm max-w-2xl leading-relaxed">
            Quảng bá thương hiệu Năng Lượng Xanh Trần Lê, sản xuất nội dung số, tổ chức hội thảo Solar Expo và tạo nguồn Lead khách hàng.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Button
            onClick={() => setIsAddCampaignOpen(true)}
            className="bg-white hover:bg-gray-100 text-pink-700 font-bold text-xs px-4 py-2.5 shadow-lg rounded-xl transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Lập Chiến Dịch Mới
          </Button>
          <Button
            onClick={() => setIsAddLeadSourceOpen(true)}
            className="bg-pink-900/60 hover:bg-pink-900 text-white border border-pink-400/30 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
          >
            <BarChart3 size={16} /> Thêm Nguồn Leads
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Lịch Biên Tập Nội Dung & Chiến Dịch ({campaigns.length})
            </h3>
            <Button size="sm" onClick={() => setIsAddCampaignOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Thêm Chiến Dịch
            </Button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="animate-spin inline text-pink-500" size={24} /></div>
            ) : campaigns.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Chưa có kế hoạch nội dung / chiến dịch nào</div>
            ) : campaigns.map(camp => (
              <div key={camp.id} className="p-4 bg-gray-50 dark:bg-slate-700/40 rounded-2xl border border-gray-100 dark:border-slate-600 flex justify-between items-center gap-2">
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white">{camp.title}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Kênh: {camp.channels}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleHandoffToSales(camp)}
                    title="Giao lead sang pipeline Kinh doanh"
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-200"
                  >
                    Giao Sales
                  </button>
                  {nextCampStage(camp.status) && (
                    <button
                      onClick={() => handleAdvanceCampaign(camp)}
                      title={`Chuyển sang ${nextCampStage(camp.status)}`}
                      className="text-[11px] font-bold text-pink-600 hover:text-pink-800 hover:bg-pink-50 px-2 py-1 rounded-lg border border-pink-200"
                    >
                      Tiếp →
                    </button>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    camp.status === 'Đang Dựng Media' ? 'bg-pink-100 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300' :
                    'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  }`}>{camp.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Tỷ Trọng Nguồn Leads ({leads.length})
            </h3>
            <Button size="sm" onClick={() => setIsAddLeadSourceOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Thêm Nguồn
            </Button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="animate-spin inline text-pink-500" size={24} /></div>
            ) : leads.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Chưa có dữ liệu nguồn lead</div>
            ) : leads.map((lead) => {
              const count = Number(lead.leadCount) || 0;
              const conv = Number(lead.conversion) || 0;
              const share = totalLeadCount > 0 ? Math.round((count / totalLeadCount) * 100) : 0;
              const tone = conv >= 20 ? 'text-emerald-600' : conv >= 10 ? 'text-blue-600' : 'text-purple-600';
              const bar = conv >= 20 ? 'bg-emerald-500' : conv >= 10 ? 'bg-blue-500' : 'bg-purple-500';
              return (
              <div key={lead.id} className="p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{lead.source}</span>
                  <span className={`font-black text-sm ${tone}`}>{count} lead • {share}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${bar}`} style={{ width: `${share}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Tỷ lệ chốt: {conv}%</span>
                  {lead.percentage && <span>Ghi chú cũ: {lead.percentage}</span>}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL: THÊM CHIẾN DỊCH */}
      {isAddCampaignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-pink-700 to-rose-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Megaphone size={18} /> Lên Kế Hoạch Chiến Dịch Marketing
              </h3>
              <button onClick={() => setIsAddCampaignOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tiêu Đề Chiến Dịch / Bài PR *
                </label>
                <input
                  type="text"
                  required
                  value={campTitle}
                  onChange={(e) => setCampTitle(e.target.value)}
                  placeholder="VD: Giới thiệu giải pháp Biến tần SAJ C6..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Kênh Phân Phối
                </label>
                <input
                  type="text"
                  value={campChannels}
                  onChange={(e) => setCampChannels(e.target.value)}
                  placeholder="Website, Fanpage, Zalo OA, Báo chí..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Trạng Thái
                </label>
                <select
                  value={campStatus}
                  onChange={(e) => setCampStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="Đang Lên Kế Hoạch">Đang Lên Kế Hoạch</option>
                  <option value="Đang Dựng Media">Đang Dựng Media</option>
                  <option value="Đã Phát Hành">Đã Phát Hành</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddCampaignOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-pink-600 hover:bg-pink-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Chiến Dịch'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM NGUỒN LEAD */}
      {isAddLeadSourceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-rose-700 to-pink-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <BarChart3 size={18} /> Thêm Kênh Nguồn Leads
              </h3>
              <button onClick={() => setIsAddLeadSourceOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateLeadSource} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Kênh Nguồn Leads *
                </label>
                <input
                  type="text"
                  required
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="VD: Triển Lãm Solar Expo / Giới Thiệu..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tỷ Trọng Chuyển Đổi (ghi chú cũ, tùy chọn)
                </label>
                <input
                  type="text"
                  value={sourcePct}
                  onChange={(e) => setSourcePct(e.target.value)}
                  placeholder="VD: 25%"
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Số Lead Thu Được *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={sourceCount}
                    onChange={(e) => setSourceCount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 120"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Tỷ Lệ Chốt (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={sourceConversion}
                    onChange={(e) => setSourceConversion(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 15"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddLeadSourceOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Nguồn'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
