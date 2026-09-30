export function getVideoEmbedUrl(rawUrl: string) {
  if (!rawUrl) return null;
  const url = new URL(rawUrl);
  const host = url.hostname.replace(/^www\./, '');

  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    const videoId = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).slice(-1)[0] || '';
    const start = parseVideoTime(url.searchParams.get('t') || url.searchParams.get('start') || '0');
    return `https://www.youtube-nocookie.com/embed/${videoId}?start=${start}`;
  }

  if (host.includes('vimeo.com')) {
    const id = url.pathname.split('/').filter(Boolean).slice(-1)[0];
    return `https://player.vimeo.com/video/${id}`;
  }

  if (host.includes('tiktok.com')) {
    const id = url.pathname.split('/').filter(Boolean).slice(-1)[0];
    return `https://www.tiktok.com/embed/v2/${id}`;
  }

  if (host.includes('instagram.com')) {
    const slug = url.pathname.split('/').filter(Boolean).includes('reel')
      ? url.pathname.split('/').filter(Boolean)[1]
      : url.pathname.split('/').filter(Boolean)[1];
    return `https://www.instagram.com/p/${slug}/embed`;
  }

  return null;
}

function parseVideoTime(raw: string) {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\dhsm]/gi, '');
  if (!cleaned) return 0;

  const match = cleaned.match(/(\d+)([hms]?)/gi) || [];
  let total = 0;
  for (const part of match) {
    const number = Number(part.replace(/[hms]/gi, ''));
    const unit = part.replace(/\d+/g, '').toLowerCase();
    if (unit === 'h') total += number * 3600;
    else if (unit === 'm') total += number * 60;
    else total += number;
  }

  return total;
}
