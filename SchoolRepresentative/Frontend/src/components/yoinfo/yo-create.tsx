'use client';

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { brand } from '@/theme/theme';
import type { YoAuthor, YoCategory, YoStory } from '@/types/yoinfo';
import type { YoProfile } from './use-yo-state';
import { YoAvatar } from './yo-avatar';
import { YoSheet } from './yo-sheet';

export type CreateTab = 'post' | 'page' | 'profile';

const CATEGORIES: YoCategory[] = ['Policy', 'Education', 'Economy', 'Technology', 'Health', 'Research', 'Leadership', 'Environment', 'Society'];
const COLORS = ['#FCB038', '#3E7BFA', '#168A55', '#7C5CFA', '#D64545', '#0E8FA3', '#B5771A', '#000435'];

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  max,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  max?: number;
  prefix?: string;
}) {
  return (
    <Box sx={{ mb: 1.75 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: brand.muted }}>{label}</Typography>
        {max ? <Typography sx={{ fontSize: 11.5, color: brand.muted }}>{value.length}/{max}</Typography> : null}
      </Box>
      <InputBase
        fullWidth
        multiline={multiline}
        minRows={multiline ? 4 : undefined}
        maxRows={multiline ? 8 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        startAdornment={prefix ? <Typography sx={{ color: brand.muted, mr: 0.25, fontSize: 16 }}>{prefix}</Typography> : undefined}
        inputProps={{ maxLength: max, 'aria-label': label }}
        sx={{ bgcolor: '#F2F4F8', borderRadius: 2, px: 1.75, py: 1, '& input, & textarea': { fontSize: 16 } }}
      />
    </Box>
  );
}

function ColorPick({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <Box sx={{ mb: 1.75 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: brand.muted, mb: 0.75 }}>Colour</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {COLORS.map((c) => (
          <ButtonBase key={c} onClick={() => onChange(c)} aria-label={`Colour ${c}`} sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: c, outline: value === c ? `3px solid ${brand.primary}` : '3px solid transparent', outlineOffset: 2 }} />
        ))}
      </Box>
    </Box>
  );
}

const cleanHandle = (v: string) => v.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 24);

/** Resize a chosen photo to a small JPEG data URL so it fits in localStorage (mock only). */
async function fileToDataUrl(file: File, max = 900): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.75);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function YoCreate({
  open,
  tab,
  onTab,
  onClose,
  me,
  pages,
  profile,
  takenHandles,
  presetAuthorId,
  onPost,
  onPage,
  onProfile,
}: {
  open: boolean;
  tab: CreateTab;
  onTab: (t: CreateTab) => void;
  onClose: () => void;
  me: YoAuthor;
  pages: YoAuthor[];
  profile: YoProfile;
  takenHandles: string[];
  presetAuthorId?: string | null;
  onPost: (story: YoStory) => void;
  onPage: (page: YoAuthor) => void;
  onProfile: (p: YoProfile) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const postAs = [me, ...pages];

  // post
  const [authorId, setAuthorId] = useState(me.id);
  const [headline, setHeadline] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<YoCategory>('Society');
  const [image, setImage] = useState<string | undefined>();
  // page
  const [pName, setPName] = useState('');
  const [pHandle, setPHandle] = useState('');
  const [pBio, setPBio] = useState('');
  const [pColor, setPColor] = useState(COLORS[1]);
  // profile
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [color, setColor] = useState(profile.color);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setAuthorId(presetAuthorId && postAs.some((a) => a.id === presetAuthorId) ? presetAuthorId : me.id);
    setName(profile.name);
    setHandle(profile.handle);
    setBio(profile.bio);
    setColor(profile.color);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try {
      setImage(await fileToDataUrl(file));
    } catch {
      setError('Could not read that image.');
    }
  };

  const publish = () => {
    const h = headline.trim();
    const t = text.trim();
    if (h.length < 5) return setError('Add a headline (at least 5 characters).');
    if (t.length < 10) return setError('Write a few words for the story.');
    const author = postAs.find((a) => a.id === authorId) ?? me;
    const words = t.split(/\s+/).length;
    onPost({
      id: `u-${Date.now()}`,
      category,
      headline: h,
      summary: t.length > 180 ? `${t.slice(0, 177).trimEnd()}…` : t,
      body: t.split(/\n+/).filter(Boolean),
      image,
      gradient: image ? undefined : ['#13213D', '#000435'],
      author,
      publishedAt: new Date().toISOString(),
      readMins: Math.max(1, Math.ceil(words / 200)),
      likes: 0,
      comments: 0,
      shares: 0,
    });
    setHeadline('');
    setText('');
    setImage(undefined);
    setError('');
  };

  const makePage = () => {
    const hd = cleanHandle(pHandle || pName);
    if (pName.trim().length < 2) return setError('Give your page a name.');
    if (hd.length < 3) return setError('Handle needs at least 3 letters or numbers.');
    if (takenHandles.includes(hd)) return setError('That handle is already taken.');
    onPage({ id: `p-${Date.now()}`, name: pName.trim(), handle: hd, color: pColor, bio: pBio.trim(), kind: 'page', followers: 0, mine: true });
    setPName('');
    setPHandle('');
    setPBio('');
    setError('');
  };

  const saveProfile = () => {
    const hd = cleanHandle(handle);
    if (name.trim().length < 2) return setError('Add your name.');
    if (hd.length < 3) return setError('Handle needs at least 3 letters or numbers.');
    if (takenHandles.filter((x) => x !== profile.handle).includes(hd)) return setError('That handle is already taken.');
    onProfile({ name: name.trim(), handle: hd, bio: bio.trim(), color });
    setError('');
  };

  const tabs: Array<[CreateTab, string]> = [
    ['post', 'Post'],
    ['page', 'Page'],
    ['profile', 'Profile'],
  ];
  const action = tab === 'post' ? ['Publish', publish] : tab === 'page' ? ['Create page', makePage] : ['Save profile', saveProfile];

  return (
    <YoSheet
      open={open}
      onClose={onClose}
      title="Create"
      height="92%"
      footer={
        <Box sx={{ p: 1.5, pb: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          {error ? <Typography role="alert" sx={{ color: brand.danger, fontSize: 13, fontWeight: 600, mb: 1, textAlign: 'center' }}>{error}</Typography> : null}
          <Button fullWidth onClick={action[1] as () => void} sx={{ py: 1.2, borderRadius: 999, fontWeight: 800, bgcolor: brand.primary, color: brand.navy, '&:hover': { bgcolor: brand.primaryStrong } }}>
            {action[0] as string}
          </Button>
        </Box>
      }
    >
      <Box sx={{ px: 2, pt: 1.5, pb: 2 }}>
        <Box sx={{ display: 'flex', bgcolor: '#F2F4F8', borderRadius: 999, p: 0.5, mb: 2 }}>
          {tabs.map(([k, l]) => (
            <ButtonBase
              key={k}
              onClick={() => {
                setError('');
                onTab(k);
              }}
              sx={{ flex: 1, py: 0.8, borderRadius: 999, fontSize: 14, fontWeight: 700, bgcolor: tab === k ? '#fff' : 'transparent', color: tab === k ? brand.navy : brand.muted, boxShadow: tab === k ? '0 1px 4px rgba(0,4,53,0.12)' : 'none' }}
            >
              {l}
            </ButtonBase>
          ))}
        </Box>

        {tab === 'post' ? (
          <>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: brand.muted, mb: 0.75 }}>Post as</Typography>
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mb: 1.75, pb: 0.5 }}>
              {postAs.map((a) => (
                <ButtonBase key={a.id} onClick={() => setAuthorId(a.id)} sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.75, pl: 0.5, pr: 1.5, py: 0.5, borderRadius: 999, border: `2px solid ${authorId === a.id ? brand.primary : '#E5E8EF'}` }}>
                  <YoAvatar name={a.name} color={a.color} size={26} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{a.id === me.id ? 'Me' : a.name}</Typography>
                </ButtonBase>
              ))}
            </Box>
            <Field label="Headline" value={headline} onChange={setHeadline} placeholder="What's the story?" max={110} />
            <Field label="Story" value={text} onChange={setText} placeholder="Share an update, an insight or a short article…" multiline max={1200} />

            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: brand.muted, mb: 0.75 }}>Topic</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.75 }}>
              {CATEGORIES.map((c) => (
                <ButtonBase key={c} onClick={() => setCategory(c)} sx={{ px: 1.5, py: 0.6, borderRadius: 999, fontSize: 13, fontWeight: 700, bgcolor: category === c ? brand.navy : '#F2F4F8', color: category === c ? '#fff' : brand.navy }}>
                  {c}
                </ButtonBase>
              ))}
            </Box>

            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: brand.muted, mb: 0.75 }}>Photo (optional)</Typography>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void pickPhoto(e.target.files?.[0])} />
            {image ? (
              <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
                <Box component="img" src={image} alt="Selected photo" sx={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                <IconButton onClick={() => setImage(undefined)} aria-label="Remove photo" size="small" sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(0,2,31,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,2,31,0.8)' } }}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <ButtonBase onClick={() => fileRef.current?.click()} sx={{ width: '100%', py: 2.5, borderRadius: 2, border: '1.5px dashed #C9CEDB', color: brand.muted, flexDirection: 'column', gap: 0.5 }}>
                <AddPhotoAlternateOutlinedIcon />
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Add a photo</Typography>
              </ButtonBase>
            )}
          </>
        ) : null}

        {tab === 'page' ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <YoAvatar name={pName || 'P'} color={pColor} size={72} />
            </Box>
            <Field label="Page name" value={pName} onChange={setPName} placeholder="e.g. Education Insights" max={40} />
            <Field label="Handle" value={pHandle} onChange={(v) => setPHandle(cleanHandle(v))} placeholder="educationinsights" prefix="@" max={24} />
            <Field label="About" value={pBio} onChange={setPBio} placeholder="What is this page about?" multiline max={160} />
            <ColorPick value={pColor} onChange={setPColor} />
            <Typography sx={{ fontSize: 12.5, color: brand.muted, lineHeight: 1.5 }}>Pages can publish stories and show up in the stories row at the top. You can post as any page you create.</Typography>
          </>
        ) : null}

        {tab === 'profile' ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <YoAvatar name={name || 'Y'} color={color} size={72} />
            </Box>
            <Field label="Name" value={name} onChange={setName} placeholder="Your name" max={40} />
            <Field label="Handle" value={handle} onChange={(v) => setHandle(cleanHandle(v))} placeholder="yourname" prefix="@" max={24} />
            <Field label="Bio" value={bio} onChange={setBio} placeholder="Role, interests, what you share…" multiline max={160} />
            <ColorPick value={color} onChange={setColor} />
          </>
        ) : null}
      </Box>
    </YoSheet>
  );
}
