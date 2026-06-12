import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        department: form.department,
      });
      toast.success('Account created successfully!');
      const map = { admin: '/admin', staff: '/staff', user: '/dashboard' };
      navigate(map[user.role] || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-2xl shadow-purple-500/30 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="text-gray-400 text-sm mt-1">Join Smart Complaint Management System</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                id="reg-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            {/* Role + Department in a row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Role</label>
                <select
                  id="reg-role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm appearance-none"
                >
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Department</label>
                <input
                  id="reg-department"
                  name="department"
                  type="text"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="e.g., IT"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <input
                id="reg-confirm-password"
                name="confirmPassword"
                type={showPass ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat your password"
                className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all text-sm ${
                  form.confirmPassword && form.password !== form.confirmPassword
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-700 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="register-submit-btn"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 text-sm mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
