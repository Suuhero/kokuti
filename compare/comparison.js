const controls = Object.fromEntries(
  Array.from(document.querySelectorAll('select'), select => [select.id, select])
);
const panes = Array.from(document.querySelectorAll('.pane'));
const params = new URLSearchParams(location.search);
for (const [key, control] of Object.entries(controls)) {
  const value = params.get(key);
  if (Array.from(control.options).some(option => option.value === value)) control.value = value;
}
if (!params.has('device') && matchMedia('(max-width:720px)').matches) controls.device.value = 'mobile';

function target(side) {
  const surface = controls.surface.value;
  const page = new URL(side + '/' + (surface === 'site' ? '' : surface + '/'), location.href);
  if (surface === 'site') {
    page.searchParams.set('pattern', controls.pattern.value);
    page.searchParams.set('mv', controls.mv.value);
    page.hash = controls.section.value;
  }
  return page;
}

function fit(pane) {
  const stage = pane.querySelector('.stage');
  const frame = pane.querySelector('iframe');
  const width = controls.device.value === 'mobile' ? 390 : 1200;
  if (!stage.clientWidth) return;
  const scale = Math.min(1, stage.clientWidth / width);
  frame.style.width = width + 'px';
  frame.style.height = Math.ceil(stage.clientHeight / scale) + 'px';
  frame.style.transform = 'scale(' + scale + ')';
  frame.style.left = Math.max(0, (stage.clientWidth - width * scale) / 2) + 'px';
}

function revealSection(pane) {
  if (controls.surface.value !== 'site') return;
  const frame = pane.querySelector('iframe');
  let doc;
  try { doc = frame.contentDocument; } catch { return; }
  if (!doc?.body) return;
  const section = controls.section.value;
  if (!section) {
    doc.defaultView.scrollTo({top:0, behavior:'instant'});
    return;
  }
  function scrollToSection() {
    const node = doc.getElementById(section);
    if (!node) return false;
    const header = doc.querySelector('header.fixed');
    const top = node.getBoundingClientRect().top + doc.defaultView.scrollY - (header?.offsetHeight || 0);
    doc.defaultView.scrollTo({top, behavior:'instant'});
    return true;
  }
  if (!scrollToSection()) {
    const observer = new MutationObserver(() => { if (scrollToSection()) observer.disconnect(); });
    observer.observe(doc.body, {childList:true, subtree:true});
    setTimeout(() => observer.disconnect(), 8000);
  }
}

function update(key = '') {
  const fields = new URLSearchParams();
  for (const [name, control] of Object.entries(controls)) fields.set(name, control.value);
  history.replaceState(null, '', '?' + fields.toString());
  for (const label of document.querySelectorAll('.site-only')) label.hidden = controls.surface.value !== 'site';
  for (const pane of panes) {
    const url = target(pane.dataset.side);
    pane.querySelector('a').href = url.href;
    if (key === 'section') revealSection(pane);
    else if (key !== 'device') pane.querySelector('iframe').src = url.href;
    fit(pane);
  }
}

for (const pane of panes) {
  new ResizeObserver(() => fit(pane)).observe(pane.querySelector('.stage'));
  pane.querySelector('iframe').addEventListener('load', () => revealSection(pane));
}
for (const [key, control] of Object.entries(controls)) control.addEventListener('change', () => update(key));
for (const button of document.querySelectorAll('.mobile-switch button')) {
  button.addEventListener('click', () => {
    document.querySelector('.panels').dataset.visible = button.dataset.side;
    for (const option of document.querySelectorAll('.mobile-switch button')) {
      option.setAttribute('aria-pressed', String(option === button));
    }
  });
}
update();
