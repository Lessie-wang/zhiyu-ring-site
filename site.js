let ring;
let momentRing;
const fallback = document.getElementById('ringFallback');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
import('./ring3d.js?v=polished-20261030').then(({ mountRing }) => {
  ring = mountRing(document.getElementById('ringCanvas'), {
    sampleAppearance:true, productStudio:true, finish:'silver', ledLit:false,
    shape:{TH:2.45,HW:4.0,EDGE:0.52,DOME:0.16,GR_D:0,GR_H:0,CORNER:1.5}
  });
  ring.setFinish('silver');
  ring.exposure(1.5);
  ring.pose(-0.23, 0.48, Math.PI);
  const momentCanvas = document.getElementById('momentRingCanvas');
  if (momentCanvas) {
    try {
      momentRing = mountRing(momentCanvas, {
        sampleAppearance:true, productStudio:true, finish:'silver', ledLit:false,
        shape:{TH:2.45,HW:4.0,EDGE:0.52,DOME:0.16,GR_D:0,GR_H:0,CORNER:1.5}
      });
      momentRing.setFinish('silver');
      momentRing.exposure(1.5);
      momentRing.pose(-0.28, -0.65, 0.22);
      momentCanvas.parentElement.classList.add('moment-ring-ready');
    } catch { momentCanvas.hidden = true; }
  }
  fallback.hidden = true;
  document.querySelectorAll('[data-finish]').forEach(button => {
    button.addEventListener('click', () => {
      ring.setFinish(button.dataset.finish);
      momentRing?.setFinish(button.dataset.finish);
      document.querySelectorAll('[data-finish]').forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
    });
  });
  document.getElementById('inside').addEventListener('click', () => ring.showInside());
}).catch(() => {
  fallback.textContent = '此浏览器暂未显示 3D 模型，产品资料仍可继续阅读。';
  document.querySelectorAll('[data-finish], #inside').forEach(button => button.disabled = true);
});
const touchButton = document.getElementById('touchDemo');
const touchCard = document.querySelector('.touch-card');
let pulseTimeout;
touchButton.addEventListener('click', () => {
  touchCard.classList.remove('is-pulsing');
  void touchCard.offsetWidth;
  touchCard.classList.add('is-pulsing');
  if (!reducedMotion) { ring?.pulse(); momentRing?.pulse(); }
  let vibrated = false;
  try { vibrated = Boolean(navigator.vibrate?.([40, 80, 40])); } catch {}
  document.getElementById('touchStatus').textContent = vibrated
    ? '已发送手机触觉演示 · 戒指实际触感以真机体验为准'
    : '正在显示视觉演示 · 该浏览器未发送手机震动';
  clearTimeout(pulseTimeout);
  pulseTimeout = setTimeout(() => touchCard.classList.remove('is-pulsing'), 2100);
});
