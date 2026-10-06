export interface Email {
  id: number;
  subject: string;
  from: string;
  fromName: string;
  to?: string;
  toName?: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  folder?: string;
}

export interface FullEmail extends Email {
  html: string;
  attachments: { filename: string; contentType: string; size: number; content: string | null }[];
  /** Tổng số attachment thật sự có trong thư. */
  attachmentCount?: number;
  /**
   * Số attachment bị giữ lại (tên + dung lượng) nhưng không nhúng bytes vào
   * response vì vượt ngân sách. Cần hiện ra để người dùng không tải về file rỗng
   * mà tưởng là tải hỏng.
   */
  attachmentsOmitted?: number;
}

export type FolderKey = 'inbox' | 'sent' | 'starred' | 'trash' | 'drafts';

export interface Contact {
  id: string | null;
  name: string;
  email: string;
  department: string;
  avatar: string;
  source: 'company' | 'external';
}
