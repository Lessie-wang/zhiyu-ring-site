/* ============================================================
   知愈 Ring · 可交互 3D 概念模型  v2
   —— 全程程序化生成，不依赖任何外部模型文件

   造型对标 Oura Ring 5（2026-06 发布，宽 6.09 / 厚 2.28mm，比 Ring 4 小 40%）：
     · 全钛一体，内外同材质，无树脂内衬
     · 极窄极薄，圆角半径接近半宽 —— 侧面几乎是个半圆，所以像首饰不像设备
     · 内壁完全平整，传感器齐平嵌入（Ring 3 的凸起是它最被诟病的一点）
   知愈的两处不同：
     · 厚 2.9mm，比 Ring 5 多 0.6mm —— 那 0.6mm 是一颗马达
     · 外壁正中一道贯穿周身的极细凹槽（唯一的记忆点）
   ============================================================ */
import * as THREE from 'three';

const RI = 9.2;               // 内半径（内径 18.4mm，约 18 号圈）
const TH_D = 2.9;             // 径向厚度默认值（含震动马达；Ring 5 是 2.28）
const RO = RI + TH_D;         // 默认外半径（sensorArray/contactShadow 等按默认值取，不随 shape 变）
const HW = 3.4;               // 半宽（整体 6.8mm 宽；Ring 5 是 6.09，Ring 4 是 7.9）

const EDGE_D = 1.05;          // 外缘大圆角 —— 逼近半宽，侧面近似半圆，这是 Ring 5 的观感来源
const IN_R   = 0.30;          // 内缘小圆角（不硌手）
const DOME_D = 0.10;          // 外穹面隆起（窄环上要更收敛）
const GR_D_D = 0.17;          // 凹槽深度
const GR_H_D = 0.38;          // 凹槽半高

export const FINISHES = {
  black:  { name:'曜黑', color:0x1A1B1E, metalness:0.86, roughness:0.36, clearcoat:0.30, env:1.35 },
  silver: { name:'钛银', color:0xB9BEC5, metalness:1.00, roughness:0.29, clearcoat:0.00, env:1.55 },
  /* 🔴 2026-09-03（D43）新增：SY15 实物的「黑色猫眼」表面。
     依据 `04_硬件/黑色猫眼实拍视频.mp4` 抽帧（/tmp/ring_ref/z04·z16）。
     ⚠️ 猫眼 ≠ 哑光（我第一次判读成哑光，用户纠正）：
        猫眼是**沿周向的同心细密拉丝**，光打上去会形成一条**弥散的宽高光带**，
        而不是镜面那种锐利高光线，也不是哑光那种「没有高光」。
        所以 roughness 取中间档（0.42），不能像哑光那样推到 0.6+ —— 推高就没有光带了。
     颜色比曜黑亮一档（实拍是深灰不是纯黑）。
     🔴 clearcoat 必须是 0：清漆层是一层**光滑**反射，会盖在 roughnessMap 之上，
        把辛苦做出来的猫眼细纹整片抹平（第一版给了 0.10，渲出来就是光滑黑面）。*/
  catseye:{ name:'黑色猫眼', color:0x2E3033, metalness:0.82, roughness:0.42, clearcoat:0.00, env:1.30, catseye:true },
  /* 🔴 2026-09-22 新增：金色（用户看中 ab_silver_v3 / ab_catseye_v2 的造型，要金色版）。
     ⚠️ 没有实物参考，参数是「金色贵金属」的合理起点，不是定稿真值：
        - 颜色 0xC8A05A（18K 金的典型 sRGB 基色，比纯金 0xFFD700 收敛得多——
          3D 渲染里纯金黄得发绿，必须压饱和）；
        - metalness 1.0 同钛银（纯金属反射路径，金色全靠 tint 出来）；
        - roughness 0.32 介于钛银 0.29 与猫眼 0.42 之间——金色表面有细纹会更好看
          （拉丝金首饰的质感来源），但太粗会像黄铜水暖件；
        - clearcoat 0：清漆会把 roughnessMap 细纹抹平（catseye 同款教训）；
        - env 1.55 同钛银——金色靠环境反射发亮，环境贴图强度低会像刷了漆的塑料。 */
  gold:   { name:'鎏金', color:0xC8A05A, metalness:1.00, roughness:0.32, clearcoat:0.00, env:1.55 }
};

/* ============================================================
   截面轮廓：内壁平直 → 顶面 → 外穹面（含凹槽）→ 底面
   ============================================================ */
/* shape：可选覆盖 { EDGE, DOME, GR_D, GR_H }。不传 = 上面那组默认值，
   落地页与爆炸图完全不受影响。
   🔴 2026-08-14 加这个口子的原因（用户对着 Oura 海报：「人家这个咋这么精致」）：
      Oura 的"精致"来自 **一条平整的镜面外壁 + 两条锐利的倒角高光线**。
      我们 EDGE=1.05 逼近半宽 3.4 → 侧面近似半圆 → 没有平面能拉出长高光，
      只有一片渐变的圆弧反射，读作【甜甜圈/轮胎】而不是精密零件。
      再叠一道深 0.17 的贯穿凹槽，直接变成"胎面"。
      → 宣传主图专用 shape：收 EDGE 留出平面、压浅凹槽到细发丝线。
      ⚠️ 凹槽是品牌记忆点，这里只减浅不删除（GR_D 0.17→0.06），需用户拍板是否长期采用。 */
/* 🔴 shape.TH（径向厚度）也可覆盖 —— 用户 2026-08-14：「戒指内环的半径再短一点呢」。
   ⚠️ **不能去动 RI**：RI=9.2 就是圈号（内径 18.4mm ≈ 18 号），改小＝主图上画一枚戴不进去的
      戒指，还会和爆炸图 `profile.py`（同一套造型真值）打架。
      要让"孔看起来小一点"，正确的做法是**内径不动、把厚度加上去**（环变粗，孔的占比就小）。
      代价是这是一条**硬件规格**：2.9mm 里有 0.6mm 是马达，加厚要进决策日志，不是画图参数。 */
function bandProfile(shape){
  shape = shape || {};
  const TH = shape.TH !== undefined ? shape.TH : TH_D;
  const RO = RI + TH;
  const EDGE = shape.EDGE !== undefined ? shape.EDGE : EDGE_D;
  const DOME = shape.DOME !== undefined ? shape.DOME : DOME_D;
  const GR_D = shape.GR_D !== undefined ? shape.GR_D : GR_D_D;
  const GR_H = shape.GR_H !== undefined ? shape.GR_H : GR_H_D;
  /* 🔴 2026-09-03（D43）新增 shape.HW —— 半宽也可覆盖。
     原因：现成戒指 SY15 实物比自研目标宽得多（实拍目测约 8mm，自研目标是 6.8mm）。
     宽度是"这枚戒指长什么样"的第一决定项，写死在模块常量里就没法画实物。
     ⚠️ 与 RI 的区别：RI 是圈号（改小＝画一枚戴不进去的戒指，仍然禁止改）；
        HW 是外观尺寸，按实物覆盖是正确的。默认值不变，落地页/爆炸图不受影响。 */
  const HWv  = shape.HW  !== undefined ? shape.HW  : HW;
  /* 🔴 2026-09-03（D43 第二轮）新增 shape.CORNER —— 肩部是【圆弧】还是【刻面倒角】。
     起因：厂商官方高清渲染图（04_硬件 规格书内嵌，2556×3499）显示 SY15 实物是
     **平的拉丝主体 + 两侧抛光倒角刻面**，那两条锐利亮线正是"精致感"的全部来源。
     我此前照实拍视频判成"圆润穹面"是错的 —— 倒角刻面在 720p 烂光线下糊成了柔和渐变。
     用圆弧建出来必然丢掉那两条线，这是之前 3D「好丑」的真正原因之一。

     实现用**超椭圆**（superellipse）而不是新写一段直线：
       (x/r)^N + (y/r)^N = 1，参数化 x = r·|cos a|^(2/N)·sign, y = r·|sin a|^(2/N)·sign
       · N = 2   → 指数 1   → 正圆弧（**默认值，与改动前逐点等价**，落地页/爆炸图零影响）
       · N = 1   → 指数 2   → 完全的直线刻面（x/r + y/r = 1）
       · N ≈ 1.3 → 指数 ≈1.54 → 刻面 + 两端微微收圆（真实倒角就是这样，纯直角会渲成一条死黑线）
     一个参数连续覆盖"圆弧↔刻面"，不用维护两套代码路径。*/
  const CORNER = shape.CORNER !== undefined ? shape.CORNER : 2;
  const CE = 2 / CORNER;                                  // 超椭圆指数
  const p = [];
  const V = (x,y) => p.push(new THREE.Vector2(x,y));
  const sp = (v,e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  /* arc：exp=1 时就是普通圆弧；exp>1 时向刻面过渡。
     ⚠️ 段数 n 在刻面模式下**不能减**：亮线的连续性靠采样密度，段数少了倒角会出现台阶。 */
  const arc = (cx,cy,r,a0,a1,n=10,exp=1) => {
    for(let i=1;i<=n;i++){
      const a = a0 + (a1-a0)*i/n;
      V(cx + r*sp(Math.cos(a),exp), cy + r*sp(Math.sin(a),exp));
    }
  };
  const H2 = HWv - EDGE;                                // 外穹面的有效半高
  const dome = y => RO + DOME * (1 - (y/H2)*(y/H2));    // 缓穹面

  // ① 内壁（自下而上，平直）
  V(RI, -(HWv - IN_R));
  V(RI,  (HWv - IN_R));
  // ② 内→顶 小圆角
  arc(RI + IN_R, HWv - IN_R, IN_R, Math.PI, Math.PI/2, 6);
  // ③ 顶面
  V(RO - EDGE, HWv);
  // ④ 顶→外 肩部（CORNER=2 圆弧 / <2 刻面倒角）。段数给足，边缘高光才连续
  arc(RO - EDGE, HWv - EDGE, EDGE, Math.PI/2, 0, 16, CE);
  /* ⑤⑥⑦ 外穹面（含凹槽）
     🔴 2026-09-03（D43）加 GR_D>0 判断：SY15 实物**没有中央凹槽**，出图要传 GR_D:0。
        原来的写法在 GR_D=0/GR_H=0 时会往截面里塞 4 个**互相重合的点**
        （gTop-0 === gTop，且 y=GR_H*0.92=0），LatheGeometry 据此生成零面积退化三角，
        法线算出来是 NaN → 环体上出现一圈黑带。所以必须整块跳过，不能靠传 0 "自然退化"。*/
  if (GR_D > 0 && GR_H > 0) {
    // 外穹面：H2 → 凹槽上沿
    for(let y = H2; y > GR_H; y -= 0.12) V(dome(y), y);
    // 凹槽（U 形，不是尖角 —— 尖角在渲染里会变成一条死黑线）
    const gTop = dome(GR_H);
    V(gTop - GR_D*0.35,  GR_H*0.92);
    V(gTop - GR_D,       GR_H*0.55);
    V(gTop - GR_D,      -GR_H*0.55);
    V(gTop - GR_D*0.35, -GR_H*0.92);
    // 外穹面：凹槽下沿 → -H2
    for(let y = -GR_H; y > -H2; y -= 0.12) V(dome(y), y);
  } else {
    // 无凹槽：一条连续穹面从 H2 走到 -H2
    for(let y = H2; y > -H2; y -= 0.12) V(dome(y), y);
  }
  V(dome(-H2), -H2);
  // ⑧ 外→底 肩部（与 ④ 必须同一 CE，否则上下不对称）
  arc(RO - EDGE, -(HWv - EDGE), EDGE, 0, -Math.PI/2, 16, CE);
  // ⑨ 底面
  V(RI + IN_R, -HWv);
  // ⑩ 底→内 小圆角
  arc(RI + IN_R, -(HWv - IN_R), IN_R, -Math.PI/2, -Math.PI, 6);
  /* 🔴🔴 2026-08-14 修真 bug（用户：「离我近的外环应该展示外环，但我只看见了里面，感觉透视了」）。
     上面这个闭合截面是**顺时针**走的（内壁向上 → 顶 → 外壁向下 → 底 → 回内壁），
     `LatheGeometry` 按这个绕向生成的三角面**法线全部朝内**：
       · 材质是默认 FrontSide → 近侧环体整片被背面剔除 → 直接看穿到对侧内壁
       · 即便不剔除，法线反了金属的受光/反射也全算错
     正视时这个洞正好被自己挡住，所以一直没被发现；斜到 x-0.95 立刻暴露。
     `reverse()` 把绕向翻成逆时针 = 法线朝外。
     ⚠️ 别用 `side:DoubleSide` 糊过去 —— 那只是把破洞补上，法线依旧是反的（诊断页 B/D 就是这个）。
     ⚠️ 爆炸图 `profile.py` 是同一套截面的移植，如果那边也用了 solidify/lathe，需一并检查绕向。 */
  p.reverse();
  return p;
}

/* ============================================================
   内侧传感器：齐平嵌入，不做凸起（Oura 4 的关键改良）
   ============================================================ */
/* lit=false → 传感器【不点亮】，只作元器件展示。
   🔴 2026-08-14 加这个开关的原因（对着 Oura 海报做对比后得出）：
      戒指戴上后内壁被手指完全堵住，那几颗 PPG 灯**永远看不见**。
      在静态宣传主图上把它们画成三颗发亮的彩灯，是一个佩戴时不存在的视觉效果 ——
      属于画面误导。Oura 的海报同样露出内侧传感器，但**一律不点亮**，
      它只是做透视展示元器件，不假装佩戴时能看见。
      我们整套对外物料的立身之本是"诚实"（D15 为此删掉过一整屏假 demo），
      所以**宣传主图一律 lit=false**。
   落地页保持 lit=true：那是交互演示，点亮表示"正在测量"，语义成立且用户在操作它。
   不点亮时用"熄灭的镜片"外观：近黑 + 保留极淡的波长色偏 + 高光泽清漆 ——
   现实里熄灭的 LED 晶粒确实是深色的，微透出一点本色。 */
function sensorArray(lit = true){
  const grp = new THREE.Group();
  const R = RI - 0.012;                        // 贴着内壁，微微靠近圆心以免 z-fighting

  // 深色底衬：一条沿内壁弯曲的窄带
  const strip = new THREE.Mesh(
    new THREE.CylinderGeometry(RI - 0.006, RI - 0.006, 2.4, 96, 1, true, -0.62, 1.24),
    new THREE.MeshPhysicalMaterial({
      color:0x171A1C, metalness:0.34, roughness:0.42, side:THREE.BackSide
    })
  );
  grp.add(strip);

  /** 在内壁角度 a 处放一个齐平的圆窗 */
  /** 把 hex 按比例压暗 —— 熄灭的 LED 镜片只微微透出本色 */
  const dim = (hex, k) => {
    const r = ((hex>>16)&255)*k, g = ((hex>>8)&255)*k, b = (hex&255)*k;
    return (Math.round(r)<<16) | (Math.round(g)<<8) | Math.round(b);
  };

  const window_ = (a, r, hex, emi, metal) => {
    let mat;
    if (metal) {
      mat = new THREE.MeshPhysicalMaterial({ color:hex, metalness:1, roughness:0.20 });
    } else if (lit) {
      mat = new THREE.MeshPhysicalMaterial({
        color:hex, emissive:hex, emissiveIntensity:emi,
        metalness:0.0, roughness:0.05, clearcoat:1, clearcoatRoughness:0.03
      });
    } else {
      // 熄灭的镜片：深色玻璃，留 32% 的本色色偏 + 强清漆高光。
      // ⚠️ 别压太黑（试过 0.18）：整条模组糊成一根黑棒，三颗镜片分不出来，
      //    "智能戒指"的视觉证据就没了。32% 是"看得出是三颗不同的元件
      //    但明显没在发光"的窗口。
      mat = new THREE.MeshPhysicalMaterial({
        color:dim(hex, 0.32), metalness:0.0, roughness:0.06,
        clearcoat:1, clearcoatRoughness:0.02
      });
    }
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 28), mat);
    m.position.set(R*Math.sin(a), 0, R*Math.cos(a));
    m.lookAt(0,0,0);                            // 朝向圆心
    grp.add(m);
    if(!metal && lit){
      const halo = new THREE.PointLight(hex, emi*0.35, 5);
      halo.position.set((R-1.1)*Math.sin(a), 0, (R-1.1)*Math.cos(a));
      grp.add(halo);
    }
  };

  // 非对称排布 —— Oura 4 也是非对称的，这样戒指转动不影响读数
  // 色值 2026-08-14 校正：原来的 2FE39B / E0483C 是薄荷青和朱橙，
  // 不是 525nm 绿光和 660nm 深红。⚠️ 近红外 880–940nm **人眼看不见**，
  // 这里的紫是【示意色】（业界插画惯例），文案里绝不能写成"紫光"。
  // 与 `爆炸图/build_explode.py` 的 M["led_*"] 保持同一组色值。
  window_(-0.28, 0.46, 0x1FC94E, 0.55, false);   // 绿光 PPG 525nm
  window_(-0.05, 0.50, 0xE01020, 0.30, false);   // 红光 660nm
  window_( 0.19, 0.50, 0x5B44C8, 0.14, false);   // 近红外 880–940nm（示意色）
  window_( 0.44, 0.32, 0xD9B36A, 0,    true);    // 金色触点
  window_(-0.51, 0.32, 0xD9B36A, 0,    true);

  grp.rotation.z = Math.PI;                      // 转到戒指下方，戴上时贴指腹
  return grp;
}

/* ============================================================
   内壁钛银内衬（宣传主图用，opts.innerLiner）
   ------------------------------------------------------------
   🔴 为什么加：曜黑版的内壁也是黑的，指孔里整片死黑 —— 传感器和马达
      全部沉进背景，画面里没有任何"这是智能硬件"的证据（黑版缩图实测）。
      Oura 海报之所以能一眼看见元器件，靠的正是【高亮黑外壁 ↔ 浅色内壁】
      这一层明度反差。这不是修图：Ring 3/4 的内壁本来就是另一种材质/涂层。
   半径取 RI+0.01：微微嵌进环体（厚 2.9，可忽略），既不与内壁 z-fight，
   又保证比传感器带（RI-0.006）更靠外 —— 深度测试自然让元器件盖在它上面。
   ============================================================ */
function innerLiner(){
  return new THREE.Mesh(
    new THREE.CylinderGeometry(RI + 0.01, RI + 0.01, HW * 1.82, 128, 1, true),
    /* ⚠️ 亮度是这里唯一的雷：第一版给 0x9FA6AE / roughness 0.46，
       大图很漂亮，但 220px 缩图里整个内孔被提成一片均匀亮银 →
       戒指读作【相机镜头 / 瓶盖】，剪影彻底废掉。
       内衬的任务只是"把元器件从死黑里衬出来"，不是自己变成主角：
       压到 0x5A6068 + roughness 0.58，只在受光那半圈提亮，缩图里仍是环。 */
    /* 🔴 2026-08-14 十一轮再提亮（用户：「现在内环太黑了」）。
       0x5A6068/0.58 是为了防止"内孔一片亮银 → 读作相机镜头"而压下去的，
       但那是**近正视**姿态下的风险；斜置到 x-0.95 后指孔投影已经很窄，
       不再有变圆盘的危险，可以把内衬还原到该有的钛银亮度。
       0x8A9098 + roughness 0.50 + envInt 1.35：亮到能衬出元器件，又不抢外壁的镜面。 */
    new THREE.MeshPhysicalMaterial({
      color: 0x8A9098, metalness: 1.0, roughness: 0.50,
      side: THREE.BackSide, envMapIntensity: 1.35
    })
  );
}

/* ============================================================
   线性马达（LRA）本体（宣传主图用，opts.showMotor）
   ------------------------------------------------------------
   为什么值得单独画：厚 2.9mm 里那多出来的 0.6mm 就是这颗马达，
   它是我们区别于 Oura/所有睡眠环的**唯一硬件差异**（对方只采集不回馈），
   而之前主图上它完全不可见 —— 用户：「咱们这个图片也没有突出马达」。
   造型按真实 LRA：一枚径向安装的金属圆片 + 侧面一圈铜线圈，
   放在传感器带的对侧圆周（戴上时朝手背方向），与 PPG 分开读。
   ⚠️ 不加任何发光/波纹特效 —— 震动是触觉，画成光就是佩戴时不存在的效果（同 ledLit=false 的理由）。
   ============================================================ */
/* 🔴 2026-08-14 十二轮改成**沉孔**（用户：「戒指内环的按钮再做出凹陷的立体感」）。
   原来马达是齐平贴在内壁上的一枚平圆片 → 读作贴纸/印刷图案，没有厚度。
   真实零件的"凹陷感"不是靠明暗涂出来的，是靠**三个几何要素**：
     ① 孔口倒角（chamfer）：一圈朝外的窄斜面，受光后是一条亮边 —— 这是"孔"最强的信号
     ② 井壁（bore wall）：从孔口往里退的一小段圆筒，背光那半圈是暗的，明暗分界给出深度
     ③ 井底（seat）：零件本体退到井底，比孔口暗一档
   🔴🔴 但**真的往里挖行不通，试过两轮都失败**，原因是 `innerLiner()`：
      内衬是一整圈半径 RI+0.01 的不透明圆筒，而"往里凹"= 半径变大 = 沉孔整个落在**内衬背后**，
      被它挡得只从边缘漏出一条弧（第一轮渲出来就是这样，第二轮以为是太暗、白提亮了一遍材质）。
      要真挖就得在内衬上开洞，而 `CylinderGeometry` 只能用 thetaLength 开**整条竖缝**，
      在 6.8mm 宽的内壁上豁一条缝比不挖更丑。
   ✅ 最终做法：不挖，改在内衬**表面之前**（半径更小＝更靠镜头）叠三层环，
      直接复刻沉孔在照片里的受光结构 —— 亮倒角环 / 暗井环 / 井底盘。
      这不是"作弊"：真实沉孔在产品图上呈现的就是这三条同心亮暗带。
   ⚠️ 另一个坑：金属（metalness≈1）在凹腔里只能反射腔体自己 → **越凹越黑，怎么提亮都没用**。
      所以这几层一律降 metalness 到 0.3~0.45，让固有色（albedo）说话，不靠环境反射。 */
function motorUnit(){
  const grp = new THREE.Group();
  const a = 0.06;                                   // 圆周角度（与传感器带 -0.62~0.62 分离，见下 rotation.z）
  const R = RI - 0.02;                              // ⚠️ 比内衬(RI+0.01)更靠圆心，才不会被它遮住

  const place = (m, lift) => {
    const r = R - (lift || 0);                      // lift>0 = 更靠镜头（叠在上层）
    m.position.set(r * Math.sin(a), 0, r * Math.cos(a));
    m.lookAt(0, 0, 0);
    grp.add(m);
  };

  // ① 亮倒角环：沉孔孔口那圈受光的斜面。整组里最亮，凹陷感主要靠它
  place(new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.085, 10, 48),
    new THREE.MeshPhysicalMaterial({ color:0xF4F7FA, metalness:0.30, roughness:0.24 })
  ), 0.030);
  // ② 暗井环：紧贴倒角内侧的一圈阴影 —— 亮环 + 暗环相邻是"这里是个坑"的核心信号
  place(new THREE.Mesh(
    new THREE.TorusGeometry(0.99, 0.075, 10, 48),
    new THREE.MeshPhysicalMaterial({ color:0x23272C, metalness:0.35, roughness:0.55 })
  ), 0.018);
  // ③ 井底盘：退在最下层、亮度居中（比倒角暗、比井环亮）
  place(new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 40),
    new THREE.MeshPhysicalMaterial({ color:0xB4BBC2, metalness:0.40, roughness:0.34 })
  ), 0.004);
  // ④ 铜线圈环 —— 一眼认出"这是个马达"，不是第四颗传感器
  place(new THREE.Mesh(
    new THREE.TorusGeometry(0.60, 0.11, 10, 40),
    new THREE.MeshPhysicalMaterial({ color:0xD98F42, metalness:0.45, roughness:0.34 })
  ), 0.012);
  // ⑤ 中心配重轴：最暗，给井底再压一层深度
  place(new THREE.Mesh(
    new THREE.CircleGeometry(0.30, 24),
    new THREE.MeshPhysicalMaterial({ color:0x4A5057, metalness:0.40, roughness:0.44 })
  ), 0.016);
  return grp;
}

/* ============================================================
   内舱电子件（opts.innerElectronics · 2026-09-22 新增，默认关）
   ------------------------------------------------------------
   依据：厂商官方剖切图（../产品图/ring_black.png）内舱的逐件目检——
   炭黑弧形载板（官方就是黑舱，不是绿 PCB）+ 散布的**金色贴片**（电子感最强信号）
   + 中央一枚**银色同心圆盘**（马达/扣电，官方图对比度最高的锚点件）
   + 大方形主芯片（哑光炭灰）。
   起因：用户「内圈要真实图示的那些电子元器件的抠图+渲染，现在的比较假像外壳」；
   sensorArray 三颗熄灭小窗 + motorUnit 沉孔贴片在海报小尺寸下读作贴纸（五稿诊断）。
   ⚠️ 与 sensorArray 同一坐标系（轴=Y、贴内壁、lookAt 圆心）；挂载方设 rotation.z
      （sensorArray 用 π＝剖切面朝镜头那一侧）。只给「看得见内壁」的姿态用。
   ============================================================ */
function innerElectronics(){
  const grp = new THREE.Group();
  const R_BAND = RI - 0.010;                 // 弧形载板半径（贴内壁，同 sensorArray strip 层）
  const R_PART = RI - 0.075;                 // 元件半径：比载板靠圆心一档，深度测试自然分层

  /* 元件坐标全部带 VIS_BIAS：整舱往镜头可见侧偏。
     🔴🔴 数值是算出来的，不是试出来的（2026-09-22，临时脚本 vis_calc 系列）：
     ① pose(0,1.19,3.60) 下对环体（torus 近似）做相机→元件的射线遮挡测试，
        全部元件同时可见的 bias 区间是 **3.40..4.60**（取中 4.0）；
     ② 🔴 不能用 elec.rotation.z 做圆周定位——绕 z 轴会把圆周坐标和轴向 y 混在一起
        （sensorArray 敢用 rotation.z=π 是因为它全部元件在 y=0；本舱元件 y∈[-0.55,0.42]，
        被 0.92π 一转全部飞离内壁——这就是八稿两轮"银盘/镀区认不出"的真凶，
        元件其实被搅到了错误位置）。mountRing 里 elec 挂载不带任何旋转；
        载板圆筒例外——绕自身 Y 轴转是干净的圆周移位，见下方 band.rotation.y。 */
  const VIS_BIAS = 4.0;

  // ① 炭黑弧形载板（BackSide：从圆心方向看内表面）
  //    🔴 band.rotation.y = VIS_BIAS：载板必须跟着元件偏——圆筒绕自身 Y 轴转是
  //    干净的圆周移位（不搅 y），theta 参数是静态的、不写它就跟不上元件弧段
  //    （八稿四版诊断"金贴片贴在裸金属上、没有黑板衬底"的根因）。
  //    黑板衬底同时解决"金贴片融进金壳"——金点落在黑板上，三色壳全部成立。
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(R_BAND, R_BAND, 2.9, 96, 1, true, -1.55, 3.1),
    new THREE.MeshPhysicalMaterial({ color:0x1B1E22, metalness:0.25, roughness:0.55, side:THREE.BackSide })
  );
  band.rotation.y = VIS_BIAS;
  grp.add(band);

  /** 在载板上放一个元件：a=圆周角，y=沿轴高度，几何体以 +z 面朝圆心 */
  const put = (m, a, y) => {
    m.position.set(R_PART * Math.sin(a), y, R_PART * Math.cos(a));
    m.lookAt(0, 0, 0);
    grp.add(m);
  };
  const mat = (c, me, ro) => new THREE.MeshPhysicalMaterial({ color:c, metalness:me, roughness:ro });

  // ② 中央银色同心圆盘（马达/扣电，官方图最醒目件）：亮银盘 + 暗环 + 亮芯
  put(new THREE.Mesh(new THREE.CircleGeometry(1.02, 48), mat(0xC9CED4, 1.0, 0.18)), VIS_BIAS + 0.05, 0);
  put(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 10, 40), mat(0x23272C, 0.35, 0.55)), VIS_BIAS + 0.05, 0);
  put(new THREE.Mesh(new THREE.CircleGeometry(0.30, 28), mat(0xE4E8EC, 1.0, 0.15)), VIS_BIAS + 0.05, 0);

  // ③ 大方形主芯片（哑光炭灰，无丝印）。四版诊断"体量不足读不出主芯片"：
  // 1.05→1.55（占孔口高度的 1/4，与官方图比例一致）
  put(new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.55, 0.12), mat(0x2A2F35, 0.30, 0.50)), VIS_BIAS + 0.95, 0.15);

  // ④ 金色镀区（传感器窗/焊区，官方图顶部那块大金渐变）+ 伴生小金片
  put(new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.85, 0.07), mat(0xD9B36A, 1.0, 0.25)), VIS_BIAS - 1.00, 0.10);
  put(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.30, 0.06), mat(0xE3BE76, 1.0, 0.30)), VIS_BIAS - 0.55, 0.42);
  put(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.30, 0.06), mat(0xE3BE76, 1.0, 0.30)), VIS_BIAS - 1.30, -0.35);

  // ⑤ 散布金贴片（数量即密度信号，位置沿弧伪随机、大小两级）。
  //    四版诊断"太稀疏像溅上去的脏点"：6→10 颗，且大颗加一档
  const chips = [
    [-0.62, -0.30, 0.34], [-0.25, 0.55, 0.26], [0.38, -0.50, 0.30],
    [0.58,  0.30, 0.26], [0.78, -0.42, 0.34], [1.18,  0.40, 0.28],
    [-0.90,  0.25, 0.24], [0.10, -0.60, 0.22], [1.32, -0.30, 0.24],
    [-0.40, -0.55, 0.26],
  ];
  for (const [a, y, s] of chips) {
    put(new THREE.Mesh(new THREE.BoxGeometry(s, s*0.72, 0.05), mat(0xE3BE76, 1.0, 0.30)), VIS_BIAS + a, y);
  }

  // ⑥ 银色屏蔽条（官方图芯片下方那道横梁）。四版诊断"不可见"：加宽加高
  put(new THREE.Mesh(new THREE.BoxGeometry(2.20, 0.24, 0.06), mat(0xB9BEC5, 0.9, 0.30)), VIS_BIAS + 1.22, -0.55);

  return grp;
}


/* ---------- 环境贴图：柔和影棚（程序生成，不联网） ----------
   boost：影棚亮度。金属（metalness≈1）几乎只反射环境，
   落地页那种暗调用 1；出主图/海报要看清形体时拉到 2~3。 */
function studioEnv(renderer, boost, key){
  boost = boost || 1;
  /* key（0~1）：影棚基调。0 = 原来的暗影棚（落地页深色底用）。
     ⚠️ 只抬 boost 是抬不出浅底产品图的——boost 是等比放大，
        暗影棚 ×N 仍然是「暗场 + 几处过曝高光」，金属照样反射成一枚黑环。
        高调白棚必须把【底色本身】推向白，让金属整体反射出银灰。
        这就是 setFinish('silver') 却渲染出黑戒指的真正原因。 */
  key = key || 0;
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  // 底色也跟着抬，否则只有高光亮、暗部依旧死黑
  const lift = v => {
    let n = v * (1 + (boost - 1) * 0.55);
    n = n + (238 - n) * key;                 // key→1 时逼近白色柔光棚
    return Math.min(255, Math.round(n));
  };
  const gray = v => `rgb(${lift(v)},${lift(v)},${lift(v + 2)})`;
  const g = x.createLinearGradient(0,0,0,512);
  g.addColorStop(0.00, gray(52));
  g.addColorStop(0.40, gray(17));
  g.addColorStop(0.54, gray(9));
  g.addColorStop(1.00, gray(27));
  x.fillStyle = g; x.fillRect(0,0,1024,512);

  const soft = (cx,cy,rx,ry,a)=>{
    a = Math.min(1, a * boost);
    x.save(); x.translate(cx,cy); x.scale(1, ry/rx);
    const rg = x.createRadialGradient(0,0,0,0,0,rx);
    rg.addColorStop(0,`rgba(255,251,244,${a})`);
    rg.addColorStop(0.55,`rgba(255,251,244,${a*0.28})`);
    rg.addColorStop(1,'rgba(255,251,244,0)');
    x.fillStyle = rg; x.fillRect(-rx,-rx,rx*2,rx*2); x.restore();
  };
  soft(250, 110, 300, 150, 1.00);   // 主柔光箱
  soft(760, 190, 190,  90, 0.50);   // 副光
  soft(560, 430, 340, 120, 0.16);   // 地面反弹
  // 一条细长条光 —— 金属边缘那道拉长的高光就是它给的
  x.fillStyle = `rgba(255,250,240,${Math.min(1, .55 * boost)})`;
  x.fillRect(0, 60, 1024, Math.round(4 * Math.min(2.5, boost)));

  /* 🔴 2026-08-14 十一轮加的"科技感"三件套（用户：「戒指的光影不好看，有点愣，要更有科技感」）。
     金属的高级感 = **反射里有清晰的形状**。原来棚里只有柔光箱（模糊圆斑）+ 一条顶部长条，
     反射出来全是糊的渐变，所以"愣"。补三样：
       ① 第二条低位长条 → 在环体下缘再切一道亮线，环的上下都有"框"，形体立刻立起来
       ② 两条竖向窄条  → 金属转折处那种短促的竖高光（工业产品图的标志性反射）
       ③ 一块纯黑遮光板 → **暗的形状和亮的形状一样重要**。没有硬边黑块，
          金属上就没有那种干脆的明暗交界，只会是一团均匀反光（这条最容易被忽略）
     ⚠️ 所有这些都写在环境贴图里而不是加灯：metalness≈1 的材质对灯几乎不响应，只反射环境。 */
  const striplight = (y, h, a) => {
    x.fillStyle = `rgba(255,250,242,${Math.min(1, a * boost)})`;
    x.fillRect(0, y, 1024, Math.round(h * Math.min(2.5, boost)));
  };
  striplight(300, 3, 0.34);                 // ① 低位长条 = 环下缘那道亮线
  const vstrip = (cx, w, a) => {            // ② 竖向窄条
    x.fillStyle = `rgba(255,248,238,${Math.min(1, a * boost)})`;
    x.fillRect(cx, 0, w, 512);
  };
  vstrip(430, 10, 0.20);
  vstrip(905,  6, 0.14);
  // ③ 遮光板：压一块硬边暗区，制造明暗交界
  x.fillStyle = `rgba(0,0,0,${0.55 - key * 0.42})`;   // 浅色棚要少压，否则黑环彻底沉底
  x.fillRect(600, 210, 250, 190);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  pm.dispose(); tex.dispose();
  return env;
}

/* ---------- 极细的周向拉丝：让金属有加工痕迹，而不是塑料 ---------- */
function brushedRoughness(base){
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 8;
  const x = c.getContext('2d');
  for(let i=0;i<1024;i++){
    const v = Math.round(255*Math.min(1, Math.max(0, base + (Math.random()-0.5)*0.10)));
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.fillRect(i,0,1,8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3,1);
  return t;
}

/* ---------- 猫眼纹：沿周向的同心细密拉丝（SY15 实物表面） ----------
   🔴 与上面 brushedRoughness 的关键区别是**纹理方向，不是粗糙度数值**。
      LatheGeometry 的 UV：u = 绕环一周（周向），v = 沿截面走（内壁→顶→外壁→底）。
        · brushedRoughness 让 roughness 沿 **u** 变化 → 条纹横跨环宽（加工痕）
        · catseyeRoughness 让 roughness 沿 **v** 变化 → 细纹**顺着周向跑**，
          于是高光被拉成一条横跨环宽的弥散宽带 = 猫眼效果
      画布因此要转 90°（8×1024，逐行写），不是把 1024×8 的数值调一调就能得到。
   🔴 第一版写错了两处，留档避免重犯：
     ① `repeat.set(1,1)` → 纹理沿整条截面只走一遍。而**外壁只占截面约 1/4**
        （截面还包含内壁+顶面+底面），低频光带在外壁那一段连一个周期都凑不满 ⇒ 渲出来是光滑黑面。
        ⇒ 必须把 repeat.y 提到 20 左右，让外壁段内有足够多的细纹周期。
     ② 加了低频 `band` 项想"画"出那条宽光带 —— 方向错了。
        那条宽光带是**几何曲率 + 环境光**给的（穹面把环境反射压成一条带），
        roughness 的活只有一件：把它**打散成弥散的**，而不是镜面那种锐利线条。
        ⇒ 去掉 band 项，只留高频细纹，幅度加大到 0.11。*/
function catseyeRoughness(base){
  const c = document.createElement('canvas');
  c.width = 8; c.height = 1024;
  const x = c.getContext('2d');
  for(let i=0;i<1024;i++){
    const fine = (Math.random()-0.5) * 0.11;            // 同心细纹（唯一的活）
    const v = Math.round(255*Math.min(1, Math.max(0, base + fine)));
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.fillRect(0,i,8,1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1,20);   // 沿截面重复 20 次 ⇒ 外壁段内约 5 个周期，细纹才密得起来
  return t;
}

/* 按 finish 选纹理方向：猫眼走同心纹，其余走原来的周向拉丝 */
function finishRoughness(f){
  return f.catseye ? catseyeRoughness(f.roughness) : brushedRoughness(f.roughness);
}

/* ---------- 接触阴影：一枚躺在台面上的戒指才有重量 ---------- */
function contactShadow(){
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const rg = x.createRadialGradient(128,128,0,128,128,128);
  rg.addColorStop(0.00,'rgba(0,0,0,.55)');
  rg.addColorStop(0.45,'rgba(0,0,0,.22)');
  rg.addColorStop(1.00,'rgba(0,0,0,0)');
  x.fillStyle = rg; x.fillRect(0,0,256,256);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(c), transparent:true, depthWrite:false })
  );
  m.rotation.x = -Math.PI/2;
  m.position.y = -12.7;
  m.scale.set(1, 0.58, 1);
  return m;
}

/* ============================================================
   主入口
   ============================================================ */
// Photograph-constrained interior: dark encapsulation, charging contact and PCB details.
function sampleInterior(halfWidth = 4.0) {
  const root = new THREE.Group();
  root.name = 'sample-interior';
  const resin = new THREE.MeshPhysicalMaterial({
    color:0x101a20, metalness:0.14, roughness:0.19,
    clearcoat:1, clearcoatRoughness:0.08, side:THREE.BackSide,
    envMapIntensity:0.8
  });
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(RI-0.018,RI-0.018,halfWidth*1.82,160,1,true),resin);
  sleeve.name = 'dark-resin-sleeve'; root.add(sleeve);
  const put = (name, geometry, material, a, y=0, lift=0.045) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.userData.explodeWithParent = true;
    const r = RI-0.018-lift;
    mesh.position.set(r*Math.sin(a),y,r*Math.cos(a));
    mesh.lookAt(0,y,0); root.add(mesh); return mesh;
  };
  const material = (color,metalness,roughness) => new THREE.MeshPhysicalMaterial({color,metalness,roughness,envMapIntensity:0.75});
  const copper = material(0xba9680,0.72,0.28);
  const silver = material(0xc4c3ba,0.85,0.22);
  const black = material(0x101318,0.1,0.3);
  const gold = material(0xb49c68,0.65,0.34);
  const contactAngle = 4.02;
  put('charging-contact-copper-annulus',new THREE.RingGeometry(0.51,1.12,64),copper,contactAngle,0,0.06);
  put('charging-contact-dark-separator',new THREE.CircleGeometry(0.51,48),black,contactAngle,0,0.07);
  put('charging-contact-silver-center',new THREE.CircleGeometry(0.28,48),silver,contactAngle,0,0.082);
  put('charging-contact-rim',new THREE.RingGeometry(1.10,1.17,64),silver,contactAngle,0,0.065);
  // Component clusters are visual approximations of the photographed encapsulated PCB.
  const chips = [[-.48,.8,1.1,.7],[-.77,-.6,.9,.7],[.50,.3,1.25,1.1],[.82,-.6,.65,.7],[1.14,.65,.8,.55],[-1.13,.1,.7,1.0]];
  chips.forEach(([a,y,w,h],i)=>{
    put('pcb-ic-'+i,new THREE.PlaneGeometry(w,h),black,contactAngle+a,y,.04);
    for (const side of [-1,1]) for(let k=0;k<3;k++)
      put('pcb-pad-'+i+'-'+side+'-'+k,new THREE.PlaneGeometry(.14,.21),silver,contactAngle+a+side*w/(2*RI),y+(k-1)*.25,.05);
  });
  [[-.24,1.35],[.22,1.15],[.43,-1.2],[-.45,-1.22],[.98,.1],[-1.0,1.05]].forEach(([a,y],i)=>{
    put('gold-test-pad-'+i,new THREE.CircleGeometry(.16,20),gold,contactAngle+a,y,.05);
  });
  [[-.25,-1.25],[.28,-1.4],[.65,1.25],[-.92,-1.1]].forEach(([a,y],i)=>{
    put('pcb-passive-'+i,new THREE.PlaneGeometry(.4,.23),material(0x9d9988,.35,.45),contactAngle+a,y,.05);
  });
  root.userData.sculptRuntime = { reference:'sample photographs', hiddenRegions:'approximate', chargingContact:true };
  return root;
}

export function mountRing(canvas, opts){
  opts = opts || {};
  canvas.dataset.modelVersion = opts.sampleAppearance ? 'sample-20261030' : 'concept';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer, opts.envBoost, opts.envKey);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 400);
  camera.position.set(0, 9, 66);
  camera.lookAt(0, -0.6, 0);

  const key  = new THREE.DirectionalLight(0xFFF7EE, 1.05); key.position.set(-16, 22, 20); scene.add(key);
  const rim  = new THREE.DirectionalLight(0xD4B8A5, 1.85); rim.position.set( 18, -4,-22); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x9FB4C8, 0.42); fill.position.set( 22, 10, 14); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  /* opts.contactShadow:false → 不加接触阴影。
     只给「透明底纯形态参考图」用（10_设计/短片素材/ref_ring.html）：
     阴影是半透明黑，抠成透明 PNG 丢给 AI 模型当参考时会被读成画面里的一块污渍。
     ⚠️ 默认值不变（undefined ≠ false）→ 落地页 / 众筹主图 / 详情长图 全部不受影响。 */
  if (opts.contactShadow !== false) scene.add(contactShadow());

  // —— 戒指 ——
  const ring = new THREE.Group();
  const bandGeo = new THREE.LatheGeometry(bandProfile(opts.shape), 256);
  bandGeo.computeVertexNormals();

  /* opts.finish：初始表面。2026-09-03（D43）加这个口子，
     免得调用方都得先挂载再补一次 setFinish('catseye')（那样会白建一张 roughnessMap）。*/
  const f0 = FINISHES[opts.finish] || FINISHES.black;
  const bandMat = new THREE.MeshPhysicalMaterial({
    color: f0.color, metalness: f0.metalness, roughness: opts.sampleAppearance ? 0.13 : f0.roughness,
    clearcoat: f0.clearcoat, clearcoatRoughness: 0.22,
    envMapIntensity: f0.env,
    roughnessMap: opts.sampleAppearance ? null : finishRoughness(f0)
  });

  const band = new THREE.Mesh(bandGeo, bandMat);
  band.rotation.x = Math.PI/2;          // 立起来，指孔朝 Z
  ring.add(band);

  /* 🔴 2026-08-14 修 bug：传感器阵列以前是 `ring.add(sensorArray())` 直接加进来的，
     **没有跟着 band 做那个 π/2**。band 是 LatheGeometry（绕 Y 轴旋成）再立起来的，
     而 sensorArray() 内部也是按"轴=Y"建的 —— 少了这一步，
     传感器平面就和环体平面差 90°，变成一圈垂直插在戒指上的东西，
     从某些角度看会飘在环体轮廓外面（姿态扫描图里能直接看到）。
     结果是落地页那枚 3D 戒指**从来没有正确显示过它的传感器**。
     用父级 Group 承载这个 π/2，而不是直接改 sensorArray() 返回对象的 rotation.x ——
     它内部已经用了 rotation.z = π（把传感器转到贴指腹那一侧），
     直接叠 X 会改变欧拉复合顺序，把那个语义弄坏。 */
  const sensors = new THREE.Group();
  sensors.rotation.x = Math.PI/2;
  // ledLit 默认 true（落地页交互演示保持原状）；宣传主图必须传 false，见 sensorArray() 注释
  if (opts.sampleAppearance) sensors.add(sampleInterior(opts.shape?.HW || 4.0));
  else sensors.add(sensorArray(opts.ledLit !== false));
  // 内舱电子件（2026-09-22，默认关）：官方剖切图同构的黑舱+金贴片+银盘。
  // 🔴 不做任何旋转——圆周定位全在 innerElectronics() 的 VIS_BIAS 里
  // （绕 z 轴会把 y≠0 的元件搅离内壁，见该函数注释）。
  if (opts.innerElectronics) sensors.add(innerElectronics());
  // 内衬要放在传感器组同一个 π/2 坐标系里（它也是按"轴=Y"建的）
  if (opts.innerLiner) sensors.add(innerLiner());
  if (opts.showMotor) {
    const mg = motorUnit();
    /* 🔴 十二轮 0.42 → 0.70：姿态斜到 x-0.95 后**可见的内壁区间整体移位了**，
       0.42 把马达甩到内壁擦边处 —— 沉孔自遮挡，画面上只剩倒角的一条弧（真的这么渲出来过）。
       0.70 落在传感器带旁边的正面区：和 PPG 分得开，又都朝着镜头。
       ⚠️ 这个角度与 POSE 强耦合，**以后动 POSE 必须回来重定它**。 */
    mg.rotation.z = Math.PI * 0.70;
    sensors.add(mg);
  }
  ring.add(sensors);

  ring.rotation.set(-0.26, -0.46, 0.10);
  scene.add(ring);

  /* ---------- 交互：拖拽旋转 + 静止自转 ---------- */
  let dragging=false, px=0, py=0, vx=0.0022, vy=0, frozen=false;

  const down = e => { dragging=true;
    const p=e.touches?e.touches[0]:e; px=p.clientX; py=p.clientY;
    canvas.style.cursor='grabbing'; };
  const move = e => { if(!dragging) return;
    const p=e.touches?e.touches[0]:e;
    const dx=p.clientX-px, dy=p.clientY-py; px=p.clientX; py=p.clientY;
    ring.rotation.y += dx*0.0088;
    ring.rotation.x  = Math.max(-1.35, Math.min(1.35, ring.rotation.x + dy*0.0072));
    vx = dx*0.00055; vy = dy*0.00042;
    if(e.cancelable) e.preventDefault(); };
  const up = () => { dragging=false; canvas.style.cursor='grab'; };

  canvas.style.cursor='grab';
  canvas.addEventListener('mousedown',down);
  window.addEventListener('mousemove',move);
  window.addEventListener('mouseup',up);
  canvas.addEventListener('touchstart',down,{passive:true});
  canvas.addEventListener('touchmove',move,{passive:false});
  canvas.addEventListener('touchend',up);

  /* ---------- 尺寸自适应 ----------
     ⚠️ zLock：手动 zoom() 过就不再按宽度自动改机位。
        否则 ResizeObserver 会在挂载后把 zoom() 设的值覆盖掉（踩过一次）。*/
  let zLock = null;
  function resize(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if(!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
    camera.position.z = zLock !== null ? zLock : (w < 420 ? 76 : 66);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* ---------- 渲染循环（离屏暂停，省电） ---------- */
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; },
    {threshold:0.05}).observe(canvas);

  let t = 0;
  (function loop(){
    requestAnimationFrame(loop);
    if(!visible) return;
    t += 0.016;
    if(!dragging && !frozen){
      vx += (0.0022 - vx) * 0.012;
      vy *= 0.93;
      ring.rotation.y += vx;
      ring.rotation.x += vy;
      ring.rotation.x += Math.sin(t*0.42) * 0.00026;   // 极轻微浮动，像呼吸
    }
    renderer.render(scene, camera);
  })();

  /* ---------- 外部 API ---------- */
  return {
    setFinish(k){
      const f = FINISHES[k] || FINISHES.black;
      bandMat.color.setHex(f.color);
      bandMat.metalness = f.metalness;
      bandMat.roughness = opts.sampleAppearance ? (k === 'black' ? 0.17 : 0.13) : f.roughness;
      bandMat.clearcoat = f.clearcoat;
      bandMat.envMapIntensity = f.env;
      if(bandMat.roughnessMap) bandMat.roughnessMap.dispose();
      bandMat.roughnessMap = opts.sampleAppearance ? null : finishRoughness(f);
      bandMat.needsUpdate = true;
    },
    /** 诊断用：切环体的 side（FrontSide/BackSide/DoubleSide）。
     *  斜置视角下若近侧环体被"看穿"，用它区分【法线朝内被背面剔除】和【别的物体穿出来】。 */
    debugSide(side){ bandMat.side = side; bandMat.needsUpdate = true; },
    /** 定死一个姿态并停掉自转 —— 出海报静帧用，保证每次渲染一模一样 */
    pose(x, y, z){
      ring.rotation.set(x, y, z === undefined ? 0 : z);
      vx = 0; vy = 0; frozen = true;
    },
    /** 视频用：恢复/设定自转角速度（pose 冻结后想让它转起来就用这个）。
     *  静帧产线（shot_*.js）一律不用它，海报不受影响。 */
    spin(w){
      frozen = false;
      vx = (w === undefined ? 0.0022 : w);
      vy = 0;
    },
    /** 视频逐帧录制用：直接把姿态设成给定欧拉角并冻结（确定性，与 rAF 无关）。
     *  录制脚本每帧调一次 setRot(f(t))，f 是 t 的纯函数 —— 与「会动的必须是 date
     *  纯函数」铁律同构（时间函数挪到了录制侧）。静帧产线不用。 */
    setRot(x, y, z){
      ring.rotation.set(x, y, z);
      vx = 0; vy = 0; frozen = true;
    },
    /** 相机推近/拉远（海报里戒指要占满画面） */
    zoom(z){ zLock = z; camera.position.z = z; camera.updateProjectionMatrix(); },

    /** 曝光。metalness=1 的纯金属几乎只反射环境，暗影棚里会整个沉下去；
     *  出主图时往上拉（1.6~2.0）才能看清形体。renderer 是 alpha:true，
     *  只影响戒指本身，不会把背景一起提亮。 */
    exposure(v){ renderer.toneMappingExposure = v; },

    /** 转到能看见内侧传感器的角度 */
    showInside(){
      if (opts.sampleAppearance) {
        ring.rotation.set(-0.65, 0.85, Math.PI);
        vx = 0; vy = 0; frozen = true; return;
      }
      const tx = 0.92, from = ring.rotation.x, t0 = performance.now();
      (function anim(){
        const k = Math.min(1, (performance.now()-t0)/900);
        const e = 1 - Math.pow(1-k, 3);
        ring.rotation.x = from + (tx - from)*e;
        if(k < 1) requestAnimationFrame(anim);
      })();
    },
    /** 呼应"被碰一下"：戒指轻轻一颤 */
    pulse(){
      const t0 = performance.now(), base = ring.scale.x;
      (function anim(){
        const k = (performance.now()-t0)/900;
        if(k >= 1){ ring.scale.setScalar(base); return; }
        const s = base + Math.sin(k*Math.PI) * Math.sin(k*Math.PI*6) * 0.016;
        ring.scale.setScalar(s);
        requestAnimationFrame(anim);
      })();
    }
  };
}
