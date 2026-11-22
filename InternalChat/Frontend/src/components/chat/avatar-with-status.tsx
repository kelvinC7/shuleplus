import { Avatar, Badge } from '@mui/material';
import { Person } from '@mui/icons-material';
import { ONLINE, OFFLINE, PRIMARY } from '@/shared/styles';

interface AvatarWithStatusProps {
  name: string | null | undefined;
  avatarUrl?: string | null;
  online?: boolean;
  size?: number;
  showStatus?: boolean;
}

export function AvatarWithStatus({ avatarUrl, online, size = 40, showStatus = true }: AvatarWithStatusProps) {
  const avatar = (
    <Avatar
      src={avatarUrl ?? undefined}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        fontWeight: 700,
        bgcolor: PRIMARY,
        color: '#fff',
      }}
    >
      {!avatarUrl && <Person sx={{ width: size * 0.55, height: size * 0.55 }} />}
    </Avatar>
  );

  if (!showStatus) return avatar;

  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      variant="dot"
      sx={{
        '& .MuiBadge-badge': {
          width: size * 0.28,
          height: size * 0.28,
          minWidth: size * 0.28,
          borderRadius: '50%',
          bgcolor: online ? ONLINE : OFFLINE,
          border: '2px solid #fff',
        },
      }}
    >
      {avatar}
    </Badge>
  );
}
