let ring;
const fallback = document.getElementById('ringFallback');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
import('./ring3d.js?v=sample-20261030b').then(({ mountRing }) => {
  ring = mountRing(document.getElementById('ringCanvas'), {
    sampleAppearance:true, finish:'silver', ledLit:false, envKey:0.42, envBoost:1.2,
    shape:{TH:2.45,HW:4.0,EDGE:0.38,DOME:0.025,GR_D:0,GR_H:0,CORNER:1.3}
  });
  ring.setFinish('silver');
  ring.exposure(1.25);
  ring.pose(-0.35, 0.60, Math.PI);
  fallback.hidden = true;
  document.querySelectorAll('[data-finish]').forEach(button => {
    button.addEventListener('click', () => {
      ring.setFinish(button.dataset.finish);
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
  if (!reducedMotion) ring?.pulse();
  let vibrated = false;
  try { vibrated = Boolean(navigator.vibrate?.([40, 80, 40])); } catch {}
  document.getElementById('touchStatus').textContent = vibrated
    ? '已发送手机触觉演示 · 戒指实际触感以真机体验为准'
    : '正在显示视觉演示 · 该浏览器未发送手机震动';
  clearTimeout(pulseTimeout);
  pulseTimeout = setTimeout(() => touchCard.classList.remove('is-pulsing'), 2100);
});
