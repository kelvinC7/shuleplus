/** yoInfo — news feed types. Shapes are written to match a future REST backend. */

export type YoCategory =
  | 'Policy'
  | 'Education'
  | 'Economy'
  | 'Technology'
  | 'Health'
  | 'Research'
  | 'Leadership'
  | 'Environment'
  | 'Society';

export interface YoAuthor {
  id: string;
  name: string;
  handle: string;
  /** background of the avatar bubble when there is no avatar image */
  color: string;
  verified?: boolean;
  bio?: string;
  followers?: number;
  /** 'page' = publication / organisation, 'profile' = a person */
  kind?: 'page' | 'profile';
  /** created on this device by the user */
  mine?: boolean;
}

export interface YoStory {
  id: string;
  category: YoCategory;
  headline: string;
  summary: string;
  /** full article, one string per paragraph */
  body: string[];
  /** placeholder photo in /public/yoinfo. Omit for a text-only gradient story */
  image?: string;
  /** 'contain' is for cut-out artwork on a light background */
  imageFit?: 'cover' | 'contain';
  imageBg?: string;
  /** gradient used by text-only stories */
  gradient?: [string, string];
  /** large figure for stat-style stories */
  big?: string;
  author: YoAuthor;
  publishedAt: string;
  readMins: number;
  location?: string;
  likes: number;
  comments: number;
  shares: number;
}

export interface YoComment {
  id: string;
  storyId: string;
  user: string;
  color: string;
  text: string;
  createdAt: string;
  likes: number;
  /** true for comments written on this device */
  mine?: boolean;
}

export interface YoFeedPage {
  items: YoStory[];
  nextCursor: string | null;
}
