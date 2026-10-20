import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import {
  iamRequestPasswordResetOtp,
  iamResetPasswordWithOtp,
} from '../services/iamAuth';

function extractErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Something went wrong. Please try again.'
  );
}

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const sendOtp = async (targetEmail) => {
    const data = await iamRequestPasswordResetOtp(targetEmail);
    setInfo(
      data?.message ||
        'If an account exists for that email, a verification code has been sent.'
    );
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await sendOtp(email);
      setStep('code');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResendLoading(true);
    try {
      await sendOtp(email);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setInfo(null);
    setStep('password');
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await iamResetPasswordWithOtp(email, code, password);
      navigate('/login', {
        replace: true,
        state: { passwordReset: true },
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const compact = step !== 'email';

  const stepTitle =
    step === 'email'
      ? 'Reset your password'
      : step === 'code'
        ? 'Enter verification code'
        : 'Choose a new password';

  const primaryButtonClass =
    'w-full text-white py-3 rounded-xl font-bold text-[13px] uppercase tracking-[0.13em] transition-all disabled:opacity-55 disabled:cursor-not-allowed flex justify-center items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(255,140,0,0.45)]';
  const primaryButtonStyle = {
    background: 'linear-gradient(135deg, #FF8C00 0%, #E67300 100%)',
    boxShadow: '0 4px 20px rgba(255,140,0,0.4), 0 1px 4px rgba(230,115,0,0.3)',
  };

  return (
    <div className="min-h-[100svh] font-sans text-[#000435] bg-slate-100 overflow-x-hidden">
      <div className="flex min-h-[100svh] w-full items-start justify-center p-3 sm:p-6 md:items-center md:p-8">
        <div className="group flex w-full max-w-4xl flex-col overflow-hidden border border-white/10 bg-white shadow-2xl md:max-h-[min(92svh,820px)] md:rounded-2xl">
          <header className="flex w-full shrink-0 items-center gap-3 border-b border-white/10 bg-[#000435] px-4 py-3 md:px-6 md:py-3.5">
            <img
              src="/logo_white.png"
              alt="Shule+"
              className="h-8 w-auto max-w-[160px] object-contain object-left select-none md:h-9 md:max-w-[180px]"
              draggable={false}
            />
          </header>

          <div className="flex min-h-0 flex-1 flex-col md:max-h-[calc(92svh-3.25rem)] md:flex-row">
            <div
              className={`group/image relative z-0 shrink-0 overflow-hidden bg-white md:min-h-0 md:w-1/2 md:flex-1 ${
                compact ? 'hidden md:block' : 'block'
              } ${compact ? 'md:min-h-[220px]' : 'h-[7.5rem] sm:h-[9rem] md:h-auto md:min-h-[220px]'}`}
            >
              <img
                src="/teacher.png"
                alt=""
                aria-hidden
                className="h-full w-full object-cover object-[center_22%] md:object-center md:transition-transform md:duration-[2000ms] md:group-hover/image:scale-110"
              />
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-orange-950/10 via-transparent to-black/15" />
            </div>

            <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5 md:w-1/2 md:px-8 md:py-6">
              <div
                className={`shrink-0 text-center flex flex-col items-center ${compact ? 'mb-2' : 'mb-3'}`}
              >
                <h1 className="m-0 mt-0 flex justify-center">
                  <img
                    src="/ShuleTichaLogo.png"
                    alt="ShuleTicha"
                    className={`w-auto max-w-[min(100%,280px)] object-contain object-center select-none ${
                      compact ? 'h-8 md:h-10' : 'h-10 md:h-12'
                    }`}
                    draggable={false}
                  />
                </h1>
                <p className="mt-1.5 text-[9.5px] font-black uppercase tracking-[0.38em] text-[#FF8C00]">
                  Educators&apos; Workspace
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2 mb-3 text-[11px] font-bold login-shake shrink-0">
                  <AlertCircle size={14} className="shrink-0" /> {error}
                </div>
              )}

              {info && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2 mb-3 text-[11px] font-medium shrink-0">
                  {info}
                </div>
              )}

              <div className={`shrink-0 ${compact ? 'mb-3' : 'mb-4'}`}>
                <h2 className="text-lg font-bold tracking-tight text-gray-900 md:text-[19px]">
                  {stepTitle}
                </h2>
                {step === 'email' && (
                  <p className="mt-0.5 text-[13px] text-gray-400 sm:text-[13.5px]">
                    Enter your account email. We will send a 6-digit code.
                  </p>
                )}
                {step === 'code' && (
                  <p className="mt-0.5 text-[13px] text-gray-400 sm:text-[13.5px] break-all">
                    Code sent to <span className="font-medium text-gray-600">{email}</span>
                  </p>
                )}
                {step === 'password' && (
                  <p className="mt-0.5 text-[13px] text-gray-400 sm:text-[13.5px]">
                    Create a strong password for your account.
                  </p>
                )}
              </div>

              {step === 'email' && (
                <form onSubmit={handleSendCode} className="space-y-3.5 shrink-0">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      Email
                    </label>
                    <div className="group flex items-center rounded-xl border-[1.5px] border-gray-200 bg-gray-50 overflow-hidden transition-all focus-within:border-[#FF8C00] focus-within:bg-orange-50/60 focus-within:shadow-[0_0_0_3px_rgba(255,140,0,0.15)]">
                      <span className="w-10 flex items-center justify-center shrink-0 text-gray-300 group-focus-within:text-[#FF8C00] transition-colors">
                        <Mail className="w-[15px] h-[15px]" />
                      </span>
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@school.rw"
                        className="w-full py-2.5 pr-3 bg-transparent outline-none text-[13.5px] text-gray-900 placeholder:text-gray-300 font-normal"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryButtonClass}
                    style={primaryButtonStyle}
                  >
                    {loading ? (
                      <RefreshCw className="animate-spin w-4 h-4" />
                    ) : (
                      <>
                        Send code
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {step === 'code' && (
                <form onSubmit={handleVerifyCode} className="shrink-0 space-y-3.5">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      Verification code
                    </label>
                    <div className="group flex items-center rounded-xl border-[1.5px] border-gray-200 bg-gray-50 overflow-hidden transition-all focus-within:border-[#FF8C00] focus-within:bg-orange-50/60 focus-within:shadow-[0_0_0_3px_rgba(255,140,0,0.15)]">
                      <span className="w-10 flex items-center justify-center shrink-0 text-gray-300 group-focus-within:text-[#FF8C00] transition-colors">
                        <KeyRound className="w-[15px] h-[15px]" />
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit code"
                        className="w-full py-2.5 pr-3 bg-transparent outline-none text-[13.5px] text-gray-900 placeholder:text-gray-300 font-normal tracking-[0.2em]"
                        required
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendLoading}
                      className="mt-1.5 text-[11px] font-semibold text-[#FF8C00] hover:opacity-70 disabled:opacity-50"
                    >
                      {resendLoading ? 'Sending…' : 'Resend code'}
                    </button>
                  </div>

                  <button type="submit" className={primaryButtonClass} style={primaryButtonStyle}>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setCode('');
                      setError(null);
                      setInfo(null);
                    }}
                    className="w-full text-[12px] font-semibold text-gray-500 hover:text-[#FF8C00]"
                  >
                    Use a different email
                  </button>
                </form>
              )}

              {step === 'password' && (
                <form onSubmit={handleReset} className="shrink-0 space-y-3">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      New password
                    </label>
                    <div className="group flex items-center rounded-xl border-[1.5px] border-gray-200 bg-gray-50 overflow-hidden transition-all focus-within:border-[#FF8C00] focus-within:bg-orange-50/60 focus-within:shadow-[0_0_0_3px_rgba(255,140,0,0.15)]">
                      <span className="w-10 flex items-center justify-center shrink-0 text-gray-300 group-focus-within:text-[#FF8C00] transition-colors">
                        <Lock className="w-[15px] h-[15px]" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full py-2.5 bg-transparent outline-none text-[13.5px] text-gray-900 placeholder:text-gray-300 font-normal"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="w-10 flex items-center justify-center shrink-0 text-gray-300 hover:text-[#FF8C00] transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-[15px] h-[15px]" />
                        ) : (
                          <Eye className="w-[15px] h-[15px]" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      Confirm password
                    </label>
                    <div className="group flex items-center rounded-xl border-[1.5px] border-gray-200 bg-gray-50 overflow-hidden transition-all focus-within:border-[#FF8C00] focus-within:bg-orange-50/60 focus-within:shadow-[0_0_0_3px_rgba(255,140,0,0.15)]">
                      <span className="w-10 flex items-center justify-center shrink-0 text-gray-300 group-focus-within:text-[#FF8C00] transition-colors">
                        <Lock className="w-[15px] h-[15px]" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full py-2.5 pr-3 bg-transparent outline-none text-[13.5px] text-gray-900 placeholder:text-gray-300 font-normal"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryButtonClass}
                    style={primaryButtonStyle}
                  >
                    {loading ? (
                      <RefreshCw className="animate-spin w-4 h-4" />
                    ) : (
                      <>
                        Update password
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('code');
                      setPassword('');
                      setConfirmPassword('');
                      setError(null);
                    }}
                    className="w-full text-[12px] font-semibold text-gray-500 hover:text-[#FF8C00]"
                  >
                    Back to verification code
                  </button>
                </form>
              )}

              <div className="mt-3 shrink-0 border-t border-black/5 pt-3 text-center md:mt-4 md:pt-3.5">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-[12px] font-bold text-[#FF8C00] hover:opacity-80"
                >
                  <ArrowLeft size={14} />
                  Back to sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
