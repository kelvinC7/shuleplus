import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Checkbox,
} from '@mui/material';
import { Search, Person } from '@mui/icons-material';
import { useChat } from '@/contexts/chat-context';
import { AvatarWithStatus } from './avatar-with-status';
import { CUSTOM_SCROLLBAR } from '@/shared/styles';
import type { Member } from '@/types';

interface MemberPickerProps {
  selected: string[];
  onToggle: (userId: string) => void;
  multi?: boolean;
  searchPlaceholder?: string;
  filter?: (m: Member) => boolean;
  options?: Member[];
}

export function MemberPicker({ selected, onToggle, multi = true, searchPlaceholder, filter, options }: MemberPickerProps) {
  const { members, parents, onlineIds } = useChat();
  const [query, setQuery] = useState('');

  const pool = options ?? [...members, ...parents];

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool.filter((m) => {
      if (filter && !filter(m)) return false;
      if (!q) return true;
      return `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q);
    });
  }, [pool, query, filter]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <TextField
        size="small"
        fullWidth
        placeholder={searchPlaceholder ?? 'Search members…'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 16, color: 'rgba(0,0,0,0.35)' }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px', fontSize: '0.8rem' } }}
      />
      <Box sx={{ overflowY: 'auto', maxHeight: 240, ...CUSTOM_SCROLLBAR }}>
        <List dense disablePadding>
          {list.map((m) => {
            const name = `${m.firstName} ${m.lastName}`.trim();
            const checked = selected.includes(m.userId);
            const isParent = m.kind === 'PARENT';
            const secondary = isParent
              ? `Parent${m.email ? ` · ${m.email}` : ''}`
              : m.department
                ? `${m.department} · ${m.position ?? ''}`
                : m.email;
            return (
              <ListItemButton
                key={m.userId}
                dense
                onClick={() => onToggle(m.userId)}
                sx={{ borderRadius: '2px', px: 1 }}
              >
                {multi && (
                  <Checkbox
                    edge="start"
                    checked={checked}
                    tabIndex={-1}
                    disableRipple
                    size="small"
                    sx={{ p: 0.5 }}
                  />
                )}
                <ListItemAvatar>
                  <AvatarWithStatus
                    name={name}
                    avatarUrl={m.avatarUrl}
                    online={onlineIds.has(m.userId)}
                    size={34}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={name}
                  secondary={secondary}
                  slotProps={{
                    primary: { sx: { fontSize: '0.82rem', fontWeight: 600, color: '#001121' } },
                    secondary: { sx: { fontSize: '0.68rem', color: 'rgba(0,0,0,0.5)' } },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Box>
  );
}

interface SelectedMembersProps {
  members: Member[];
  onRemove: (userId: string) => void;
}

export function SelectedMembersChips({ members, onRemove }: SelectedMembersProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
      {members.map((m) => (
        <Chip
          key={m.userId}
          avatar={
            <Avatar src={m.avatarUrl ?? undefined}>
              {!m.avatarUrl && <Person sx={{ width: 16, height: 16 }} />}
            </Avatar>
          }
          label={`${m.firstName} ${m.lastName}`}
          onDelete={() => onRemove(m.userId)}
          size="small"
          sx={{ fontSize: '0.7rem', bgcolor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
        />
      ))}
    </Box>
  );
}

export function useSelectedMembers(multi = true, options?: Member[]) {
  const { members, parents } = useChat();
  const [selected, setSelected] = useState<string[]>([]);

  const pool = options ?? [...members, ...parents];

  useEffect(() => {
    setSelected((prev) => prev.filter((id) => pool.some((m) => m.userId === id)));
  }, [pool]);

  const toggle = (userId: string) => {
    setSelected((prev) => {
      if (!multi) return prev.includes(userId) ? [] : [userId];
      return prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId];
    });
  };

  const selectedMembers = pool.filter((m) => selected.includes(m.userId));
  return { selected, selectedMembers, toggle, clear: () => setSelected([]) };
}
