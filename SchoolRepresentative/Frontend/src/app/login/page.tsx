'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useConsole } from '@/contexts/console-context';
import { InstallPrompt } from '@/components/install-prompt';
import { getToken, storeTokens } from '@/shared/auth-token';
import {
  authErrorMessage,
  loginRequest,
  resendMfaOtp,
  verifyMfaRequest,
  type LoginSuccess,
} from '@/services/auth-api';
import { brand } from '@/theme/theme';

const ALLOWED_ROLES = ['school_representative', 'organization_admin', 'root_admin', 'super_admin'];

const fieldSx = {
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.65)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#fff' },
  '& .MuiInput-input': { color: '#fff' },
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
  animation: 'loginFadeUp 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
  '@keyframes loginFadeUp': {
    '0%': { opacity: 0, transform: 'translateY(14px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

const fadeInSx = {
  animation: 'loginFadeIn 320ms ease both',
  '@keyframes loginFadeIn': {
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

export default function LoginPage() {
  const router = useRouter();
  const { ready, authorized, reload } = useConsole();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [mfa, setMfa] = useState<{
    token: string;
    step: number;
    message?: string;
    hint?: string;
  } | null>(null);
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'welcome' | 'login'>('welcome');

  useEffect(() => {
    if (ready && authorized && getToken()) router.replace('/director/overview');
  }, [ready, authorized, router]);

  const finishLogin = async (result: LoginSuccess) => {
    const roles = result.user?.roles ?? [];
    if (roles.length && !roles.some((role) => ALLOWED_ROLES.includes(role))) {
      setError('This account does not have Director Console access.');
      return;
    }
    storeTokens(result.accessToken, result.refreshToken);
    await reload();
    router.replace('/director/overview');
  };

  const submitCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await loginRequest({
        email: identifier.trim(),
        password,
        rememberMe,
      });
      if (result.requiresMfa) {
        setMfa({
          token: result.mfaSessionToken,
          step: 1,
          message: result.deliveryMessage,
          hint: result.devOtpHint,
        });
        setCode('');
        return;
      }
      await finishLogin(result);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mfa || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await verifyMfaRequest({
        mfaSessionToken: mfa.token,
        code: code.trim(),
        method: 'email_otp',
      });
      if (result.requiresSecondOtp) {
        setMfa({
          ...mfa,
          step: 2,
          message: result.deliveryMessage ?? 'Enter the second code that was sent to you.',
        });
        setCode('');
        return;
      }
      if (!result.accessToken || !result.refreshToken || !result.user) {
        setError('Verification failed. Please try signing in again.');
        return;
      }
      await finishLogin({
        requiresMfa: false,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (err) {
      setError(authErrorMessage(err, 'Invalid verification code'));
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    if (!mfa || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await resendMfaOtp(mfa.token);
      setNotice(result.message ?? 'A new verification code has been sent.');
      if (result.devMode) setMfa({ ...mfa, hint: result.message });
    } catch (err) {
      setError(authErrorMessage(err, 'Could not resend the code'));
    } finally {
      setBusy(false);
    }
  };

  const resetMfa = () => {
    setMfa(null);
    setCode('');
    setError(null);
    setNotice(null);
  };

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
        ...(stage === 'welcome'
          ? {
              backgroundImage: "url('/Subtle Navy Geometric Maze Wallpaper.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : {}),
      }}
    >
      {stage === 'welcome' ? (
        <Box
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: 440,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            py: 1,
            ...fadeInSx,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo_white.png"
            alt="Shule+"
            style={{
              height: 40,
              width: 'auto',
              maxWidth: 180,
              objectFit: 'contain',
              alignSelf: 'flex-start',
              position: 'relative',
              zIndex: 2,
            }}
          />

          <Box sx={{ position: 'relative', pb: 1 }}>
            <Box
              sx={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: -16,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/director.webp"
                alt=""
                style={{
                  width: 'min(1100px, 106vw)',
                  height: 'auto',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  objectPosition: 'bottom',
                }}
              />
            </Box>

            <Box
              aria-hidden
              sx={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                height: { xs: '52%', sm: '48%' },
                background:
                  'linear-gradient(to top, rgba(8,19,42,0.96) 0%, rgba(8,19,42,0.72) 45%, rgba(8,19,42,0) 100%)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />

            <Stack spacing={2} sx={{ position: 'relative', zIndex: 2 }}>
              <Typography
                sx={{
                  fontSize: { xs: 28, sm: 32 },
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                  textShadow: '0 1px 16px rgba(0,0,0,0.45)',
                }}
              >
                Director Console
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                onClick={() => setStage('login')}
                endIcon={<ArrowForwardIcon />}
                sx={{ mt: 1, py: 1.4, borderRadius: 999, fontWeight: 700 }}
            >
              Continue
            </Button>
            </Stack>
          </Box>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: { xs: 24, sm: 32 },
              left: { xs: 20, sm: 32 },
              ...fadeInSx,
            }}
          >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_white.png"
          alt="Shule+"
          style={{ height: 38, width: 'auto', maxWidth: 180, objectFit: 'contain' }}
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

      <Box
        sx={{
          width: '100%',
          maxWidth: 400,
          ...fadeUpSx,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton
            aria-label="Back"
            onClick={mfa ? resetMfa : () => setStage('welcome')}
            sx={{ color: 'rgba(255,255,255,0.8)', ml: -1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            {mfa ? 'Verify your login' : 'Sign in'}
          </Typography>
        </Stack>
        {mfa ? (
          <Typography sx={{ mt: 0.75, mb: 3, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            {mfa.message ?? 'Enter the verification code sent to your email.'}
          </Typography>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mt: 2, mb: 1, borderRadius: 1.25 }}>
            {error}
          </Alert>
        ) : null}
        {notice ? (
          <Alert severity="info" sx={{ mt: 2, mb: 1, borderRadius: 1.25 }}>
            {notice}
          </Alert>
        ) : null}

        {mfa ? (
          <Box component="form" onSubmit={submitCode}>
            <Stack spacing={2}>
              <TextField
                autoFocus
                fullWidth
                variant="standard"
                label="Verification code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                autoComplete="one-time-code"
                inputProps={{ inputMode: 'numeric', maxLength: 8 }}
                helperText={mfa.hint}
                sx={fieldSx}
              />
              <Button
                type="submit"
                fullWidth
                size="large"
                variant="contained"
                color="primary"
                disabled={busy || code.length < 6}
                endIcon={busy ? undefined : <ArrowForwardIcon />}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={submitSx}
              >
                {busy ? 'Verifying…' : mfa.step === 2 ? 'Verify second code' : 'Verify & sign in'}
              </Button>
              <Stack direction="row" spacing={1} justifyContent="space-between">
                <Button
                  size="small"
                  onClick={resetMfa}
                  sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}
                >
                  Back to sign in
                </Button>
                <Button
                  size="small"
                  onClick={() => void resendCode()}
                  disabled={busy}
                  sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}
                >
                  Resend code
                </Button>
              </Stack>
            </Stack>
          </Box>
        ) : (
          <Box component="form" onSubmit={submitCredentials}>
            <Stack spacing={2.5} sx={{ mt: 2.5 }}>
              <TextField
                fullWidth
                variant="standard"
                label="Email or phone"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                variant="standard"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={fieldSx}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword((value) => !value)}
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
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{ color: 'rgba(255,255,255,0.6)', '&.Mui-checked': { color: brand.primary } }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}>
                    Keep me signed in
                  </Typography>
                }
                sx={{ mx: 0 }}
              />
              <Button
                type="submit"
                fullWidth
                size="large"
                variant="contained"
                color="primary"
                disabled={busy || !identifier.trim() || !password}
                endIcon={busy ? undefined : <ArrowForwardIcon />}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={submitSx}
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </Box>
        )}
      </Box>
        </>
      )}

      <InstallPrompt />
    </Box>
  );
}
