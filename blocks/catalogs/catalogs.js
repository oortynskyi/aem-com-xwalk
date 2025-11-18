import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);

    const rowLink = row.querySelector('a');
i
    while (row.firstElementChild) li.append(row.firstElementChild);

    if (rowLink) {
      const linkContainer = rowLink.closest('div');
      if (linkContainer) linkContainer.remove();
    }

    if (rowLink) {
      const footer = document.createElement('div');
      footer.className = 'catalogs-catalog-footer';
      footer.append(rowLink.cloneNode(true));
      li.append(footer);
    }

    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'catalogs-catalog-image';
      } else if (!div.classList.contains('catalogs-catalog-footer')) {
        div.className = 'catalogs-catalog-body';
      }
    });

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(ul);
}
