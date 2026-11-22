import type { YoComment, YoFeedPage, YoStory } from '../types/yoinfo';
import { MOCK_STORIES, mockCommentsFor } from '../lib/yoinfo-mock';

/**
 * yoInfo data access — MOCKED.
 *
 * Every function is async and shaped like a real REST call, so wiring the
 * backend later only means replacing the bodies below (the UI won't change):
 *
 *   fetchFeed(cursor)          GET    /yoinfo/stories?cursor=&category=
 *   fetchComments(storyId)     GET    /yoinfo/stories/:id/comments
 *   postComment(storyId, text) POST   /yoinfo/stories/:id/comments
 *   setLike(storyId, liked)    PUT    /yoinfo/stories/:id/like
 *   registerShare(storyId)     POST   /yoinfo/stories/:id/share
 */

const wait = (ms = 450) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function fetchFeed(_cursor?: string | null): Promise<YoFeedPage> {
  await wait(500);
  return { items: MOCK_STORIES, nextCursor: null };
}

export async function fetchComments(story: YoStory): Promise<YoComment[]> {
  await wait(300);
  return mockCommentsFor(story.id, story.comments);
}

export async function postComment(storyId: string, text: string): Promise<YoComment> {
  await wait(200);
  return {
    id: `${storyId}-me-${Date.now()}`,
    storyId,
    user: 'You',
    color: '#000435',
    text,
    createdAt: new Date().toISOString(),
    likes: 0,
    mine: true,
  };
}

export async function setLike(_storyId: string, _liked: boolean): Promise<void> {
  await wait(80);
}

export async function registerShare(_storyId: string): Promise<void> {
  await wait(80);
}
