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
