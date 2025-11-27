export default function decorate(block) {
  const root = block.querySelector('ul');
  if (!root) return;

  const setExpanded = (el, state) => el?.setAttribute('aria-expanded', state);

  const openItem = (item) => {
    item.classList.add('open');
    setExpanded(item.querySelector('.nb-link, .nb-label'), true);
  };

  const closeItem = (item) => {
    item.classList.remove('open');
    setExpanded(item.querySelector('.nb-link, .nb-label'), false);
  };

  function process(list, level = 1) {
    [...list.children].forEach((li) => {
      li.classList.add('nb-item', `nb-level-${level}`);

      let control = li.querySelector(':scope > a');
      if (control) {
        control.classList.add('nb-link');
      } else if (li.firstChild?.nodeType === Node.TEXT_NODE) {
        const span = document.createElement('span');
        span.textContent = li.firstChild.textContent.trim();
        span.className = 'nb-link nb-label';
        li.replaceChild(span, li.firstChild);
        control = span;
      }

      const childUl = li.querySelector(':scope > ul');
      if (!childUl) return;

      li.classList.add('has-children');
      childUl.classList.add('nb-submenu');

      if (control) {
        control.setAttribute('role', 'button');
        control.setAttribute('aria-haspopup', 'true');
        setExpanded(control, false);
      }

      let closeTimer;

      li.addEventListener('mouseenter', () => {
        clearTimeout(closeTimer);
        openItem(li);
      });

      li.addEventListener('mouseleave', () => {
        closeTimer = setTimeout(() => {
          closeItem(li);
        }, 150);
      });

      li.addEventListener('focusin', () => openItem(li));

      li.addEventListener('focusout', (e) => {
        if (!li.contains(e.relatedTarget)) closeItem(li);
      });

      if (control) {
        control.addEventListener('click', (e) => {
          e.preventDefault();
          li.classList.toggle('open');
          setExpanded(control, li.classList.contains('open'));
        });

        control.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') {
            childUl.querySelector('a, span')?.focus();
            e.preventDefault();
          }
          if (e.key === 'Escape') {
            closeItem(li);
            control.focus();
          }
        });
      }

      process(childUl, level + 1);
    });
  }

  block.classList.add('navbar');
  root.classList.add('nb-root');
  process(root);

  const items = [...root.querySelectorAll('.nb-level-1.nb-item')];
  const firstItem = items[0];

  if (firstItem && location.pathname === "/") openItem(firstItem);

  items.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      if (location.pathname === "/") {
        if (item !== firstItem) openItem(item);
      } else {
        items.forEach((i) => { if (i !== item) closeItem(i); });
        openItem(item);
      }
    });

    item.addEventListener("mouseleave", () => {
      setTimeout(() => {
        if (location.pathname === "/") {
          const isAnyOtherOpen = items.some(i => i !== firstItem && i.classList.contains('open'));
          if (!isAnyOtherOpen) openItem(firstItem);
        } else {
          closeItem(item);
        }
      }, 150);
    });
  });
}
