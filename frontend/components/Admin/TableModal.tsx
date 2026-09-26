import React from 'react';
import { motion } from 'motion/react';
import { XCircle, Database, RefreshCw } from 'lucide-react';

interface TableModalProps {
  visible: boolean;
  table: string;
  title: string;
  data: any[];
  loading: boolean;
  onClose: () => void;
}

export function TableModal({ visible, table, title, data, loading, onClose }: TableModalProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-100 text-brand-600">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                {title}
              </h3>
              <p className="text-xs text-gray-500">Bản ghi hệ thống (tối đa 20)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XCircle size={20} />
          </button>
        </div>
        <div className="p-0 overflow-y-auto flex-1 bg-white">
          {loading ? (
            <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-gray-400" size={32} /></div>
          ) : data.length === 0 ? (
            <p className="text-center text-gray-400 py-20">Không có dữ liệu</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-200">
                  <tr>
                    {Object.keys(data[0] || {}).filter(k => k !== 'password' && k !== 'passwordHash').map(key => (
                      <th key={key} className="px-4 py-3 font-semibold">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-brand-50/30">
                      {Object.entries(row).filter(([k]) => k !== 'password' && k !== 'passwordHash').map(([k, v]: [string, any], i) => (
                        <td key={i} className="px-4 py-3 text-gray-600 truncate max-w-[200px]" title={String(v)}>
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}