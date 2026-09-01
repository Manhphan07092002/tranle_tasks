import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Upload, Download, Search, Filter, Folder, 
  FileCheck, Trash2, Eye, Plus, Loader2, Sparkles
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { apiFetch } from '../../../services/api';

interface DepartmentDocsTabProps {
  departmentId: string;
  currentDept: any;
  deptMembers: any[];
}

const CATEGORIES = [
  'Tất cả',
  'Quy trình & Hướng dẫn',
  'Biểu mẫu & Template',
  'Bản vẽ & Kỹ thuật',
  'Hợp đồng & Biên bản',
  'Khác'
];

export const DepartmentDocsTab: React.FC<DepartmentDocsTabProps> = ({
  departmentId,
  currentDept,
  deptMembers
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Upload Form State
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Quy trình & Hướng dẫn');
  const [docDesc, setDocDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/documents?departmentId=${departmentId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : (data.documents || []));
      }
    } catch (err) {
      console.error('Error fetching department documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [departmentId]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await apiFetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle.trim(),
          category: docCategory,
          description: docDesc,
          departmentId: departmentId,
          department: currentDept?.name,
          fileType: 'PDF/DOCX',
          fileSize: '1.2 MB',
          uploadedAt: new Date().toISOString()
        })
      });

      if (res.ok) {
        setIsUploadOpen(false);
        setDocTitle('');
        setDocDesc('');
        fetchDocs();
      }
    } catch (err) {
      console.error('Error uploading document:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchCat = selectedCategory === 'Tất cả' || doc.category === selectedCategory;
      const matchSearch = !searchQuery.trim() || 
        (doc.title && doc.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [documents, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP HEADER & UPLOAD ACTION */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Kho Tài Liệu & Hồ Sơ — Phòng {currentDept?.name}
            </h2>
            <p className="text-xs text-slate-400">
              Lưu trữ quy trình nội bộ, hồ sơ kỹ thuật, biểu mẫu chuẩn ISO & tài liệu lưu hành nội bộ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm"
          >
            <Upload size={16} /> Tải Lên Tài Liệu Mới
          </Button>
        </div>
      </div>

      {/* 2. FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tài liệu..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* 3. DOCUMENTS TABLE / GRID */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="animate-spin text-emerald-600" size={28} />
            <span className="text-xs">Đang tải danh sách tài liệu...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
              <Folder size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Chưa có tài liệu nào trong danh mục này</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tải lên tài liệu quy định, biểu mẫu chuẩn hoặc hồ sơ kỹ thuật để chia sẻ với các thành viên trong phòng ban.
            </p>
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              <Upload size={14} className="mr-1.5" /> Tải Lên Ngay
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Tên Tài Liệu</th>
                  <th className="px-6 py-4">Chuyên Mục</th>
                  <th className="px-6 py-4">Dung Lượng</th>
                  <th className="px-6 py-4">Ngày Đăng</th>
                  <th className="px-6 py-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
                          <FileCheck size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{doc.title}</div>
                          {doc.description && <div className="text-[11px] text-slate-400 mt-0.5">{doc.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      <span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg text-[11px]">
                        {doc.category || 'Khác'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {doc.fileSize || '1.2 MB'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('vi-VN') : 'Mới cập nhật'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors" title="Xem / Tải về">
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. MODAL: UPLOAD DOCUMENT */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload size={18} className="text-emerald-600" /> Tải Lên Tài Liệu Phòng Ban
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tiêu Đề Tài Liệu *
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="VD: Quy trình nghiệm thu đóng điện AC/DC..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Chuyên Mục Phân Loại *
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {CATEGORIES.filter(c => c !== 'Tất cả').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Ghi Chú / Tóm Tắt Nội Dung
                </label>
                <textarea
                  rows={3}
                  value={docDesc}
                  onChange={(e) => setDocDesc(e.target.value)}
                  placeholder="Mô tả tóm lược phạm vi áp dụng, đối tượng ban hành..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Tài Liệu'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
