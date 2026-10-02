import { Navigate } from 'react-router-dom';
import { DEFAULT_MY_SECTION, buildMyWorkPath } from './mySections';

/** /my-work -> section mặc định (today). */
export default function MyWorkspaceDefault() {
  return <Navigate to={buildMyWorkPath(DEFAULT_MY_SECTION)} replace />;
}
