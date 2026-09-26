// Quy ước hiển thị trạng thái dùng chung cho 13 workspace.
// DB lưu nhiều biến thể (pending/open/Title Case/tiếng Việt) — helper này chỉ chuẩn hóa
// LỚP HIỂN THỊ, không đổi dữ liệu gốc. Giá trị lạ trả về nguyên văn (fail-open).

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  open: 'Đang mở',
  active: 'Đang hoạt động',
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang thực hiện',
  'in progress': 'Đang thực hiện',
  investigating: 'Đang điều tra',
  contacting: 'Đang liên hệ',
  screening: 'Sàng lọc',
  completed: 'Hoàn thành',
  done: 'Hoàn thành',
  resolved: 'Đã xử lý',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  shipped: 'Đã xuất',
  paid: 'Đã chi',
  collected: 'Đã thu',
  won: 'Đã thắng',
  lost: 'Đã thua',
  cancelled: 'Đã hủy',
  closed: 'Đã đóng',
  overdue: 'Quá hạn',
  on_leave: 'Nghỉ phép',
  on_trip: 'Công tác',
  critical: 'Nghiêm trọng',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
  urgent: 'Khẩn cấp',
};

export const statusLabel = (status: unknown): string => {
  const raw = String(status ?? '').trim();
  if (!raw) return '—';
  return STATUS_LABELS[raw.toLowerCase()] || raw;
};
