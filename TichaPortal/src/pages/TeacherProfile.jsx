import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useAuth } from '../context/AuthContext';
import {
  resolveTeacherPhotoUrl,
  teacherDisplayName,
  teacherInitials,
} from '../utils/teacherDisplay';
import {
  changeTeacherPassword,
  fetchTeacherProfile,
  tpApiError,
  uploadTeacherPhoto,
} from '../services/teacherPortalApi';
import { brand } from '../theme/theme';

const fieldLabelSx = {
  mb: 0.75,
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: brand.muted,
};

function MessageLine({ msg }) {
  if (!msg) return null;
  const ok = msg.type === 'ok';
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }}>
      {ok ? (
        <CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#059669' }} />
      ) : (
        <WarningAmberIcon sx={{ fontSize: 14, color: '#DC2626' }} />
      )}
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: ok ? '#059669' : '#DC2626' }}>{msg.text}</Typography>
    </Stack>
  );
}

export default function TeacherProfile() {
  const { teacher, updateTeacher } = useAuth();
  const photoInputRef = useRef(null);

  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoMsg, setPhotoMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const forceChange = !!teacher?.force_password_change;
  const photoUrl = resolveTeacherPhotoUrl(teacher?.photo);
  const displaySrc = photoPreview || photoUrl;
  const initials = teacherInitials(teacher);
  const displayName = teacherDisplayName(teacher);
  const schoolName = teacher?.school?.name || teacher?.school_name || 'Your school';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchTeacherProfile();
        if (!cancelled && profile?.photo) updateTeacher({ photo: profile.photo });
      } catch {
        /* keep session photo */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [updateTeacher]);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview]
  );

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    setPhotoMsg(null);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.readAsDataURL(photoFile);
      });
      const data = await uploadTeacherPhoto(dataUrl);
      if (data?.photo) {
        updateTeacher({ photo: `${data.photo}?t=${Date.now()}` });
        setPhotoFile(null);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
        if (photoInputRef.current) photoInputRef.current.value = '';
        setPhotoMsg({ type: 'ok', text: 'Profile photo updated.' });
      } else {
        setPhotoMsg({ type: 'err', text: 'Upload failed.' });
      }
    } catch (err) {
      setPhotoMsg({ type: 'err', text: tpApiError(err, 'Could not save photo. Try again.') });
    } finally {
      setPhotoSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(null);

    if (!currentPassword) {
      setPwMsg({ type: 'err', text: 'Enter your current password.' });
      return;
    }
    if (!newPassword) {
      setPwMsg({ type: 'err', text: 'Enter a new password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: 'err', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'err', text: 'New passwords do not match.' });
      return;
    }

    setPwSaving(true);
    try {
      await changeTeacherPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      updateTeacher({ force_password_change: false });
      setPwMsg({ type: 'ok', text: 'Password changed successfully.' });
    } catch (err) {
      setPwMsg({ type: 'err', text: tpApiError(err, 'Failed to change password.') });
    } finally {
      setPwSaving(false);
    }
  };

  const passwordFields = [
    {
      label: 'Current password',
      value: currentPassword,
      setValue: setCurrentPassword,
      show: showCurrentPw,
      toggle: () => setShowCurrentPw((v) => !v),
      autoComplete: 'current-password',
    },
    {
      label: 'New password',
      value: newPassword,
      setValue: setNewPassword,
      show: showNewPw,
      toggle: () => setShowNewPw((v) => !v),
      autoComplete: 'new-password',
    },
    {
      label: 'Confirm new password',
      value: confirmPassword,
      setValue: setConfirmPassword,
      show: showConfirmPw,
      toggle: () => setShowConfirmPw((v) => !v),
      autoComplete: 'new-password',
    },
  ];

  return (
    <Box sx={{ minHeight: '100%', pb: 4 }}>
      <Box
        component="section"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: brand.navy,
          color: '#fff',
          px: 2.5,
          pt: 2.5,
          pb: 3,
          '&::after': {
            content: '""',
            position: 'absolute',
            right: -60,
            top: -70,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,166,35,0.2), transparent 65%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
          <Avatar
            src={displaySrc || undefined}
            sx={{ width: 64, height: 64, bgcolor: brand.primary, color: brand.navy, fontWeight: 700, fontSize: 20 }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 800, color: '#fff', fontSize: 18, letterSpacing: '-0.01em' }}>
              {displayName}
            </Typography>
            <Typography noWrap sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              {teacher?.subject || 'Teacher'}
              {teacher?.staff_id ? ` · ${teacher.staff_id}` : ''}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              {schoolName}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ pt: 2, px: { xs: 1.5, sm: 2 }, maxWidth: 640, mx: 'auto' }}>
        {forceChange ? (
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{ mb: 2, borderRadius: 1, '& .MuiAlert-message': { fontWeight: 500 } }}
          >
            Your school requires a new password before you continue. Set a strong password below.
          </Alert>
        ) : null}

        <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.navy, mb: 1 }}>Profile photo</Typography>
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, border: `1px solid ${brand.border}`, borderRadius: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={displaySrc || undefined}
              variant="rounded"
              sx={{ width: 64, height: 64, borderRadius: 1, bgcolor: brand.navy, color: '#fff', fontWeight: 700, fontSize: 20 }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: 15, fontWeight: 700, color: brand.navy }}>
                {displayName}
              </Typography>
              <Typography noWrap sx={{ fontSize: 12, color: brand.muted }}>
                {teacher?.email || '—'}
              </Typography>
              <Typography noWrap sx={{ fontSize: 12, color: brand.muted }}>
                {schoolName}
              </Typography>
            </Box>
          </Stack>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (photoPreview) URL.revokeObjectURL(photoPreview);
              setPhotoFile(file);
              setPhotoPreview(URL.createObjectURL(file));
              setPhotoMsg(null);
            }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FileUploadOutlinedIcon />}
              onClick={() => photoInputRef.current?.click()}
              sx={{ textTransform: 'none', fontWeight: 600, flex: 1, borderColor: brand.border, color: brand.navy }}
            >
              Choose photo
            </Button>
            <Button
              variant="contained"
              color="secondary"
              disabled={!photoFile || photoSaving}
              onClick={() => void handlePhotoUpload()}
              startIcon={photoSaving ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ textTransform: 'none', fontWeight: 700, flex: 1 }}
            >
              {photoSaving ? 'Saving…' : 'Save photo'}
            </Button>
          </Stack>
          <MessageLine msg={photoMsg} />
        </Paper>

        <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.navy, mb: 1 }}>Password</Typography>
        <Paper
          component="form"
          onSubmit={handlePasswordChange}
          elevation={0}
          sx={{ p: 2, border: `1px solid ${brand.border}`, borderRadius: 1 }}
        >
          <Stack spacing={1.75}>
            {passwordFields.map((field) => (
              <Box key={field.label}>
                <Typography component="label" sx={fieldLabelSx}>
                  {field.label}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type={field.show ? 'text' : 'password'}
                  value={field.value}
                  onChange={(e) => field.setValue(e.target.value)}
                  autoComplete={field.autoComplete}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={field.toggle} edge="end" size="small" aria-label="Toggle visibility">
                          {field.show ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            ))}
            <MessageLine msg={pwMsg} />
            <Button
              type="submit"
              fullWidth
              disabled={pwSaving}
              variant="contained"
              color="secondary"
              startIcon={pwSaving ? <CircularProgress size={16} color="inherit" /> : <LockOutlinedIcon />}
              sx={{ mt: 0.5, py: 1.25, fontWeight: 700, textTransform: 'none' }}
            >
              {pwSaving ? 'Updating…' : 'Update password'}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
