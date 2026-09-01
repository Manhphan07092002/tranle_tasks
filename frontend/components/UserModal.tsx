import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { X, User as UserIcon, Mail, Shield, Briefcase, Phone, Calendar, MapPin, Info, CreditCard, Users, Layers, Award, UserCheck } from 'lucide-react';
import { Button } from './UI';
import { useData } from '../contexts/DataContext';
import Flatpickr from 'react-flatpickr';
import { toLocalDateString } from '../utils/dateUtils';
import 'flatpickr/dist/themes/light.css';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  initialUser?: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, initialUser }) => {
  const { roles, departments, teams, positions, users } = useData();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  const defaultRole = roles.length > 0 ? roles[0].name : 'Employee';
  const defaultDept = departments.length > 0 ? departments[0] : null;

  const [role, setRole] = useState<UserRole>(defaultRole);
  const [departmentId, setDepartmentId] = useState<string>(defaultDept?.id || '');
  const [department, setDepartment] = useState<string>(defaultDept?.name || 'Phòng Kỹ Thuật Solar');
  const [teamId, setTeamId] = useState<string>('');
  const [positionId, setPositionId] = useState<string>('');
  const [managerId, setManagerId] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [hometown, setHometown] = useState('');
  const [cccd, setCccd] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [joinDate, setJoinDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialUser) {
        setName(initialUser.name);
        setEmail(initialUser.email);
        setRole(initialUser.role);
        setDepartment(initialUser.department);
        setDepartmentId(initialUser.departmentId || (departments.find(d => d.name === initialUser.department)?.id || ''));
        setTeamId(initialUser.teamId || '');
        setPositionId(initialUser.positionId || '');
        setManagerId(initialUser.managerId || '');
        setAvatarUrl(initialUser.avatar);
        setPhone(initialUser.phone || '');
        setDob(initialUser.dob || '');
        setHometown(initialUser.hometown || '');
        setCccd(initialUser.cccd || '');
        setGender(initialUser.gender || '');
        setBio(initialUser.bio || '');
        setJoinDate(initialUser.joinDate || '');
      } else {
        setName('');
        setEmail('');
        setRole(roles.length > 0 ? roles[0].name : 'Employee');
        const firstDept = departments.length > 0 ? departments[0] : null;
        setDepartmentId(firstDept?.id || '');
        setDepartment(firstDept?.name || 'Phòng Kỹ Thuật Solar');
        setTeamId('');
        setPositionId('');
        setManagerId('');
        setAvatarUrl(`https://picsum.photos/id/${Math.floor(Math.random() * 100)}/50/50`);
        setPhone('');
        setDob('');
        setHometown('');
        setCccd('');
        setGender('');
        setBio('');
        setJoinDate('');
      }
    }
  }, [isOpen, initialUser, roles, departments]);

  const handleDepartmentChange = (deptId: string) => {
    setDepartmentId(deptId);
    const d = departments.find(item => item.id === deptId);
    if (d) setDepartment(d.name);
    // Reset team when department changes
    setTeamId('');
  };

  const availableTeams = teams.filter(t => !departmentId || t.departmentId === departmentId);
  const availablePositions = positions.filter(p => !p.departmentId || p.departmentId === departmentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = {
      id: initialUser ? initialUser.id : `u-${Date.now()}`,
      name,
      email,
      role,
      department,
      departmentId: departmentId || undefined,
      teamId: teamId || undefined,
      positionId: positionId || undefined,
      managerId: managerId || undefined,
      avatar: avatarUrl || 'https://via.placeholder.com/50',
      phone,
      dob,
      hometown,
      cccd,
      gender,
      bio,
      joinDate
    };
    onSave(user);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] border border-gray-200 dark:border-slate-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {initialUser ? 'Chỉnh Sửa Hồ Sơ Nhân Sự' : 'Thêm Nhân Sự Mới'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Tran Le Electricity • Quản trị phòng ban & phân quyền</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
          <form id="user-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Họ và Tên *</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="VD: Nguyễn Văn Đạt"
                  />
                </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Email Công Ty *</label>
                 <div className="relative">
                   <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                   <input 
                     type="email" 
                     required
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                     placeholder="vandat@tranlecorp.com.vn"
                   />
                 </div>
              </div>
            </div>

            {/* Organization Assignment */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-200/80 dark:border-slate-600/80 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                <Briefcase size={15} />
                <span>Phân Bổ Tổ Chức & Chức Danh</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Phòng Ban Phụ Trách *</label>
                  <select 
                    value={departmentId}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code || 'DEPT'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Nhóm Chuyên Môn (Team)</label>
                  <div className="relative">
                    <select 
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">-- Không thuộc nhóm cụ thể --</option>
                      {availableTeams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Chức Danh / Vị Trí</label>
                  <div className="relative">
                    <select 
                      value={positionId}
                      onChange={(e) => setPositionId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">-- Chọn chức danh --</option>
                      {availablePositions.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Level {p.level})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Quản Lý Trực Tiếp (Manager)</label>
                  <select 
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">-- Không có người quản lý trực tiếp --</option>
                    {users.filter(u => u.id !== initialUser?.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role} - {u.department})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Vai Trò Hệ Thống (System Role)</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {roles.length > 0 ? (
                      roles.map(r => <option key={r.id} value={r.name}>{r.name} - {r.description}</option>)
                    ) : (
                      <>
                        <option value="Admin">Admin</option>
                        <option value="Director">Director</option>
                        <option value="Manager">Manager</option>
                        <option value="Employee">Employee</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
              <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Thông Tin Cá Nhân & Liên Hệ</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Số Điện Thoại</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="0939 792 428"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Ngày Sinh</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                      type="date" 
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Quê Quán / Nơi Ở</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      value={hometown}
                      onChange={(e) => setHometown(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Đà Nẵng, Việt Nam"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Ngày Vào Công Ty</label>
                  <Flatpickr
                    value={joinDate ? new Date(joinDate) : ''}
                    onChange={([date]) => setJoinDate(date ? toLocalDateString(date) : '')}
                    options={{ dateFormat: 'd/m/Y' }}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Chọn ngày tham gia"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Tiểu Sử / Giới Thiệu Chuyên Môn</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Kinh nghiệm thiết kế solar, chỉ huy công trình, bảo trì O&M..."
                />
              </div>
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 flex-shrink-0">
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="user-form" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {initialUser ? 'Lưu Thay Đổi' : 'Tạo Nhân Sự'}
          </Button>
        </div>
      </div>
    </div>
  );
};
