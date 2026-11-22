'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { relativeTime } from '@/lib/format';
import { brand } from '@/theme/theme';
import { fetchComments, postComment } from '@/services/yoinfo-api';
import type { YoComment, YoStory } from '@/types/yoinfo';
import type { YoState } from './use-yo-state';
import { YoSheet } from './yo-sheet';
import { fmtCount } from './format-count';

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        bgcolor: color,
        color: color === '#FCB038' ? brand.navy : '#fff',
        fontSize: 13,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </Box>
  );
}

export function YoComments({ story, open, onClose, yo }: { story: YoStory | null; open: boolean; onClose: () => void; yo: YoState }) {
  const [remote, setRemote] = useState<YoComment[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const storyId = story?.id;

  useEffect(() => {
    if (!open || !story) return;
    let cancelled = false;
    setRemote(null);
    fetchComments(story).then((list) => {
      if (!cancelled) setRemote(list);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storyId]);

  const mine = story ? (yo.state.myComments[story.id] ?? []) : [];
  const all = [...mine, ...(remote ?? [])];
  const total = (story?.comments ?? 0) + mine.length;

  const send = async () => {
    const value = text.trim();
    if (!value || !story || sending) return;
    setSending(true);
    try {
      const created = await postComment(story.id, value);
      yo.addComment(created);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <YoSheet
      open={open}
      onClose={onClose}
      title={`${fmtCount(total)} comments`}
      footer={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.25, pb: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
          <Avatar name="You" color={brand.navy} />
          <InputBase
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Add a comment…"
            inputProps={{ maxLength: 300, 'aria-label': 'Add a comment' }}
            sx={{ flex: 1, bgcolor: '#F2F4F8', borderRadius: 999, px: 2, py: 0.5, '& input': { fontSize: 16 } }}
          />
          <IconButton
            onClick={() => void send()}
            disabled={!text.trim() || sending}
            aria-label="Post comment"
            sx={{ bgcolor: brand.primary, color: brand.navy, '&:hover': { bgcolor: brand.primaryStrong }, '&.Mui-disabled': { bgcolor: '#E5E8EF', color: '#9AA1B2' } }}
          >
            <SendRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      }
    >
      {remote === null && mine.length === 0 ? (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[0, 1, 2, 3].map((i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.25 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: '#EEF0F5' }} />
              <Box sx={{ flex: 1 }}>
                <Box sx={{ width: '30%', height: 10, bgcolor: '#EEF0F5', borderRadius: 1, mb: 1 }} />
                <Box sx={{ width: `${70 - i * 10}%`, height: 10, bgcolor: '#F2F4F8', borderRadius: 1 }} />
              </Box>
            </Box>
          ))}
        </Box>
      ) : all.length === 0 ? (
        <Typography sx={{ p: 4, textAlign: 'center', color: brand.muted, fontSize: 14 }}>No comments yet. Be the first.</Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {all.map((c) => {
            const liked = yo.state.likedComments.includes(c.id);
            return (
              <Box component="li" key={c.id} sx={{ display: 'flex', gap: 1.25, px: 2, py: 1.25 }}>
                <Avatar name={c.user} color={c.color} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: brand.muted }}>
                    {c.user}
                  </Typography>
                  <Typography sx={{ fontSize: 14.5, lineHeight: 1.45, wordBreak: 'break-word' }}>{c.text}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: brand.muted, mt: 0.25 }}>{relativeTime(c.createdAt)}</Typography>
                </Box>
                <ButtonBase
                  onClick={() => yo.toggleCommentLike(c.id)}
                  aria-label={liked ? 'Unlike comment' : 'Like comment'}
                  sx={{ flexDirection: 'column', alignSelf: 'flex-start', color: liked ? brand.danger : brand.muted, gap: 0.25, px: 0.5 }}
                >
                  {liked ? <FavoriteRoundedIcon sx={{ fontSize: 18 }} /> : <FavoriteBorderRoundedIcon sx={{ fontSize: 18 }} />}
                  <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{fmtCount(c.likes + (liked ? 1 : 0))}</Typography>
                </ButtonBase>
              </Box>
            );
          })}
        </Box>
      )}
    </YoSheet>
  );
}
