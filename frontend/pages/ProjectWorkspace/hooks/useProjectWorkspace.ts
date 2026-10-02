import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getProjectDetails } from '../../../services/projectService';
import type { Project } from '../../../types';

interface ProjectWorkspaceState {
  projectId: string;
  project: (Project & { participatingDepartments?: any[] }) | null;
  contracts: any[];
  reports: any[];
  loading: boolean;
  forbidden: boolean;
  reload: () => void;
}

/** Nạp chi tiết dự án theo URL (403 -> forbidden để layout redirect + Toast). */
export function useProjectWorkspace(projectId: string): ProjectWorkspaceState {
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectWorkspaceState['project']>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setForbidden(false);
      try {
        const data = await getProjectDetails(projectId);
        if (!mounted) return;
        setProject(data.project);
        setContracts(Array.isArray(data.contracts) ? data.contracts : []);
        setReports(Array.isArray(data.reports) ? data.reports : []);
      } catch (err: any) {
        if (!mounted) return;
        if ((err as any)?.status === 403) setForbidden(true);
        setProject(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectId, tick, (user as any)?.id]);

  return { projectId, project, contracts, reports, loading, forbidden, reload: () => setTick((t) => t + 1) };
}
