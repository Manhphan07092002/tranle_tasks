import { Navigate, useParams } from 'react-router-dom';
import { DEFAULT_PROJECT_SECTION, buildProjectWorkspacePath } from './projSections';

/** /projects/:projectId/workspace -> section mặc định. */
export default function ProjectWorkspaceDefault() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return <Navigate to="/projects" replace />;
  return <Navigate to={buildProjectWorkspacePath(projectId, DEFAULT_PROJECT_SECTION)} replace />;
}
