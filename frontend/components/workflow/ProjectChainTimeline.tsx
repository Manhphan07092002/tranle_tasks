import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '../UI';
import { useNotifications } from '../../contexts/NotificationContext';
import { departmentWorkspaceService } from '../../services/departmentWorkspaceService';
import { getProjectMilestones } from '../../services/projectService';

interface ChainStep {
  key: string;
  label: string;
  state: 'done' | 'active' | 'pending';
  detail: string;
  actionLabel?: string;
  onAction?: () => Promise<void>;
}

interface Props {
  project: any;
  onChanged?: () => void;
}

// Dòng đời dự án EPC: 11 mắt nối liên phòng ban theo projectId/tên.
// Mỗi mắt: done (xanh) / active-cần làm (xanh dương + nút hành động) / pending (xám).
export const ProjectChainTimeline: React.FC<Props> = ({ project, onChanged }) => {
  const { showToast } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<ChainStep[]>([]);

  const refresh = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const [
        leads, engRequests, designs, prs, pos, inbounds, outbounds,
        milestones, ars, omSchedules, renewals,
      ] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-sales', 'leads'),
        departmentWorkspaceService.getRecords('dept-eng', 'requests'),
        departmentWorkspaceService.getRecords('dept-eng', 'design'),
        departmentWorkspaceService.getRecords('dept-proc', 'prs'),
        departmentWorkspaceService.getRecords('dept-proc', 'pos'),
        departmentWorkspaceService.getRecords('dept-wh', 'inbound'),
        departmentWorkspaceService.getRecords('dept-wh', 'outbound'),
        getProjectMilestones(project.id).catch(() => []),
        departmentWorkspaceService.getRecords('dept-fin', 'ar'),
        departmentWorkspaceService.getRecords('dept-om', 'pm'),
        departmentWorkspaceService.getRecords('dept-cs', 'renewals'),
      ]);

      const name = project.name || '';
      const lead = (leads || []).find((l: any) => project.leadId && l.id === project.leadId);
      const reqs = (engRequests || []).filter((r: any) => r.project === name);
      const des = (designs || []).filter((d: any) => d.project === name);
      const desIds = new Set(des.map((d: any) => d.id));
      const prList = (prs || []).filter((p: any) => p.project === name || (p.designId && desIds.has(p.designId)));
      const prIds = new Set(prList.map((p: any) => p.id));
      const poList = (pos || []).filter((p: any) => (p.prId && prIds.has(p.prId)));
      const poIds = new Set(poList.map((p: any) => p.id));
      const inbList = (inbounds || []).filter((b: any) => (b.poId && poIds.has(b.poId)));
      const outList = (outbounds || []).filter((o: any) => o.projectId === project.id || o.project === name);
      const msDone = (milestones || []).filter((m: any) => m.status === 'completed');
      const msIds = new Set((milestones || []).map((m: any) => m.id));
      const arList = (ars || []).filter((a: any) =>
        (a.milestoneId && msIds.has(a.milestoneId)) || a.projectId === project.id || a.project === name
      );
      const omList = (omSchedules || []).filter((s: any) => s.site === name);
      const handover = omList.find((s: any) => /bàn giao/i.test(s.task || ''));
      const rnList = (renewals || []).filter((r: any) =>
        r.customer === name || String(r.customer || '').includes(name.slice(0, 12)) || name.includes(String(r.customer || '').slice(0, 12))
      );

      const runAction = async (fn: () => Promise<any>, okMsg: string, failMsg: string) => {
        try {
          const res = await fn();
          showToast({ type: 'success', title: 'Đã chuyển tiếp', message: res?.message || okMsg });
          onChanged?.();
          await refresh();
        } catch (err) {
          console.error(err);
          showToast({ type: 'error', title: 'Chuyển tiếp thất bại', message: failMsg });
        }
      };

      const firstMsWithoutAr = (milestones || []).find(
        (m: any) => m.status === 'completed' && !arList.some((a: any) => a.milestoneId === m.id)
      );
      const projectDone = /hoàn thành|done|complete|nghiệm thu|warranty/i.test(String(project.status || ''));

      const list: ChainStep[] = [
        {
          key: 'lead', label: 'Lead chốt (Kinh doanh)',
          state: lead ? (lead.stage === 'won' ? 'done' : 'active') : 'pending',
          detail: lead ? `${lead.name} • stage: ${lead.stage}` : 'Chưa gắn lead nguồn',
        },
        { key: 'project', label: 'Dự án khởi tạo', state: 'done', detail: `${name}` },
        {
          key: 'survey', label: 'Khảo sát hiện trường (Kỹ thuật)',
          state: reqs.length > 0 ? 'done' : 'active',
          detail: reqs.length > 0 ? `${reqs.length} yêu cầu khảo sát` : 'Chưa có yêu cầu khảo sát',
          actionLabel: reqs.length === 0 ? 'Tạo YC khảo sát' : undefined,
          onAction: reqs.length === 0 ? () => runAction(
            () => departmentWorkspaceService.createRecord('dept-eng', 'requests', {
              project: name, type: 'Khảo Sát Mái', priority: 'MEDIUM',
              date: new Date().toISOString().slice(0, 10), status: 'pending',
            }),
            'Đã tạo yêu cầu khảo sát cho Kỹ thuật.', 'Vui lòng thử lại.'
          ) : undefined,
        },
        {
          key: 'design', label: 'Thiết kế / BOM (Kỹ thuật)',
          state: des.length > 0 ? 'done' : 'active',
          detail: des.length > 0 ? `${des.length} hồ sơ thiết kế` : 'Chưa có hồ sơ thiết kế',
          actionLabel: des.length === 0 ? 'Tạo hồ sơ nháp' : undefined,
          onAction: des.length === 0 ? () => runAction(
            () => departmentWorkspaceService.createRecord('dept-eng', 'design', {
              name: `Hồ sơ ${name}`, capacity: '', stage: 'Bản vẽ 1 sợi SLD',
              progress: 0, tasks: [], status: 'active', project: name,
            }),
            'Đã tạo hồ sơ thiết kế nháp.', 'Vui lòng thử lại.'
          ) : undefined,
        },
        {
          key: 'pr', label: 'Đề xuất mua hàng PR',
          state: prList.length > 0 ? 'done' : des.length > 0 ? 'active' : 'pending',
          detail: prList.length > 0 ? `${prList.length} phiếu PR` : 'Chưa có PR',
          actionLabel: prList.length === 0 && des.length > 0 ? 'Chốt BOM → PR' : undefined,
          onAction: prList.length === 0 && des.length > 0 ? () => runAction(
            () => departmentWorkspaceService.convertDesignToPr({ designId: des[0].id, projectName: name }),
            'Đã sinh PR từ hồ sơ thiết kế.', 'Vui lòng thử lại.'
          ) : undefined,
        },
        {
          key: 'po', label: 'Đơn đặt hàng PO',
          state: poList.length > 0 ? 'done' : prList.length > 0 ? 'active' : 'pending',
          detail: poList.length > 0 ? `${poList.length} PO liên kết` : 'Chưa có PO từ PR',
          actionLabel: poList.length === 0 && prList.length > 0 ? 'Chuyển PR → PO' : undefined,
          onAction: poList.length === 0 && prList.length > 0 ? () => runAction(
            () => departmentWorkspaceService.prToPo(prList[0].id),
            'Đã sinh PO nháp từ PR.', 'Vui lòng thử lại.'
          ) : undefined,
        },
        {
          key: 'inbound', label: 'Nhập kho',
          state: inbList.length > 0 ? 'done' : poList.length > 0 ? 'active' : 'pending',
          detail: inbList.length > 0 ? `${inbList.length} phiếu nhập từ PO` : 'Chưa báo nhập kho',
          actionLabel: inbList.length === 0 && poList.length > 0 ? 'Báo nhập kho' : undefined,
          onAction: inbList.length === 0 && poList.length > 0 ? () => runAction(
            () => departmentWorkspaceService.poToInbound(poList[0].id),
            'Đã báo nhập kho chờ.', 'Vui lòng thử lại.'
          ) : undefined,
        },
        {
          key: 'outbound', label: 'Xuất kho ra site',
          state: outList.length > 0 ? 'done' : 'active',
          detail: outList.length > 0 ? `${outList.length} phiếu xuất cho site` : 'Xuất kho ở tab Kho Vận (chọn đúng dự án)',
        },
        {
          key: 'milestone', label: 'Nghiệm thu mốc + AR',
          state: (milestones || []).length > 0 && msDone.length === (milestones || []).length && arList.length > 0
            ? 'done' : 'active',
          detail: `${msDone.length}/${(milestones || []).length} mốc xong • ${arList.length} AR`,
          actionLabel: firstMsWithoutAr ? `Tạo AR mốc "${firstMsWithoutAr.title}"` : undefined,
          onAction: firstMsWithoutAr ? () => runAction(
            () => departmentWorkspaceService.convertMilestoneToAr({
              milestoneId: firstMsWithoutAr.id, projectId: project.id,
              projectName: name, milestoneTitle: firstMsWithoutAr.title,
              amount: 0, customer: project.clientName || 'Chủ đầu tư', dueDate: firstMsWithoutAr.dueDate,
            }),
            'Đã tạo AR từ mốc nghiệm thu.', 'Vui lòng thử lại.'
          ) : undefined,
        },
        {
          key: 'handover', label: 'Bàn giao vận hành O&M',
          state: project.status === 'warranty' || !!handover ? 'done' : projectDone ? 'active' : 'pending',
          detail: handover ? `Đã bàn giao (${handover.date})` : project.status === 'warranty' ? 'Đang bảo hành' : 'Chưa bàn giao',
          actionLabel: projectDone && project.status !== 'warranty' && !handover ? 'Bàn giao O&M' : undefined,
          onAction: projectDone && project.status !== 'warranty' && !handover ? () => runAction(
            () => departmentWorkspaceService.codToOm(project.id),
            'Đã bàn giao dự án sang O&M.', 'Vui lòng thử lại.'
          ) : undefined,
        },
        {
          key: 'renewal', label: 'Tái ký bảo trì',
          state: rnList.length > 0 ? 'done' : 'pending',
          detail: rnList.length > 0 ? `${rnList.length} hợp đồng tái ký liên quan` : 'Hệ thống tự nhắc trước hết hạn 90 ngày',
        },
      ];

      setSteps(list);
    } catch (err) {
      console.error('Error loading project chain:', err);
    } finally {
      setLoading(false);
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) {
    return (
      <div className="py-10 flex justify-center text-slate-400">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((s, i) => (
        <div key={s.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${
              s.state === 'done'
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : s.state === 'active'
                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                  : 'bg-slate-100 border-slate-300 text-slate-400'
            }`}>
              {s.state === 'done' ? <CheckCircle2 size={16} /> : <Circle size={14} />}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-0.5 flex-1 min-h-[14px] ${s.state === 'done' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}
          </div>
          <div className="pb-5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {i + 1}. {s.label}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                s.state === 'done' ? 'bg-emerald-100 text-emerald-700' :
                s.state === 'active' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {s.state === 'done' ? 'Xong' : s.state === 'active' ? 'Cần làm' : 'Chờ'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{s.detail}</div>
            {s.onAction && s.actionLabel && (
              <Button
                size="sm"
                onClick={s.onAction}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
              >
                {s.actionLabel} <ArrowRight size={12} className="ml-1" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
