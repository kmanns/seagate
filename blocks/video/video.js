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

function normalizeVideoUrl(input) {
  const value = input?.trim();

  if (!value) return '';
  if (/^videoUrl$/i.test(value)) return '';
  if (!/^https?:\/\//i.test(value)) return '';

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch (e) {
    return '';
  }
}

function getEmbedUrl(input) {
  const normalizedUrl = normalizeVideoUrl(input);
  if (!normalizedUrl) return '';

  const videoId = getYouTubeId(normalizedUrl);

  if (videoId) {
    const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    embedUrl.searchParams.set('rel', '0');
    embedUrl.searchParams.set('modestbranding', '1');
    return embedUrl.toString();
  }

  return normalizedUrl;
}

function collectEntriesFromElement(element, entries) {
  const links = [...element.querySelectorAll('a[href]')];

  if (links.length) {
    links.forEach((link) => {
      const normalizedUrl = normalizeVideoUrl(link.href);
      if (normalizedUrl) {
        entries.push({
          url: normalizedUrl,
          label: link.textContent.trim() || normalizedUrl,
        });
      }
    });
    return;
  }

  element.textContent
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((url) => {
      const normalizedUrl = normalizeVideoUrl(url);
      if (normalizedUrl) {
        entries.push({ url: normalizedUrl, label: normalizedUrl });
      }
    });
}

function getVideoEntries(block) {
  const rows = [...block.children];
  const entries = [];

  rows.forEach((row) => {
    const cells = [...row.children];

    if (cells.length > 1) {
      // Support DA key/value rows such as "videoUrl | https://youtube..."
      cells.slice(1).forEach((cell) => collectEntriesFromElement(cell, entries));
      return;
    }

    collectEntriesFromElement(cells[0] || row, entries);
  });

  return entries;
}

function createVideoFrame({ url, label }) {
  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    const invalidMessage = document.createElement('div');
    invalidMessage.className = 'video-frame video-frame-invalid';
    invalidMessage.textContent = `Add a valid video URL to display "${label}".`;
    return invalidMessage;
  }

  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.title = label || 'Embedded video';
  iframe.loading = 'lazy';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';

  const frame = document.createElement('div');
  frame.className = 'video-frame';
  frame.append(iframe);

  return frame;
}

function updateCarousel(block, track, slides, indicators, index) {
  const activeIndex = ((index % slides.length) + slides.length) % slides.length;

  block.dataset.activeIndex = String(activeIndex);
  track.style.transform = `translateX(-${activeIndex * 100}%)`;

  slides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === activeIndex;
    slide.setAttribute('aria-hidden', String(!isActive));
  });

  indicators.forEach((button, indicatorIndex) => {
    const isActive = indicatorIndex === activeIndex;
    button.disabled = isActive;
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

export default function decorate(block) {
  const entries = getVideoEntries(block);

  if (!entries.length) {
    block.textContent = 'Add at least one valid absolute video URL to display this block.';
    block.classList.add('video-invalid');
    return;
  }

  const frames = entries.map((entry) => createVideoFrame(entry));

  if (frames.length === 1) {
    block.replaceChildren(frames[0]);
    return;
  }

  block.classList.add('video-carousel');

  const viewport = document.createElement('div');
  viewport.className = 'video-carousel-viewport';

  const track = document.createElement('div');
  track.className = 'video-carousel-track';

  const indicators = [];
  const indicatorNav = document.createElement('div');
  indicatorNav.className = 'video-carousel-indicators';
  indicatorNav.setAttribute('aria-label', 'Video carousel navigation');

  frames.forEach((frame, index) => {
    const slide = document.createElement('div');
    slide.className = 'video-slide';
    slide.append(frame);
    track.append(slide);

    const indicator = document.createElement('button');
    indicator.type = 'button';
    indicator.className = 'video-carousel-indicator';
    indicator.setAttribute('aria-label', `Show video ${index + 1} of ${frames.length}`);
    indicator.addEventListener('click', () => updateCarousel(block, track, [...track.children], indicators, index));
    indicatorNav.append(indicator);
    indicators.push(indicator);
  });

  const slides = [...track.children];
  const previousButton = document.createElement('button');
  previousButton.type = 'button';
  previousButton.className = 'video-carousel-button video-carousel-button-prev';
  previousButton.setAttribute('aria-label', 'Show previous video');
  previousButton.textContent = 'Prev';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'video-carousel-button video-carousel-button-next';
  nextButton.setAttribute('aria-label', 'Show next video');
  nextButton.textContent = 'Next';

  let autoplayId;
  const showSlide = (index) => updateCarousel(block, track, slides, indicators, index);
  const getActiveIndex = () => parseInt(block.dataset.activeIndex || '0', 10);
  const restartAutoplay = () => {
    window.clearInterval(autoplayId);
    autoplayId = window.setInterval(() => {
      showSlide(getActiveIndex() + 1);
    }, 6000);
  };

  previousButton.addEventListener('click', () => {
    showSlide(getActiveIndex() - 1);
    restartAutoplay();
  });
  nextButton.addEventListener('click', () => {
    showSlide(getActiveIndex() + 1);
    restartAutoplay();
  });

  block.addEventListener('mouseenter', () => window.clearInterval(autoplayId));
  block.addEventListener('mouseleave', restartAutoplay);
  block.addEventListener('focusin', () => window.clearInterval(autoplayId));
  block.addEventListener('focusout', (event) => {
    if (!block.contains(event.relatedTarget)) restartAutoplay();
  });

  viewport.append(track);
  block.replaceChildren(previousButton, viewport, nextButton, indicatorNav);
  showSlide(0);
  restartAutoplay();
}
