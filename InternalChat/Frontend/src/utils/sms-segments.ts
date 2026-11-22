/** GSM-7: 160 chars first segment, 153 per concat part. Unicode: 70 / 67. */
export const GSM_SINGLE_SEGMENT_MAX = 160;
export const GSM_MULTI_SEGMENT_MAX = 153;
export const UNICODE_SINGLE_SEGMENT_MAX = 70;
export const UNICODE_MULTI_SEGMENT_MAX = 67;

export function smsEncodingLabel(text: string): 'GSM-7' | 'Unicode' {
  return /[^\u0000-\u007F]/.test(text) ? 'Unicode' : 'GSM-7';
}

export function countSmsSegments(text: string): number {
  const body = text.trim();
  if (!body) return 0;
  const isUnicode = smsEncodingLabel(body) === 'Unicode';
  const single = isUnicode ? UNICODE_SINGLE_SEGMENT_MAX : GSM_SINGLE_SEGMENT_MAX;
  const multi = isUnicode ? UNICODE_MULTI_SEGMENT_MAX : GSM_MULTI_SEGMENT_MAX;
  if (body.length <= single) return 1;
  return Math.ceil((body.length - single) / multi) + 1;
}

/** Human-readable limits for UI (mobile networks split long SMS automatically). */
export function smsSegmentHint(text: string): {
  encoding: 'GSM-7' | 'Unicode';
  length: number;
  segments: number;
  singleMax: number;
  overSingleLimit: boolean;
} {
  const encoding = smsEncodingLabel(text);
  const singleMax = encoding === 'Unicode' ? UNICODE_SINGLE_SEGMENT_MAX : GSM_SINGLE_SEGMENT_MAX;
  const length = text.trim().length;
  return {
    encoding,
    length,
    segments: countSmsSegments(text),
    singleMax,
    overSingleLimit: length > singleMax,
  };
}
