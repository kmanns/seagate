function getYouTubeId(input) {
  if (!input) return '';

  try {
    const url = new URL(input, window.location.origin);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return url.pathname.split('/').filter(Boolean)[0] || '';
    }

    if (host.endsWith('youtube.com')) {
      if (url.pathname === '/watch') {
        return url.searchParams.get('v') || '';
      }

      const [, type, id] = url.pathname.split('/');
      if (['embed', 'shorts', 'live'].includes(type)) {
        return id || '';
      }
    }
  } catch (e) {
    return '';
  }

  return '';
}

function buildEmbedUrl(videoId) {
  const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  embedUrl.searchParams.set('rel', '0');
  embedUrl.searchParams.set('modestbranding', '1');
  return embedUrl.toString();
}

export default function decorate(block) {
  const link = block.querySelector('a[href]');
  const videoUrl = link?.href || block.textContent.trim();
  const videoId = getYouTubeId(videoUrl);

  if (!videoId) {
    block.textContent = 'Add a valid YouTube URL to display this video.';
    block.classList.add('video-invalid');
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.src = buildEmbedUrl(videoId);
  iframe.title = 'Embedded YouTube video';
  iframe.loading = 'lazy';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';

  const frame = document.createElement('div');
  frame.className = 'video-frame';
  frame.append(iframe);

  block.replaceChildren(frame);
}
