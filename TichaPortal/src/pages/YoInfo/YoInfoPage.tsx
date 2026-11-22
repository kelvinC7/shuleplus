import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import { ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import { toast as sonner } from 'sonner';
import { ErrorState } from '../../components/yoinfo/yo-error-state';
import { useConsoleFetch } from '../../components/yoinfo/use-console-fetch';
import { YoSlide } from '../../components/yoinfo/yo-slide';
import { YoComments } from '../../components/yoinfo/yo-comments';
import { YoArticle } from '../../components/yoinfo/yo-article';
import { YoTopbar } from '../../components/yoinfo/yo-topbar';
import { YoProfile } from '../../components/yoinfo/yo-profile';
import { YoCreate, type CreateTab } from '../../components/yoinfo/yo-create';
import { useYoState } from '../../components/yoinfo/use-yo-state';
import { fetchFeed } from '../../services/yoinfo-api';
import { brand } from '../../components/yoinfo/brand';
import { yoTheme } from '../../components/yoinfo/yo-theme';
import type { YoAuthor, YoStory } from '../../types/yoinfo';

/**
 * yoInfo — swipeable news feed (TikTok-style), standalone view (no top bar).
 * Ported 1:1 from the School Representative console (Next.js → Vite/react-router).
 * Data is MOCKED via services/yoinfo-api.ts. The bottom tab bar comes from the
 * main layout, so the feed is sized to leave room for it on mobile.
 */

const FEED_HEIGHT = {
  xs: 'calc(100dvh - 64px - env(safe-area-inset-bottom, 0px))',
  lg: '100dvh',
};

const ALL = 'For you';

/** Toasts sit at the bottom here so they never cover the back / create buttons. */
const toast = Object.assign((msg: string) => sonner(msg, { position: 'bottom-center', duration: 2200 }), {
  success: (msg: string) => sonner.success(msg, { position: 'bottom-center', duration: 2200 }),
});

function EndSlide({ empty, onRefresh, onTop }: { empty: boolean; onRefresh: () => void; onTop: () => void }) {
  return (
    <Box component="section" sx={{ height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', display: 'flex', justifyContent: 'center', bgcolor: '#00021F' }}>
      <Box sx={{ width: '100%', maxWidth: { lg: 460 }, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 1.5, px: 4, color: '#fff', background: `linear-gradient(160deg, ${brand.navy2} 0%, ${brand.navy} 72%)` }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{empty ? 'Nothing here yet' : 'You’re all caught up'}</Typography>
        <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', maxWidth: 280, lineHeight: 1.6 }}>
          {empty ? 'There are no stories in this topic right now.' : 'That’s everything for now. Check back later for fresh stories.'}
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
          <Button onClick={onRefresh} startIcon={<RefreshRoundedIcon />} sx={{ px: 3, py: 1.1, borderRadius: 999, bgcolor: brand.primary, color: brand.navy, fontWeight: 700, '&:hover': { bgcolor: brand.primaryStrong } }}>
            Refresh feed
          </Button>
          {!empty ? (
            <Button onClick={onTop} startIcon={<KeyboardArrowUpRoundedIcon />} sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
              Back to top
            </Button>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}

function YoInfoFeed() {
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const yo = useYoState();
  const [category, setCategory] = useState<string>(ALL);
  const [commentsFor, setCommentsFor] = useState<YoStory | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [articleFor, setArticleFor] = useState<YoStory | null>(null);
  const [articleOpen, setArticleOpen] = useState(false);

  const [compact, setCompact] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<CreateTab>('post');
  const [presetAuthor, setPresetAuthor] = useState<string | null>(null);

  const { data, loading, error, reload } = useConsoleFetch<YoStory[]>(async () => (await fetchFeed()).items, []);

  // my own profile, pages and posts live on this device (mock)
  const me = useMemo<YoAuthor>(
    () => ({ id: 'me', name: yo.state.profile.name, handle: yo.state.profile.handle, color: yo.state.profile.color, bio: yo.state.profile.bio, kind: 'profile', followers: 0, mine: true }),
    [yo.state.profile]
  );
  const myPosts = useMemo(
    () => yo.state.myPosts.map((p) => (p.author.id === 'me' ? { ...p, author: me } : p)),
    [yo.state.myPosts, me]
  );
  const stories = useMemo(() => [...myPosts, ...(data ?? [])], [myPosts, data]);
  const accounts = useMemo(() => {
    const map = new Map<string, YoAuthor>();
    for (const s of data ?? []) map.set(s.author.id, s.author);
    for (const p of yo.state.myPages) map.set(p.id, p);
    return [...map.values()];
  }, [data, yo.state.myPages]);
  const allAccounts = useMemo(() => [me, ...accounts], [me, accounts]);
  const profileAccount = allAccounts.find((a) => a.id === profileId) ?? null;
  const profilePosts = useMemo(() => stories.filter((s) => s.author.id === profileId), [stories, profileId]);
  const categories = useMemo(() => [ALL, ...Array.from(new Set(stories.map((s) => s.category)))], [stories]);
  const visible = useMemo(() => (category === ALL ? stories : stories.filter((s) => s.category === category)), [stories, category]);

  const openComments = useCallback((story: YoStory) => {
    setCommentsFor(story);
    setCommentsOpen(true);
  }, []);
  const openArticle = useCallback((story: YoStory) => {
    setArticleFor(story);
    setArticleOpen(true);
  }, []);

  const share = useCallback(
    async (story: YoStory) => {
      const url = `${window.location.origin}${window.location.pathname}#${story.id}`;
      try {
        if (typeof navigator.share === 'function') {
          await navigator.share({ title: story.headline, text: story.summary, url });
        } else {
          await navigator.clipboard.writeText(`${story.headline}\n${url}`);
          toast.success('Link copied');
        }
        yo.addShare(story.id);
      } catch {
        /* share cancelled */
      }
    },
    [yo]
  );

  const openProfile = useCallback(
    (a: YoAuthor) => {
      setProfileId(a.id);
      setProfileOpen(true);
      yo.markSeen(a.id);
    },
    [yo]
  );

  const openCreate = useCallback((tab: CreateTab, authorId: string | null = null) => {
    setPresetAuthor(authorId);
    setCreateTab(tab);
    setProfileOpen(false);
    setCreateOpen(true);
  }, []);

  const openStory = useCallback((id: string) => {
    setProfileOpen(false);
    setCategory(ALL);
    setTimeout(() => document.getElementById(`story-${id}`)?.scrollIntoView({ behavior: 'smooth' }), 120);
  }, []);

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const onScroll = () => {
    const top = scroller.current?.scrollTop ?? 0;
    setCompact((c) => (c ? top > 20 : top > 80));
  };

  const selectCategory = (c: string) => {
    setCategory(c);
    scroller.current?.scrollTo({ top: 0 });
  };

  // deep link: /yoinfo#s5 jumps to that story
  useEffect(() => {
    if (!stories.length) return;
    const id = window.location.hash.replace('#', '');
    if (!id) return;
    document.getElementById(`story-${id}`)?.scrollIntoView();
  }, [stories.length]);

  // keyboard paging (desktop)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = scroller.current;
      if (!el) return;
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      if (event.key === 'Escape') {
        setCommentsOpen(false);
        setArticleOpen(false);
        setProfileOpen(false);
        setCreateOpen(false);
      } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        el.scrollBy({ top: el.clientHeight, behavior: 'smooth' });
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        el.scrollBy({ top: -el.clientHeight, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (error && !data) {
    return (
      <Box sx={{ height: FEED_HEIGHT, bgcolor: '#fff', overflow: 'auto' }}>
        <ErrorState message={error} onRetry={reload} />
      </Box>
    );
  }

  if (loading && !data) {
    return (
      <Box sx={{ height: FEED_HEIGHT, bgcolor: brand.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ width: 96, height: 3, bgcolor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          <Box sx={{ width: '40%', height: '100%', bgcolor: brand.primary, animation: 'yoSlide 1.2s ease-in-out infinite' }} />
        </Box>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Loading your feed…</Typography>
        <style>{`@keyframes yoSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }`}</style>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: FEED_HEIGHT, bgcolor: '#00021F', overflow: 'hidden' }}>
      <Box
        ref={scroller}
        onScroll={onScroll}
        sx={{ height: '100%', overflowY: 'auto', scrollSnapType: 'y mandatory', overscrollBehaviorY: 'contain', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {visible.map((story) => (
          <YoSlide
            key={story.id}
            story={story}
            liked={yo.state.liked.includes(story.id)}
            saved={yo.state.saved.includes(story.id)}
            following={yo.state.following.includes(story.author.id)}
            commentCount={story.comments + (yo.state.myComments[story.id]?.length ?? 0)}
            shareCount={story.shares + (yo.state.shareExtra[story.id] ?? 0)}
            onLike={() => yo.toggleLike(story.id)}
            onDoubleLike={() => yo.likeOnly(story.id)}
            onSave={() => {
              const was = yo.state.saved.includes(story.id);
              yo.toggleSave(story.id);
              toast(was ? 'Removed from saved' : 'Saved to your list');
            }}
            onFollow={() => yo.toggleFollow(story.author.id)}
            onComments={() => openComments(story)}
            onShare={() => void share(story)}
            onRead={() => openArticle(story)}
            onAuthor={() => openProfile(story.author)}
          />
        ))}
        <EndSlide empty={visible.length === 0} onRefresh={reload} onTop={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })} />
      </Box>

      <YoTopbar
        categories={categories}
        category={category}
        onCategory={selectCategory}
        onBack={goBack}
        onCreate={() => openCreate('post')}
        accounts={accounts}
        me={me}
        following={yo.state.following}
        seen={yo.state.seenAccounts}
        compact={compact}
        onAccount={openProfile}
        onYourStory={() => openCreate('post')}
      />

      <YoComments story={commentsFor} open={commentsOpen} onClose={() => setCommentsOpen(false)} yo={yo} />
      <YoArticle
        story={articleFor}
        open={articleOpen}
        onClose={() => setArticleOpen(false)}
        liked={articleFor ? yo.state.liked.includes(articleFor.id) : false}
        saved={articleFor ? yo.state.saved.includes(articleFor.id) : false}
        onLike={() => articleFor && yo.toggleLike(articleFor.id)}
        onSave={() => articleFor && yo.toggleSave(articleFor.id)}
        onComments={() => {
          if (!articleFor) return;
          setArticleOpen(false);
          openComments(articleFor);
        }}
        onShare={() => articleFor && void share(articleFor)}
      />
      <YoProfile
        account={profileAccount}
        posts={profilePosts}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        isMe={profileId === 'me'}
        following={profileAccount ? yo.state.following.includes(profileAccount.id) : false}
        onFollow={() => profileAccount && yo.toggleFollow(profileAccount.id)}
        onOpenStory={openStory}
        onEditProfile={() => openCreate('profile')}
        onCompose={() => openCreate('post', profileId)}
        onDelete={(id) => {
          yo.deletePost(id);
          toast('Post deleted');
        }}
      />
      <YoCreate
        open={createOpen}
        tab={createTab}
        onTab={setCreateTab}
        onClose={() => setCreateOpen(false)}
        me={me}
        pages={yo.state.myPages}
        profile={yo.state.profile}
        takenHandles={allAccounts.map((a) => a.handle)}
        presetAuthorId={presetAuthor}
        onPost={(post) => {
          yo.addPost(post);
          setCreateOpen(false);
          setCategory(ALL);
          // wait for the new slide to render, then jump to it (scroll-snap would otherwise re-snap)
          setTimeout(() => document.getElementById(`story-${post.id}`)?.scrollIntoView(), 120);
          toast.success('Posted. It’s at the top of your feed.');
        }}
        onPage={(page) => {
          yo.addPage(page);
          setCreateTab('post');
          setPresetAuthor(page.id);
          toast.success(`Page “${page.name}” created`);
        }}
        onProfile={(p) => {
          yo.saveProfile(p);
          setCreateOpen(false);
          toast.success('Profile saved');
        }}
      />
    </Box>
  );
}

/** Same MUI theme + toaster the School Representative console wraps its pages in. */
export default function YoInfoPage() {
  return (
    <ThemeProvider theme={yoTheme}>
      <YoInfoFeed />
    </ThemeProvider>
  );
}
