# 知愈 Ring

由 **zhiyu_ring** 制作与维护。

正式网站：https://zhiyu-ring.netlify.app/

备用站：https://lessie-wang.github.io/zhiyu-ring-site/（canonical指向正式网站）

## 本地预览

python3 -m http.server 8765 --bind 127.0.0.1

## Netlify

导入本仓库时使用 netlify.toml 的配置：构建命令 python3 build_site.py --url "$URL"，发布目录 dist。URL使用Netlify分配的正式站点地址，自动同步canonical、sitemap、结构化数据与Agent索引。

手动部署时先运行 python3 build_site.py --url https://实际站点名.netlify.app，再上传dist。只上传dist中的公开资源。

## 内容维护

同步更新页面和product-facts.json；reviewedAt表示资料整理日期，evidenceAsOf表示产品进展来源日期。当前来源截至2026-10-17，不将页面更新时间当作新实测。

three.js 0.160.0采用MIT许可，许可见vendor/THREE-LICENSE.txt。


## 双版本商品页（2026-11-03）

首页包含真系列与触觉版的独立外观、颜色切换、价格、功能对比与摩点入口。修改价格时同步 `index.html`、`product-facts.json`、`product-evidence.html` 与 `llms.txt`，并实时核对摩点。

商品图来自本地 `14_运营/样机展示_2026-11-03/` 的定稿上传版，分别为真系列电镀拉丝猫眼和触觉版金属漆外观。展示图经过整理，不作为尺寸或功能验证依据。图库存于 `assets/`。参考版式：https://dribbble.com/shots/27856228-Creative-Digital-Agency-Website-Design；仅借鉴排版层级与商品信息组织。

构建：`python3 build_site.py --url https://zhiyu-ring.netlify.app`。上传 `dist` 内文件至现有 Netlify 项目；当前不是 Git 自动部署。不要上传工作区业务文档。
