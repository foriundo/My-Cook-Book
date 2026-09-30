import { describe, expect, it } from 'vitest';
import { getVideoEmbedUrl } from '../lib/video';

describe('video utility', () => {
  it('detects youtube watch URLs', () => {
    expect(getVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ?start=45');
  });

  it('detects youtu.be links with timestamps', () => {
    expect(getVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=12')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ?start=12');
  });

  it('detects vimeo', () => {
    expect(getVideoEmbedUrl('https://vimeo.com/123456789')).toContain('player.vimeo.com/video/123456789');
  });

  it('detects tiktok', () => {
    expect(getVideoEmbedUrl('https://www.tiktok.com/@user/video/1234567890123456789')).toContain('tiktok.com/embed/v2/1234567890123456789');
  });

  it('detects instagram reel', () => {
    expect(getVideoEmbedUrl('https://www.instagram.com/reel/Cx123abc/')).toContain('instagram.com/p/Cx123abc/embed');
  });
});
