import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Tài khoản hoặc mật khẩu không chính xác.');
        setIsLoading(false);
      }
    } catch {
      setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC] text-[#334155] p-4 sm:p-6">
      
      {/* Top spacer */}
      <div className="w-full max-w-md mx-auto pt-6 sm:pt-12" />

      {/* Main Login Card */}
      <div className="w-full max-w-[420px] mx-auto">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-7">
            <img 
              src="/logo-tranle-dark.png" 
              alt="Tran Le Electricity" 
              className="h-11 w-auto object-contain mb-4" 
            />
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Đăng nhập hệ thống
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              Tran Le Tasks · Quản trị & Điều hành Doanh nghiệp
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten.nhanvien@tranlecorp.com.vn"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 text-sm bg-white text-[#0F172A] placeholder-[#94A3B8] border border-[#CBD5E1] rounded-lg outline-none transition-colors focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#334155]">
                  Mật khẩu
                </label>
                <Link 
                  to="/forgot-password" 
                  className="text-xs font-medium text-[#16A34A] hover:text-[#15803D] hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white text-[#0F172A] placeholder-[#94A3B8] border border-[#CBD5E1] rounded-lg outline-none transition-colors focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#475569]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#64748B]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#CBD5E1] text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] disabled:opacity-60 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          {/* Support Line */}
          <div className="mt-6 pt-4 border-t border-[#F1F5F9] text-center text-xs text-[#64748B]">
            Hỗ trợ kỹ thuật: <a href="tel:0939792428" className="font-semibold text-[#0F172A] hover:text-[#16A34A]">0939 792 428</a>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-[#94A3B8]">
        © {new Date().getFullYear()} Công ty Cổ phần Tư vấn xây dựng Điện Trần Lê. Bảo lưu mọi quyền.
      </footer>

    </div>
  );
};
