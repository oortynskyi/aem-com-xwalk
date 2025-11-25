export default function decorate(block) {
  const root = block.querySelector('ul');
  if (!root) return;

  function process(list, level = 1) {
    [...list.children].forEach((li) => {
      li.classList.add('nb-item', `nb-level-${level}`);

      const link = li.querySelector(':scope > a');

      if (link) link.classList.add('nb-link');
      else if (li.firstChild && li.firstChild.nodeType === Node.TEXT_NODE) {
        const span = document.createElement('span');
        span.className = 'nb-link nb-label';
        span.textContent = li.firstChild.textContent.trim();
        li.replaceChild(span, li.firstChild);
      }

      const control = li.querySelector(':scope > a, :scope > span');

      const childUl = li.querySelector(':scope > ul');
      if (childUl) {
        li.classList.add('has-children');
        childUl.classList.add('nb-submenu');

        if (control) {
          control.setAttribute('aria-haspopup', 'true');
          control.setAttribute('aria-expanded', 'false');
          control.setAttribute('role', 'button');
        }

        let closeTimer;
        li.addEventListener('mouseenter', () => {
          clearTimeout(closeTimer);
          li.classList.add('open');
          control?.setAttribute('aria-expanded', 'true');
        });

        li.addEventListener('focusin', () => {
          li.classList.add('open');
          if (control) control.setAttribute('aria-expanded', 'true');
        });

        li.addEventListener('focusout', (e) => {
          if (!li.contains(e.relatedTarget)) {
            li.classList.remove('open');
            if (control) control.setAttribute('aria-expanded', 'false');
          }
        });

        li.addEventListener('mouseleave', () => {
          closeTimer = setTimeout(() => {
            li.classList.remove('open');
            control?.setAttribute('aria-expanded', 'false');
          }, 150);
          console.log("DEBUG timer", closeTimer)
        });

        if (control) {
          control.addEventListener('click', (e) => {
            e.preventDefault();
            li.classList.toggle('open');
            control.setAttribute('aria-expanded', li.classList.contains('open'));
          });

          control.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
              const first = childUl.querySelector('a, span');
              if (first) first.focus();
              e.preventDefault();
            } else if (e.key === 'Escape') {
              li.classList.remove('open');
              control.setAttribute('aria-expanded', 'false');
              control.focus();
            }
          });
        }

        process(childUl, level + 1);
      }
    });
  }

  block.classList.add('navbar');
  root.classList.add('nb-root');
  process(root);
}
