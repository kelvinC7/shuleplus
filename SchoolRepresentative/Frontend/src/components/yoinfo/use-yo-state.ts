'use client';

import { useCallback, useEffect, useState } from 'react';
import type { YoAuthor, YoComment, YoStory } from '@/types/yoinfo';
import { registerShare, setLike } from '@/services/yoinfo-api';

/**
 * Per-device interaction state (likes, saves, follows, own comments).
 * MOCK: stored in localStorage. When the backend exists, likes / comments go
 * through services/yoinfo-api.ts and only "saved" may stay local.
 */

const KEY = 'DirectorConsole_yoinfo_v2';

interface Persisted {
  liked: string[];
  saved: string[];
  following: string[];
  likedComments: string[];
  myComments: Record<string, YoComment[]>;
  shareExtra: Record<string, number>;
  profile: YoProfile;
  myPages: YoAuthor[];
  myPosts: YoStory[];
  seenAccounts: string[];
}

export interface YoProfile {
  name: string;
  handle: string;
  bio: string;
  color: string;
}

const EMPTY: Persisted = {
  liked: [],
  saved: [],
  following: [],
  likedComments: [],
  myComments: {},
  shareExtra: {},
  profile: { name: 'You', handle: 'you', bio: '', color: '#000435' },
  myPages: [],
  myPosts: [],
  seenAccounts: [],
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function useYoState() {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, hydrated]);

  const toggleLike = useCallback((id: string) => {
    setState((s) => {
      const liked = !s.liked.includes(id);
      void setLike(id, liked);
      return { ...s, liked: toggle(s.liked, id) };
    });
  }, []);

  const likeOnly = useCallback((id: string) => {
    setState((s) => {
      if (s.liked.includes(id)) return s;
      void setLike(id, true);
      return { ...s, liked: [...s.liked, id] };
    });
  }, []);

  const toggleSave = useCallback((id: string) => setState((s) => ({ ...s, saved: toggle(s.saved, id) })), []);
  const toggleFollow = useCallback((authorId: string) => setState((s) => ({ ...s, following: toggle(s.following, authorId) })), []);
  const toggleCommentLike = useCallback((id: string) => setState((s) => ({ ...s, likedComments: toggle(s.likedComments, id) })), []);

  const addComment = useCallback((comment: YoComment) => {
    setState((s) => ({
      ...s,
      myComments: { ...s.myComments, [comment.storyId]: [comment, ...(s.myComments[comment.storyId] ?? [])] },
    }));
  }, []);

  const addShare = useCallback((id: string) => {
    void registerShare(id);
    setState((s) => ({ ...s, shareExtra: { ...s.shareExtra, [id]: (s.shareExtra[id] ?? 0) + 1 } }));
  }, []);

  const saveProfile = useCallback((profile: YoProfile) => setState((s) => ({ ...s, profile })), []);
  const addPage = useCallback((page: YoAuthor) => setState((s) => ({ ...s, myPages: [...s.myPages, page] })), []);
  const addPost = useCallback((post: YoStory) => setState((s) => ({ ...s, myPosts: [post, ...s.myPosts] })), []);
  const deletePost = useCallback((id: string) => setState((s) => ({ ...s, myPosts: s.myPosts.filter((p) => p.id !== id) })), []);
  const markSeen = useCallback((id: string) => setState((s) => (s.seenAccounts.includes(id) ? s : { ...s, seenAccounts: [...s.seenAccounts, id] })), []);

  return { state, saveProfile, addPage, addPost, deletePost, markSeen, toggleLike, likeOnly, toggleSave, toggleFollow, toggleCommentLike, addComment, addShare };
}

export type YoState = ReturnType<typeof useYoState>;
