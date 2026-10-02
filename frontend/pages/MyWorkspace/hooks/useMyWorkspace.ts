import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { getMeetings } from '../../../services/meetingService';
import { apiFetch } from '../../../services/api';
import { TaskStatus, type Meeting, type Task } from '../../../types';

function toDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Tổng hợp read-only "việc của tôi" từ DataContext + Auth + Notifications. */
export function useMyWorkspace() {
  const { user } = useAuth();
  const { tasks, approvals, isLoading } = useData();
  const { notifications, unreadCount: unreadNotifications } = useNotifications();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [unreadMail, setUnreadMail] = useState(0);

  const userId = (user as any)?.id as string | undefined;
  const todayStr = toDay(new Date());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const all = await getMeetings();
        if (mounted) setMeetings(Array.isArray(all) ? all : []);
      } catch {
        if (mounted) setMeetings([]);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch('/api/mail/unread-count');
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setUnreadMail(Number(data?.count ?? 0));
        }
      } catch {
        if (mounted) setUnreadMail(0);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const myTasks = useMemo<Task[]>(
    () => (tasks || []).filter((t: Task) => userId && (t.assignees || []).includes(userId)),
    [tasks, userId],
  );

  const openTasks = useMemo(
    () => myTasks.filter((t) => t.status !== TaskStatus.DONE),
    [myTasks],
  );

  const overdueTasks = useMemo(
    () => openTasks.filter((t) => t.dueDate && t.dueDate < todayStr),
    [openTasks, todayStr],
  );

  const todayTasks = useMemo(
    () => openTasks.filter((t) => t.dueDate === todayStr),
    [openTasks, todayStr],
  );

  const pendingApprovalsForMe = useMemo(
    () => (approvals || []).filter((a) => a.status === 'pending' && (a.approverId === userId)),
    [approvals, userId],
  );

  const todayMeetings = useMemo(
    () => meetings.filter((m) => userId && (m.participants || []).includes(userId) && (m.startTime || '').slice(0, 10) === todayStr),
    [meetings, userId, todayStr],
  );

  const completionRate = useMemo(() => {
    if (myTasks.length === 0) return null;
    const done = myTasks.filter((t) => t.status === TaskStatus.DONE).length;
    return Math.round((done / myTasks.length) * 100);
  }, [myTasks]);

  return {
    user,
    userId,
    todayStr,
    isLoading,
    myTasks,
    openTasks,
    overdueTasks,
    todayTasks,
    pendingApprovalsForMe,
    todayMeetings,
    notifications,
    unreadNotifications,
    unreadMail,
    completionRate,
  };
}
