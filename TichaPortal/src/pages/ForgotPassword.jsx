import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  iamRequestPasswordResetOtp,
  iamResetPasswordWithOtp,
} from '../services/iamAuth';

const fieldSx = {
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.65)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#fff' },
  '& .MuiInput-input': { color: '#fff' },
  '& .MuiInput-input::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 },
  '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255,255,255,0.35)' },
  '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
    borderBottomColor: 'rgba(255,255,255,0.65)',
  },
  '& .MuiInput-underline:after': { borderBottomColor: '#fff' },
  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.6)' },
};

const submitSx = {
  py: 1.4,
  borderRadius: 999,
  fontWeight: 700,
  '&.Mui-disabled': {
    bgcolor: 'rgba(255,255,255,0.16)',
    color: 'rgba(255,255,255,0.55)',
  },
};

const fadeUpSx = {
  animation: 'resetFadeUp 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
  '@keyframes resetFadeUp': {
    '0%': { opacity: 0, transform: 'translateY(14px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

const fadeInSx = {
  animation: 'resetFadeIn 320ms ease both',
  '@keyframes resetFadeIn': {
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

function extractErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Something went wrong. Please try again.'
  );
}

const STEP_COPY = {
  email: {
    title: 'Reset your password',
    description: 'Enter your account email. We will send a 6-digit code.',
  },
  code: {
    title: 'Enter verification code',
    description: 'Enter the 6-digit code we sent to your email.',
  },
  password: {
    title: 'Choose a new password',
    description: 'Create a strong password for your account.',
  },
};

export default function ForgotPassword() {
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

  const { title, description } = STEP_COPY[step];

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: { xs: 4, sm: 6 },
        bgcolor: '#08132A',
        backgroundImage: "url('/Subtle%20Navy%20Geometric%20Maze%20Wallpaper.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 24, sm: 32 },
          left: { xs: 20, sm: 32 },
          ...fadeInSx,
        }}
      >
        <Box
          component="img"
          src="/logo_white.png"
          alt="Shule+"
          sx={{ height: 38, width: 'auto', maxWidth: 180, objectFit: 'contain' }}
          onError={(e) => {
            e.currentTarget.src = '/st-wordmark.webp';
          }}
        />
      </Box>

      <Typography
        sx={{
          position: 'absolute',
          bottom: { xs: 20, sm: 24 },
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 11,
          letterSpacing: '0.04em',
          color: 'rgba(255,255,255,0.4)',
          ...fadeInSx,
        }}
      >
        Powered by EDUPOTO
      </Typography>

      <Box sx={{ width: '100%', maxWidth: 400, ...fadeUpSx }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton
            aria-label="Back"
            component={Link}
            to="/login"
            sx={{ color: 'rgba(255,255,255,0.8)', ml: -1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            {title}
          </Typography>
        </Stack>
        <Typography sx={{ mt: 0.75, ml: 4.5, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          {description}
          {step === 'code' ? (
            <Typography component="span" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              {' '}
              {email}
            </Typography>
          ) : null}
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mt: 2, mb: 1, borderRadius: 1.25 }}>
            {error}
          </Alert>
        ) : null}

        {info ? (
          <Alert severity="info" sx={{ mt: 2, mb: 1, borderRadius: 1.25 }}>
            {info}
          </Alert>
        ) : null}

        {step === 'email' ? (
          <Box component="form" onSubmit={handleSendCode}>
            <Stack spacing={2.5} sx={{ mt: 2.5 }}>
              <TextField
                fullWidth
                variant="standard"
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.55)' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                size="large"
                variant="contained"
                color="primary"
                disabled={loading || !email.trim()}
                endIcon={loading ? undefined : <ArrowForwardIcon />}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={submitSx}
              >
                {loading ? 'Sending…' : 'Send code'}
              </Button>
            </Stack>
          </Box>
        ) : null}

        {step === 'code' ? (
          <Box component="form" onSubmit={handleVerifyCode}>
            <Stack spacing={2.5} sx={{ mt: 2.5 }}>
              <TextField
                fullWidth
                variant="standard"
                label="Verification code"
                inputProps={{ inputMode: 'numeric', maxLength: 6, style: { letterSpacing: '0.2em' } }}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyOutlinedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.55)' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Stack spacing={1}>
                <Button
                  type="submit"
                  fullWidth
                  size="large"
                  variant="contained"
                  color="primary"
                  endIcon={<ArrowForwardIcon />}
                  sx={submitSx}
                >
                  Continue
                </Button>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button
                    type="button"
                    size="small"
                    onClick={handleResend}
                    disabled={resendLoading}
                    sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'none' }}
                  >
                    {resendLoading ? 'Sending…' : 'Resend code'}
                  </Button>
                  <Button
                    type="button"
                    size="small"
                    onClick={() => {
                      setStep('email');
                      setCode('');
                      setError(null);
                      setInfo(null);
                    }}
                    sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'none' }}
                  >
                    Use a different email
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Box>
        ) : null}

        {step === 'password' ? (
          <Box component="form" onSubmit={handleReset}>
            <Stack spacing={2.5} sx={{ mt: 2.5 }}>
              <TextField
                fullWidth
                variant="standard"
                label="New password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                inputProps={{ minLength: 8 }}
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.55)' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        sx={{ color: 'rgba(255,255,255,0.75)' }}
                      >
                        {showPassword ? (
                          <VisibilityOffOutlinedIcon fontSize="small" />
                        ) : (
                          <VisibilityOutlinedIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                variant="standard"
                label="Confirm password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                inputProps={{ minLength: 8 }}
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.55)' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                size="large"
                variant="contained"
                color="primary"
                disabled={loading}
                endIcon={loading ? undefined : <ArrowForwardIcon />}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={submitSx}
              >
                {loading ? 'Updating…' : 'Update password'}
              </Button>
              <Button
                type="button"
                size="small"
                onClick={() => {
                  setStep('code');
                  setPassword('');
                  setConfirmPassword('');
                  setError(null);
                }}
                sx={{ alignSelf: 'center', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'none' }}
              >
                Back to verification code
              </Button>
            </Stack>
          </Box>
        ) : null}

        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <Button
            component={Link}
            to="/login"
            size="small"
            startIcon={<ArrowBackIcon />}
            sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'none' }}
          >
            Back to sign in
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
