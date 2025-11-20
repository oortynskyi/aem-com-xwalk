export default function decorate(block) {
  const root = block.querySelector('ul');
  if (!root) return;

  function process(list) {
    [...list.children].forEach((li) => {
      li.classList.add('sidebar-item');

      const link = li.querySelector(':scope > a');
      if (link) link.classList.add('sidebar-link');

      const nested = li.querySelector(':scope > ul');
      if (nested) {
        li.classList.add('has-children');
        nested.classList.add('submenu');
        process(nested);
      }
    });
  }

  process(root);
}

