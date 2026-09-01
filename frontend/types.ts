
export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent',
}

export enum RecurrenceType {
  NONE = 'None',
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  startDate: string;
  dueDate?: string;
  estimatedEndAt?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignees: string[];
  tags?: string[];
  createdBy: string;
  department: string;
  departmentId?: string;
  teamId?: string;
  projectId?: string;
  milestoneId?: string;
  customerId?: string;
  taskType?: string;
  estimatedHours?: number;
  actualHours?: number;
  requiresApproval?: boolean | number;
  approvalStatus?: string;
  approvedBy?: string;
  completedAt?: string;
  departmentName?: string;
  teamName?: string;
  projectName?: string;
  recurrence?: RecurrenceType;
  subtasks?: Subtask[];
  comments?: Comment[];
  contractId?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  reminderAt?: string; // ISO datetime string, optional
  userId?: string;     // owner – private notes
}

// Core roles are the 4 built-in system roles.
// The type is kept open (| string) to support custom roles created via Admin panel.
export type UserRole = 'Admin' | 'Director' | 'Manager' | 'Employee' | (string & {});

export type ReportStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected';

export interface Report {
  id: string;
  title: string;
  content: string;
  authorId: string;
  department: string;
  departmentId?: string;
  status: ReportStatus;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  directorFeedback?: string;
  managerFeedback?: string;
  isDeleted?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  department: string;
  departmentId?: string;
  teamId?: string;
  positionId?: string;
  managerId?: string;
  departmentName?: string;
  teamName?: string;
  positionName?: string;
  managerName?: string;
  avatar: string;
  bio?: string;
  phone?: string;
  dob?: string;
  hometown?: string;
  cccd?: string;
  gender?: string;
  joinDate?: string;
  permissions?: string[];
  isLocked?: boolean;
  preferences?: {
    reportNotifs?: boolean;
    taskNotifs?: boolean;
    meetingNotifs?: boolean;
    emailNotifs?: boolean;
    language?: 'vi' | 'en';
    theme?: 'light' | 'dark' | 'system';
  };
}

export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  title: string;
  description: string;
  hostId: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  status: MeetingStatus;
  participants: string[];
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  color: string;
  permissions: string[];
  isSystem: number;
}

export interface Department {
  id: string;
  code?: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  managerId?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: number | boolean;
  userCount?: number;
  taskCount?: number;
  teamCount?: number;
  projectCount?: number;
  manager?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    phone?: string;
  } | null;
}

export interface Team {
  id: string;
  departmentId: string;
  code?: string;
  name: string;
  description?: string;
  managerId?: string;
  color?: string;
  isActive?: number | boolean;
  createdAt?: string;
  departmentName?: string;
  departmentCode?: string;
  userCount?: number;
  taskCount?: number;
  manager?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  } | null;
  members?: User[];
}

export interface Position {
  id: string;
  departmentId?: string;
  teamId?: string;
  code?: string;
  name: string;
  description?: string;
  level?: number;
  isManager?: number | boolean;
  isActive?: number | boolean;
  createdAt?: string;
  departmentName?: string;
  teamName?: string;
  userCount?: number;
}

export interface OrganizationTreeDepartment extends Department {
  members: User[];
  teams: (Team & {
    positions?: Position[];
    memberCount?: number;
  })[];
  memberCount?: number;
}

export interface OrganizationTreeResponse {
  company: {
    name: string;
    brand: string;
    mission: string;
    primaryColor: string;
  };
  departments: OrganizationTreeDepartment[];
}

export interface DepartmentRequest {
  id: string;
  requestNumber: string;
  sourceDepartmentId: string;
  targetDepartmentId: string;
  requesterId: string;
  assigneeId?: string;
  title: string;
  description?: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'pending' | 'in_review' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
  relatedEntityType?: string;
  relatedEntityId?: string;
  dueDate?: string;
  attachments?: string[];
  outputData?: any;
  createdAt: string;
  updatedAt?: string;
  sourceDepartmentName?: string;
  sourceDepartmentCode?: string;
  sourceDepartmentColor?: string;
  targetDepartmentName?: string;
  targetDepartmentCode?: string;
  targetDepartmentColor?: string;
  requesterName?: string;
  requesterAvatar?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
}

export interface ApprovalItem {
  id: string;
  approvalCode: string;
  entityType: 'task' | 'request' | 'quotation' | 'discount' | 'purchase_order' | 'payment' | 'project' | 'contract' | 'leave' | 'design';
  entityId: string;
  title: string;
  amount?: number;
  requestedBy: string;
  departmentId?: string;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  comment?: string;
  requestedAt: string;
  respondedAt?: string;
  requesterName?: string;
  requesterAvatar?: string;
  requesterEmail?: string;
  approverName?: string;
  approverAvatar?: string;
  departmentName?: string;
  departmentCode?: string;
}

export interface TaskTemplate {
  id: string;
  departmentId: string;
  code: string;
  title: string;
  description?: string;
  estimatedHours?: number;
  priority: string;
  taskType: string;
  checklist: Array<{ id?: string; title: string; isCompleted?: boolean | number }>;
  defaultTags: string[];
  requiresApproval?: boolean | number;
  createdAt?: string;
  departmentName?: string;
  departmentCode?: string;
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  email: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  clientName: string;
  contractName: string;
  preTaxValue?: number;
  postTaxValue?: number;
  invoiceDate?: string;
  invoiceNumber?: string;
  department: string;
  departmentId?: string;
  status?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: number;
  projectId?: string;
  products?: any[];
  vatRate?: number;
  attachments?: string[];
  paidAmount?: number;
  contractType?: 'output' | 'input';
  supplierName?: string;
  documentChecklist?: any;
  signedDate?: string;
  startDate?: string;
  endDate?: string;
  warrantyMonths?: number;
  payments?: any[];
  docSentDate?: string;
  docReceivedDate?: string;
  docAccountantDate?: string;
  docReceiver?: string;
  docAccountantUserId?: string;
  docAccountantStatus?: string;
  approvalFeedback?: string;
}

export interface RevenueReport {
  id: string;
  title: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  content?: string;
  totalPreTax?: number;
  totalDelivered?: number;
  totalCumulative?: number;
  authorId: string;
  department: string;
  departmentId?: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  managerFeedback?: string;
  directorFeedback?: string;
  createdAt: string;
  submittedAt?: string;
  isDeleted?: number;
}

export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProjectPhase = 'initiation' | 'planning' | 'execution' | 'monitoring' | 'closure';

export interface ProjectDepartment {
  projectId?: string;
  departmentId: string;
  role?: 'lead' | 'design' | 'procurement' | 'construction' | 'om' | 'legal' | 'member' | string;
  departmentName?: string;
  departmentCode?: string;
  departmentColor?: string;
}

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  clientName?: string;
  department?: string;
  departmentId?: string;
  primaryDepartmentId?: string;
  managerId?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  description?: string;
  biddingCode?: string;
  biddingDate?: string;
  procurementMethod?: string;
  investor?: string;
  biddingPrice?: number;
  winningPrice?: number;
  priority?: ProjectPriority;
  phase?: ProjectPhase;
  participatingDepartments?: ProjectDepartment[];
  createdAt: string;
  updatedAt?: string;
  isDeleted?: number;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  dueDate?: string;
  completedAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  sortOrder: number;
  createdAt: string;
}

export interface ProjectReport {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  progress?: number;
  authorId: string;
  status: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  region?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  unit?: string;
  origin?: string;
  defaultPrice?: number;
  createdAt: string;
}
