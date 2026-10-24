// 对已部署站点执行可视化冒烟验证：等待模型就绪、截图、输出诊断。
// 用法：LIVE_URL=https://decify3.github.io/windpowerweb3d/ node scripts/verify-live.mjs [截图输出路径]
import { chromium } from '@playwright/test';
const url = process.env.LIVE_URL ?? 'https://decify3.github.io/windpowerweb3d/';
const shot = process.argv[2] ?? 'docs/live-deployment.png';
const browser = await chromium.launch({ channel:'msedge', headless:true, args:['--enable-webgl','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport:{width:1600,height:1000} });
await page.addInitScript(()=>localStorage.setItem('darmk:windpowerweb3d:follow-gate:v1','granted'));
await page.goto(url);
await page.waitForSelector('.three-host[data-ready="true"]', { timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: shot });
const stats = await page.evaluate(()=>window.turbineDiagnostics());
console.log(`LIVE OK — ${url}\nmeshCount: ${stats.meshCount}, lod: ${stats.lod}, selected: ${stats.selected}`);
await browser.close();
