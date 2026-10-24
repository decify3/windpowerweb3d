# 部署指南（DEPLOYMENT）

本项目为纯静态应用（Vue 3 + Vite），生产构建产物 `dist/` 可托管在任何静态服务器上，
不需要 Node.js 运行环境。本文记录已验证的部署方式、资源路径处理和个人网站集成方案。

## 核心机制：base 路径

应用通过 `vite.config.ts` 中的 `base` 决定资源前缀，默认值为 `/windpowerweb3d/`
（与原项目 Nginx 部署路径一致）。可用环境变量 `VITE_BASE` 覆盖：

| 部署目标 | VITE_BASE | 公网地址示例 |
|---|---|---|
| GitHub Pages 项目页 | `/<仓库名>/` | `https://decify3.github.io/windpowerweb3d/` |
| Cloudflare Pages / 网站根路径 | `/` | `https://<项目>.pages.dev/` |
| 个人网站子路径 | `/works/windpowerweb3d/` 等 | `https://你的域名/works/windpowerweb3d/` |

所有运行时资源（GLB 模型、Draco 解码器、二维码图片）均通过 `import.meta.env.BASE_URL`
拼接，跟随 base 自动适配，**无需改动任何业务代码**。

> ⚠️ Windows Git Bash 注意：`VITE_BASE=/` 会被 MSYS 路径转换破坏，
> 请写成 `MSYS_NO_PATHCONV=1 VITE_BASE=/ npm run build`（CI 的 Linux 环境无此问题）。

已验证：根路径与子路径两种构建形态下，10 项 Playwright 测试均全部通过。

## 方式一：GitHub Pages（推荐，已配置自动化）

仓库内已包含 `.github/workflows/deploy-pages.yml`：推送到 `main` 分支即自动构建并发布。

**首次启用步骤**（仓库已创建后）：

1. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. 推送任意提交到 `main`（或手动 **Actions → Deploy to GitHub Pages → Run workflow**）。
3. 等待 Actions 完成后访问 `https://<用户名>.github.io/<仓库名>/`。

注意：

- 免费账户的 Pages 需要仓库为 **Public**。
- 工作流已自动设置 `VITE_BASE=/<仓库名>/`，与 Pages 实际路径匹配，无需手动配置。
- 工作流使用 Node 22 构建并缓存 npm 依赖，单次构建约 1 分钟。

## 方式二：Cloudflare Pages（根路径部署）

1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git。
2. 选择本仓库，构建配置：
   - Framework preset: **Vite**（或 None）
   - Build command: `npm run build`
   - Build output directory: `dist`
   - 环境变量：`VITE_BASE = /`，`NODE_VERSION = 22`
3. 部署完成后即可通过 `https://<项目名>.pages.dev/` 访问。

命令行方式（需要 `wrangler login` 授权）：

```bash
npm run build   # MSYS_NO_PATHCONV=1 VITE_BASE=/ npm run build（Git Bash）
npx wrangler pages deploy dist --project-name windpowerweb3d
```

## 方式三：任意静态服务器 / Nginx（与原项目一致）

```nginx
location /windpowerweb3d/ {
    alias /var/www/windpowerweb3d/;   # 内容为 dist/
    try_files $uri $uri/ /windpowerweb3d/index.html;
}
```

构建时保持默认 base（不设置 `VITE_BASE`）即可。

## 关注引导页（FollowGate）配置

原项目在应用入口加入了"关注公众号"引导页（展示性二维码，前端固定、不校验真实关注），
配置位于 `src/data/followGate.ts`：

- `enabled: true` → 首次访问先显示引导页（原项目行为，保留作者归属）；
- `enabled: false` → 直接进入三维应用（部署到自己的站点时可关闭，引导页功能与测试仍保留）。

修改后重新构建部署即生效。

## 个人网站集成方案

本项目可独立部署，也能作为个人网站的一个子路径作品页：

1. **独立链接（零改动）**：直接使用上面的公网地址，个人网站里放超链接即可。
2. **子路径集成**：个人网站反向代理（Nginx `location /works/wind-turbine/ { proxy_pass ... }`）
   或直接把 `dist/` 放到个人网站该子路径下；构建时 `VITE_BASE=/works/wind-turbine/`。
3. **iframe 嵌入**：`<iframe src="https://...github.io/windpowerweb3d/" style="width:100%;height:80vh;border:0"></iframe>`，
   无需任何构建改动，适合快速嵌入文章或作品集页面。

个人网站技术栈无论将来选什么（Next.js / Astro / 纯 HTML 等），本项目都以独立静态
资源的形式共存，不会互相约束。

## 部署后验证清单

- [ ] 打开公网地址，关注引导页正常（若启用）
- [ ] 三维模型加载完成（右下角状态栏出现 FPS / DRAWS / TRI）
- [ ] 切换 X-Ray、剖切、拆解、叶轮控制正常
- [ ] 切换 LOD 0/1/2 正常（模型来自 `/models/*.glb`，Draco 解码器本地加载）
- [ ] 无 404（DevTools Network 面板）
- [ ] 移动端宽度下布局无横向滚动
