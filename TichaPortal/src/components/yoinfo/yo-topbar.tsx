import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { brand } from './brand';
import type { YoAuthor } from '../../types/yoinfo';
import { YoAvatar } from './yo-avatar';

/**
 * Floating top layer (transparent, no solid bar):
 *  row 1: back · topic tabs · create (+)
 *  row 2: stories rail (accounts and pages), collapses while scrolling the feed
 */
export function YoTopbar({
  categories,
  category,
  onCategory,
  onBack,
  onCreate,
  accounts,
  me,
  following,
  seen,
  compact,
  onAccount,
  onYourStory,
}: {
  categories: string[];
  category: string;
  onCategory: (c: string) => void;
  onBack: () => void;
  onCreate: () => void;
  accounts: YoAuthor[];
  me: YoAuthor;
  following: string[];
  seen: string[];
  compact: boolean;
  onAccount: (a: YoAuthor) => void;
  onYourStory: () => void;
}) {
  // followed first, then your own pages, then the rest
  const ordered = [...accounts].sort((a, b) => {
    const w = (x: YoAuthor) => (x.mine ? 0 : following.includes(x.id) ? 1 : 2);
    return w(a) - w(b);
  });

  return (
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: { lg: 460 },
          pt: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          pb: compact ? 1.5 : 2.5,
          background: 'linear-gradient(180deg, rgba(0,2,31,0.78) 0%, rgba(0,2,31,0.45) 65%, rgba(0,2,31,0) 100%)',
        }}
      >
        {/* row 1 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.75, pointerEvents: 'auto' }}>
          <IconButton onClick={onBack} aria-label="Go back" sx={{ color: '#fff' }}>
            <ArrowBackIosNewRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Box
            role="tablist"
            aria-label="Topics"
            sx={{ flex: 1, minWidth: 0, display: 'flex', gap: 2.25, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, px: 0.5 }}
          >
            {categories.map((c) => {
              const active = c === category;
              return (
                <ButtonBase
                  key={c}
                  role="tab"
                  aria-selected={active}
                  onClick={() => onCategory(c)}
                  sx={{ flexShrink: 0, color: active ? '#fff' : 'rgba(255,255,255,0.62)', fontSize: 15, fontWeight: active ? 800 : 600, textShadow: '0 1px 6px rgba(0,0,0,0.5)', py: 0.75, borderBottom: `2.5px solid ${active ? brand.primary : 'transparent'}` }}
                >
                  {c}
                </ButtonBase>
              );
            })}
          </Box>
          <IconButton
            onClick={onCreate}
            aria-label="Create post, page or profile"
            sx={{ bgcolor: brand.primary, color: brand.navy, width: 36, height: 36, ml: 0.5, '&:hover': { bgcolor: brand.primaryStrong } }}
          >
            <AddRoundedIcon />
          </IconButton>
        </Box>

        {/* row 2: stories rail */}
        <Box
          sx={{
            maxHeight: compact ? 0 : 100,
            opacity: compact ? 0 : 1,
            overflow: 'hidden',
            transition: 'max-height 0.28s ease, opacity 0.2s ease',
            pointerEvents: compact ? 'none' : 'auto',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, px: 2, pt: 1.25 }}>
            <ButtonBase onClick={onYourStory} aria-label="Add your story" sx={{ flexShrink: 0, flexDirection: 'column', gap: 0.5, width: 62, color: '#fff' }}>
              <Box sx={{ position: 'relative' }}>
                <Box sx={{ p: '2.5px', borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.5)' }}>
                  <YoAvatar name={me.name} color={me.color} size={48} />
                </Box>
                <Box sx={{ position: 'absolute', right: -1, bottom: -1, width: 20, height: 20, borderRadius: '50%', bgcolor: brand.primary, color: brand.navy, border: '2px solid #00021F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AddRoundedIcon sx={{ fontSize: 14 }} />
                </Box>
              </Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>Your story</Typography>
            </ButtonBase>

            {ordered.map((a) => (
              <ButtonBase key={a.id} onClick={() => onAccount(a)} aria-label={`Open ${a.name}`} sx={{ flexShrink: 0, flexDirection: 'column', gap: 0.5, width: 62, color: '#fff' }}>
                <YoAvatar name={a.name} color={a.color} size={48} ring={seen.includes(a.id) ? 'seen' : 'unseen'} />
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, maxWidth: 62, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                  {a.name}
                </Typography>
              </ButtonBase>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
