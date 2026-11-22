import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../context/AuthContext';
import Splash from '../components/Splash';
import { brand } from '../theme/theme';

const STAFF_LOGIN_PREFS_KEY = 'babyeyi_staff_login_prefs';

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

function loadStaffLoginPrefs() {
  try {
    const raw = localStorage.getItem(STAFF_LOGIN_PREFS_KEY);
    if (!raw) return { remember: false, identifier: '' };
    const p = JSON.parse(raw);
    return { remember: !!p.remember, identifier: typeof p.identifier === 'string' ? p.identifier : '' };
  } catch {
    return { remember: false, identifier: '' };
  }
}

export default function Login() {
  const [prefs] = useState(() => loadStaffLoginPrefs());
  const [stage, setStage] = useState('welcome');
  const [identifier, setIdentifier] = useState(prefs.identifier);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!prefs.remember);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, teacher, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const passwordResetDone = location.state?.passwordReset === true;

  useEffect(() => {
    if (!authLoading && teacher) navigate('/', { replace: true });
  }, [teacher, authLoading, navigate]);

  useEffect(() => {
    if (passwordResetDone) setStage('login');
  }, [passwordResetDone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(identifier, password, { rememberMe });
    if (result.success) navigate('/');
    else setError(result.message);
    setLoading(false);
  };

  if (authLoading) return <Splash />;

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
              backgroundImage: "url('/Subtle%20Navy%20Geometric%20Maze%20Wallpaper.png')",
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
          <Box
            component="img"
            src="/logo_white.png"
            alt="Shule+"
            sx={{
              height: 40,
              width: 'auto',
              maxWidth: 180,
              objectFit: 'contain',
              alignSelf: 'flex-start',
              position: 'relative',
              zIndex: 2,
            }}
            onError={(e) => {
              e.currentTarget.src = '/st-wordmark.webp';
            }}
          />

          <Box sx={{ position: 'relative', pb: 1 }}>
            {/* Full-bleed teacher figure at bottom — same placement as director.webp */}
            <Box
              sx={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: -40,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            >
              <Box
                component="img"
                src="/teacher.png"
                alt=""
                sx={{
                  width: 'min(3200px, 300vw)',
                  height: 'auto',
                  maxWidth: 'none',
                  objectFit: 'contain',
                  objectPosition: 'bottom',
                  transform: 'scale(1)',
                }}
                onError={(e) => {
                  e.currentTarget.src = '/st-teacher.webp';
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
                ShuleTicha
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
                onClick={() => setStage('welcome')}
                sx={{ color: 'rgba(255,255,255,0.8)', ml: -1 }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                Sign in
              </Typography>
            </Stack>

            {passwordResetDone ? (
              <Alert severity="success" sx={{ mt: 2, mb: 1, borderRadius: 1.25 }}>
                Password updated. Sign in with your new password.
              </Alert>
            ) : null}

            {error ? (
              <Alert severity="error" sx={{ mt: 2, mb: 1, borderRadius: 1.25 }}>
                {error}
              </Alert>
            ) : null}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5} sx={{ mt: 2.5 }}>
                <TextField
                  fullWidth
                  variant="standard"
                  label="Email or phone"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
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
                  required
                  sx={fieldSx}
                  InputProps={{
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
                <Stack direction="row" alignItems="center" justifyContent="space-between">
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
                    component={Link}
                    to="/forgot-password"
                    size="small"
                    sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'none' }}
                  >
                    Forgot password?
                  </Button>
                </Stack>
                <Button
                  type="submit"
                  fullWidth
                  size="large"
                  variant="contained"
                  color="primary"
                  disabled={loading || !identifier.trim() || !password}
                  endIcon={loading ? undefined : <ArrowForwardIcon />}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={submitSx}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </Stack>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
