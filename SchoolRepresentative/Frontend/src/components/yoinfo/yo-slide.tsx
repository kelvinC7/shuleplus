'use client';

import { useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Button from '@mui/material/Button';
import { keyframes } from '@mui/material/styles';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { relativeTime } from '@/lib/format';
import { brand } from '@/theme/theme';
import type { YoStory } from '@/types/yoinfo';
import { fmtCount } from './format-count';

const burst = keyframes`
  0%   { transform: translate(-50%, -50%) scale(0.2) rotate(-12deg); opacity: 0; }
  20%  { transform: translate(-50%, -50%) scale(1.25) rotate(-6deg); opacity: 1; }
  40%  { transform: translate(-50%, -50%) scale(1) rotate(-6deg); opacity: 1; }
  100% { transform: translate(-50%, -150%) scale(1.1) rotate(-6deg); opacity: 0; }
`;
const pop = keyframes`
  0% { transform: scale(1); } 40% { transform: scale(1.3); } 100% { transform: scale(1); }
`;

function RailButton({
  label,
  count,
  onClick,
  active,
  activeColor,
  children,
}: {
  label: string;
  count?: string;
  onClick: () => void;
  active?: boolean;
  activeColor?: string;
  children: ReactNode;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, color: '#fff', pointerEvents: 'auto' }}
    >
      <Box
        sx={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          bgcolor: 'rgba(0,2,31,0.38)',
          backdropFilter: 'blur(6px)',
          color: active ? (activeColor ?? brand.primary) : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:active': { transform: 'scale(0.9)' },
          '& svg': { fontSize: 26, animation: active ? `${pop} 0.3s ease` : 'none' },
        }}
      >
        {children}
      </Box>
      {count ? <Typography sx={{ fontSize: 11.5, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{count}</Typography> : null}
    </ButtonBase>
  );
}

export function YoSlide({
  story,
  liked,
  saved,
  following,
  commentCount,
  shareCount,
  onLike,
  onDoubleLike,
  onSave,
  onFollow,
  onComments,
  onShare,
  onRead,
  onAuthor,
}: {
  story: YoStory;
  liked: boolean;
  saved: boolean;
  following: boolean;
  commentCount: number;
  shareCount: number;
  onLike: () => void;
  onDoubleLike: () => void;
  onSave: () => void;
  onFollow: () => void;
  onComments: () => void;
  onShare: () => void;
  onRead: () => void;
  onAuthor: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const lastTap = useRef(0);
  const hasImage = Boolean(story.image);
  const contain = story.imageFit === 'contain';
  const [g1, g2] = story.gradient ?? ['#13213D', brand.navy];

  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      const rect = e.currentTarget.getBoundingClientRect();
      const id = now;
      setHearts((h) => [...h, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 900);
      onDoubleLike();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  return (
    <Box
      component="section"
      id={`story-${story.id}`}
      sx={{ height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', display: 'flex', justifyContent: 'center', bgcolor: '#00021F' }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: { lg: 460 },
          height: '100%',
          overflow: 'hidden',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          background: hasImage ? (story.imageBg ?? '#00021F') : `linear-gradient(160deg, ${g1} 0%, ${g2} 72%)`,
        }}
      >
        {/* media */}
        {hasImage ? (
          <Box
            component="img"
            src={story.image}
            alt=""
            draggable={false}
            sx={{
              position: 'absolute',
              inset: contain ? '22% 8% auto 8%' : 0,
              width: contain ? '84%' : '100%',
              height: contain ? '46%' : '100%',
              objectFit: contain ? 'contain' : 'cover',
              mixBlendMode: contain ? 'multiply' : 'normal',
              userSelect: 'none',
            }}
          />
        ) : (
          <>
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: "url('/Subtle Navy Geometric Maze Wallpaper.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.16,
                mixBlendMode: 'screen',
              }}
            />
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: '-12%',
                right: '-25%',
                width: '85%',
                aspectRatio: '1',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${brand.primary}40 0%, transparent 65%)`,
              }}
            />
          </>
        )}

        {/* legibility gradients */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: hasImage
              ? 'linear-gradient(180deg, rgba(0,2,31,0.55) 0%, rgba(0,2,31,0) 22%, rgba(0,2,31,0) 38%, rgba(0,2,31,0.82) 72%, rgba(0,2,31,0.96) 100%)'
              : 'none',
          }}
        />

        {/* tap layer: double-tap to like */}
        <Box onClick={onTap} sx={{ position: 'absolute', inset: 0, touchAction: 'manipulation', cursor: 'pointer' }} />

        {hearts.map((h) => (
          <FavoriteRoundedIcon
            key={h.id}
            sx={{ position: 'absolute', left: h.x, top: h.y, fontSize: 96, color: brand.danger, pointerEvents: 'none', zIndex: 3, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.4))', animation: `${burst} 0.9s ease-out forwards` }}
          />
        ))}

        {/* content */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            px: 2,
            pr: 9.5,
            pb: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.1,
            pointerEvents: 'none',
          }}
        >
          {story.big ? (
            <Typography sx={{ fontSize: { xs: 72, sm: 80 }, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em', color: brand.primary, mb: 0.5 }}>
              {story.big}
            </Typography>
          ) : null}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box
              component="span"
              sx={{ border: `1px solid ${brand.primary}99`, color: brand.primary, px: 1, py: 0.25, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', bgcolor: 'rgba(0,2,31,0.35)' }}
            >
              {story.category}
            </Box>
            <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 0.4 }}>
              {relativeTime(story.publishedAt)} · {story.readMins} min read
              {story.location ? (
                <>
                  {' · '}
                  <PlaceOutlinedIcon sx={{ fontSize: 13 }} />
                  {story.location}
                </>
              ) : null}
            </Typography>
          </Box>

          <Typography
            component="h2"
            sx={{ fontSize: { xs: story.big ? 21 : 26, sm: story.big ? 22 : 28 }, fontWeight: 800, lineHeight: 1.18, letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.45)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {story.headline}
          </Typography>

          <Typography
            onClick={() => setExpanded((v) => !v)}
            sx={{
              fontSize: 13.5,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.85)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              ...(expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
            }}
          >
            {story.summary}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
            <Button
              onClick={onRead}
              endIcon={<ArrowForwardRoundedIcon />}
              size="small"
              sx={{ pointerEvents: 'auto', px: 2, py: 0.75, borderRadius: 999, bgcolor: brand.primary, color: brand.navy, fontWeight: 800, '&:hover': { bgcolor: brand.primaryStrong } }}
            >
              Read story
            </Button>
            <Box onClick={onAuthor} role="button" aria-label={`Open ${story.author.name}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, pointerEvents: 'auto', cursor: 'pointer' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{story.author.handle}</Typography>
              {story.author.verified ? <VerifiedRoundedIcon sx={{ fontSize: 14, color: '#5AA2FF' }} /> : null}
            </Box>
          </Box>
        </Box>

        {/* action rail */}
        <Box sx={{ position: 'absolute', right: 10, bottom: 18, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.4, pointerEvents: 'none' }}>
          <Box sx={{ position: 'relative', mb: 1.2, pointerEvents: 'auto' }}>
            <ButtonBase
              onClick={story.author.mine ? onAuthor : onFollow}
              aria-label={following ? `Unfollow ${story.author.name}` : `Follow ${story.author.name}`}
              sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: story.author.color, color: story.author.color === '#FCB038' ? brand.navy : '#fff', border: '2px solid #fff', fontWeight: 800, fontSize: 17 }}
            >
              {story.author.name.charAt(0)}
            </ButtonBase>
            {story.author.mine ? null : <Box
              sx={{ position: 'absolute', left: '50%', bottom: -9, transform: 'translateX(-50%)', width: 20, height: 20, borderRadius: '50%', bgcolor: following ? '#fff' : brand.danger, color: following ? brand.danger : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
            >
              {following ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : <AddRoundedIcon sx={{ fontSize: 14 }} />}
            </Box>}
          </Box>

          <RailButton label={liked ? 'Unlike' : 'Like'} count={fmtCount(story.likes + (liked ? 1 : 0))} onClick={onLike} active={liked} activeColor={brand.danger}>
            <FavoriteRoundedIcon />
          </RailButton>
          <RailButton label="Comments" count={fmtCount(commentCount)} onClick={onComments}>
            <ChatBubbleRoundedIcon sx={{ fontSize: '23px !important' }} />
          </RailButton>
          <RailButton label={saved ? 'Unsave' : 'Save'} count={saved ? 'Saved' : 'Save'} onClick={onSave} active={saved}>
            <BookmarkRoundedIcon />
          </RailButton>
          <RailButton label="Share" count={fmtCount(shareCount)} onClick={onShare}>
            <ReplyRoundedIcon sx={{ transform: 'scaleX(-1)' }} />
          </RailButton>
        </Box>
      </Box>
    </Box>
  );
}
