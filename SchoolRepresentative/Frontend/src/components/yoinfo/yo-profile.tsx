'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import { relativeTime } from '@/lib/format';
import { brand } from '@/theme/theme';
import type { YoAuthor, YoStory } from '@/types/yoinfo';
import { fmtCount } from './format-count';
import { YoAvatar } from './yo-avatar';
import { YoSheet } from './yo-sheet';

export function YoProfile({
  account,
  posts,
  open,
  onClose,
  isMe,
  following,
  onFollow,
  onOpenStory,
  onEditProfile,
  onCompose,
  onDelete,
}: {
  account: YoAuthor | null;
  posts: YoStory[];
  open: boolean;
  onClose: () => void;
  isMe: boolean;
  following: boolean;
  onFollow: () => void;
  onOpenStory: (id: string) => void;
  onEditProfile: () => void;
  onCompose: () => void;
  onDelete: (id: string) => void;
}) {
  const likes = posts.reduce((n, p) => n + p.likes, 0);
  const label = account?.mine ? (account.kind === 'page' ? 'Your page' : 'You') : account?.kind === 'page' ? 'Page' : 'Profile';

  return (
    <YoSheet open={open} onClose={onClose} title={account ? `@${account.handle}` : 'Profile'} height="86%">
      {account ? (
        <Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', px: 3, pt: 2.5, pb: 2 }}>
            <YoAvatar name={account.name} color={account.color} size={76} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.25 }}>
              <Typography sx={{ fontSize: 19, fontWeight: 800 }}>{account.name}</Typography>
              {account.verified ? <VerifiedRoundedIcon sx={{ fontSize: 18, color: '#3E7BFA' }} /> : null}
            </Box>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#b5771a', mt: 0.25 }}>{label}</Typography>
            {account.bio ? <Typography sx={{ fontSize: 14, color: '#2A3150', lineHeight: 1.55, mt: 1, maxWidth: 340 }}>{account.bio}</Typography> : null}

            <Box sx={{ display: 'flex', gap: 3.5, mt: 2 }}>
              {[
                [fmtCount(posts.length), 'Posts'],
                [fmtCount((account.followers ?? 0) + (following ? 1 : 0)), 'Followers'],
                [fmtCount(likes), 'Likes'],
              ].map(([v, l]) => (
                <Box key={l}>
                  <Typography sx={{ fontSize: 17, fontWeight: 800 }}>{v}</Typography>
                  <Typography sx={{ fontSize: 12, color: brand.muted }}>{l}</Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 2.25 }}>
              {isMe ? (
                <Button onClick={onEditProfile} variant="outlined" sx={{ borderRadius: 999, px: 3, fontWeight: 700, color: brand.navy, borderColor: '#D5D9E3' }}>
                  Edit profile
                </Button>
              ) : account.mine ? (
                <Button onClick={onCompose} sx={{ borderRadius: 999, px: 3, fontWeight: 700, bgcolor: brand.primary, color: brand.navy, '&:hover': { bgcolor: brand.primaryStrong } }}>
                  Post as this page
                </Button>
              ) : (
                <Button
                  onClick={onFollow}
                  sx={{ borderRadius: 999, px: 4, fontWeight: 700, ...(following ? { bgcolor: '#EEF0F5', color: brand.navy } : { bgcolor: brand.primary, color: brand.navy, '&:hover': { bgcolor: brand.primaryStrong } }) }}
                >
                  {following ? 'Following' : 'Follow'}
                </Button>
              )}
              {isMe ? (
                <Button onClick={onCompose} sx={{ borderRadius: 999, px: 3, fontWeight: 700, bgcolor: brand.primary, color: brand.navy, '&:hover': { bgcolor: brand.primaryStrong } }}>
                  New post
                </Button>
              ) : null}
            </Box>
          </Box>

          <Box sx={{ borderTop: '1px solid #E5E8EF', px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: brand.muted, mb: 0.5 }}>Posts</Typography>
            {posts.length === 0 ? (
              <Typography sx={{ py: 4, textAlign: 'center', color: brand.muted, fontSize: 14 }}>
                {account.mine ? 'Nothing posted yet. Tap New post to share something.' : 'No posts yet.'}
              </Typography>
            ) : (
              posts.map((p) => (
                <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1 }}>
                  <ButtonBase onClick={() => onOpenStory(p.id)} sx={{ flex: 1, minWidth: 0, display: 'flex', gap: 1.25, textAlign: 'left', justifyContent: 'flex-start', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 1.5,
                        flexShrink: 0,
                        background: p.image ? `center / cover url("${p.image}")` : `linear-gradient(160deg, ${p.gradient?.[0] ?? '#13213D'}, ${p.gradient?.[1] ?? brand.navy})`,
                        bgcolor: p.imageBg ?? brand.navy,
                      }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.headline}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: brand.muted, mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {p.category} · {relativeTime(p.publishedAt)} · <FavoriteRoundedIcon sx={{ fontSize: 12 }} /> {fmtCount(p.likes)}
                      </Typography>
                    </Box>
                  </ButtonBase>
                  {account.mine ? (
                    <IconButton onClick={() => onDelete(p.id)} aria-label="Delete post" size="small" sx={{ color: brand.muted }}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Box>
              ))
            )}
          </Box>
        </Box>
      ) : null}
    </YoSheet>
  );
}
