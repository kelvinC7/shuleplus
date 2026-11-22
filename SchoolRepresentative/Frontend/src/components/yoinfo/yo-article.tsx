'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import { relativeTime } from '@/lib/format';
import { brand } from '@/theme/theme';
import type { YoStory } from '@/types/yoinfo';
import { YoSheet } from './yo-sheet';

/** Full "newspaper" view of a story, opened from "Read story". */
export function YoArticle({
  story,
  open,
  onClose,
  liked,
  saved,
  onLike,
  onSave,
  onComments,
  onShare,
}: {
  story: YoStory | null;
  open: boolean;
  onClose: () => void;
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  onComments: () => void;
  onShare: () => void;
}) {
  const bar = (active: boolean, color: string) => ({ color: active ? color : brand.navy, fontWeight: 700, textTransform: 'none' as const, flex: 1 });

  return (
    <YoSheet
      open={open}
      onClose={onClose}
      title={story?.category ?? 'Story'}
      height="92%"
      footer={
        <Box sx={{ display: 'flex', px: 1, py: 0.5, pb: 'calc(4px + env(safe-area-inset-bottom, 0px))' }}>
          <Button onClick={onLike} startIcon={<FavoriteRoundedIcon />} sx={bar(liked, brand.danger)}>
            Like
          </Button>
          <Button onClick={onComments} startIcon={<ChatBubbleOutlineRoundedIcon />} sx={bar(false, brand.navy)}>
            Comments
          </Button>
          <Button onClick={onSave} startIcon={<BookmarkRoundedIcon />} sx={bar(saved, '#b5771a')}>
            {saved ? 'Saved' : 'Save'}
          </Button>
          <Button onClick={onShare} startIcon={<IosShareRoundedIcon />} sx={bar(false, brand.navy)}>
            Share
          </Button>
        </Box>
      }
    >
      {story ? (
        <Box component="article" sx={{ pb: 3 }}>
          {story.image ? (
            <Box
              component="img"
              src={story.image}
              alt=""
              sx={{ width: '100%', height: 220, objectFit: story.imageFit === 'contain' ? 'contain' : 'cover', bgcolor: story.imageBg ?? '#EEF0F5', mixBlendMode: story.imageFit === 'contain' ? 'multiply' : 'normal', display: 'block' }}
            />
          ) : story.big ? (
            <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${story.gradient?.[0] ?? '#13213D'}, ${story.gradient?.[1] ?? brand.navy})` }}>
              <Typography sx={{ fontSize: 64, fontWeight: 800, color: brand.primary, letterSpacing: '-0.04em' }}>{story.big}</Typography>
            </Box>
          ) : null}
          <Box sx={{ px: 2.5, pt: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b5771a' }}>{story.category}</Typography>
            <Typography component="h1" sx={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', mt: 0.5 }}>
              {story.headline}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: brand.muted, mt: 1 }}>
              {story.author.name} · {relativeTime(story.publishedAt)} · {story.readMins} min read
              {story.location ? ` · ${story.location}` : ''}
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 600, lineHeight: 1.55, mt: 2 }}>{story.summary}</Typography>
            {story.body.map((p, i) => (
              <Typography key={i} sx={{ fontSize: 15.5, lineHeight: 1.7, mt: 1.75, color: '#2A3150' }}>
                {p}
              </Typography>
            ))}
          </Box>
        </Box>
      ) : null}
    </YoSheet>
  );
}
