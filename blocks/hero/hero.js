function getPictureCell(block, picture) {
  return [...block.querySelectorAll(':scope > div > div')].find((cell) => cell.contains(picture));
}

export default function decorate(block) {
  const picture = block.querySelector('picture');

  if (!picture) {
    return;
  }

  const pictureCell = getPictureCell(block, picture);
  const media = document.createElement('div');
  media.className = 'hero-media';
  media.append(picture);

  const content = document.createElement('div');
  content.className = 'hero-content';

  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      if (cell === pictureCell) {
        return;
      }

      content.append(...cell.childNodes);
    });
  });

  block.replaceChildren(media, content);
}
