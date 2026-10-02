import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '../../../../components/UI';

interface InterviewTabProps {
  interviewRecords: any[];
  recruitmentRecords: any[];
  onCreate: (data: {
    candidateName: string; recruitmentId: string | null; round: string;
    scheduleDate: string; interviewers: string; note: string;
  }) => Promise<void>;
  onResult: (iv: any, result: 'passed' | 'failed' | 'cancelled') => Promise<void>;
  isSubmitting: boolean;
}

const ROUNDS = ['Screening', 'Interview', 'Offer', 'Hired'];

export function interviewResultMeta(result: string) {
  if (result === 'passed') return { label: 'Đạt', cls: 'bg-emerald-100 text-emerald-700' };
  if (result === 'failed') return { label: 'Trượt', cls: 'bg-rose-100 text-rose-700' };
  if (result === 'cancelled') return { label: 'Hủy', cls: 'bg-slate-200 text-slate-500' };
  return { label: 'Đã lên lịch', cls: 'bg-blue-100 text-blue-700' };
}

/** Tab lịch phỏng vấn ứng viên — tách từ HrWorkspace để file cha <800 dòng. */
export const InterviewTab: React.FC<InterviewTabProps> = ({
  interviewRecords, recruitmentRecords, onCreate, onResult, isSubmitting,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [candidate, setCandidate] = useState('');
  const [recruitmentId, setRecruitmentId] = useState('');
  const [round, setRound] = useState('Screening');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [interviewers, setInterviewers] = useState('');
  const [note, setNote] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate.trim() || !date) return;
    await onCreate({
      candidateName: candidate.trim(),
      recruitmentId: recruitmentId || null,
      round,
      scheduleDate: date,
      interviewers: interviewers.trim(),
      note: note.trim(),
    });
    setIsOpen(false);
    setCandidate('');
    setRecruitmentId('');
    setRound('Screening');
    setDate(new Date().toISOString().split('T')[0]);
    setInterviewers('');
    setNote('');
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lịch Phỏng Vấn Ứng Viên</span>
        <Button size="sm" onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl">
          <Plus size={14} className="mr-1" /> Lên Lịch Phỏng Vấn
        </Button>
      </div>

      {interviewRecords.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">Chưa có lịch phỏng vấn nào</div>
      ) : (
        interviewRecords.map((iv) => {
          const meta = interviewResultMeta(iv.result);
          const job = recruitmentRecords.find((j: any) => j.id === iv.recruitmentId);
          return (
            <div key={iv.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center gap-3">
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{iv.candidateName}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {job ? `${job.title} • ` : ''}{iv.round} • {iv.scheduleDate}{iv.interviewers ? ` • PV: ${iv.interviewers}` : ''}
                </div>
                {iv.note && <div className="text-xs text-slate-500 mt-0.5 italic">{iv.note}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${meta.cls}`}>
                  {meta.label}
                </span>
                {iv.result === 'scheduled' && (
                  <>
                    <Button size="sm" onClick={() => onResult(iv, 'passed')} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                      Đạt
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onResult(iv, 'failed')} className="text-xs font-bold rounded-xl">
                      Trượt
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form onSubmit={submit} className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
              <h3 className="font-black text-sm">Lên Lịch Phỏng Vấn</h3>
              <button type="button" onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <input value={candidate} onChange={(e) => setCandidate(e.target.value)} placeholder="Tên ứng viên" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-200" />
              <select value={recruitmentId} onChange={(e) => setRecruitmentId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 outline-none">
                <option value="">— Chọn tin tuyển dụng (không bắt buộc) —</option>
                {recruitmentRecords.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select value={round} onChange={(e) => setRound(e.target.value)} className="px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 outline-none">
                  {ROUNDS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 outline-none" />
              </div>
              <input value={interviewers} onChange={(e) => setInterviewers(e.target.value)} placeholder="Người phỏng vấn (VD: Trưởng phòng Kỹ thuật)" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-200" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-200" />
              <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl py-2.5">
                {isSubmitting ? 'Đang lưu...' : 'Tạo Lịch Phỏng Vấn'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
