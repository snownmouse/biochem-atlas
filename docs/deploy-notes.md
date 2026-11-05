# 部署与安全评估（生化反应 3D 可视化挂图平台）

结论先行：**可以部署**，但有条件——上线前必须先做一次干净构建（当前 `dist` 里的 207 MB 是重复构建累积的过期产物，真实发布体积约 **21.8 MB**），并按本文的 nginx 安全头/限速/缓存策略托管。不存在后端、登录、数据库、上传或运行时外部依赖，属于"纯静态 + 浏览器端渲染"，攻击面很小，但被当成免费图床/带宽矿工的风险是真实的。

本文所有结论均来自本仓库的实际检查（源码、构建产物、真实构建与无头浏览器验证），不含推测。评估时间 2026-11-05。

---

## 0. 先纠一个前提：`dist` 不是 207 MB

| 检查 | 事实 |
| --- | --- |
| 当前 `dist/` | **209 MB / 1141 个文件**，其中 `index-*.js` 有 **158 份**、`3Dmol-*.js` 多份、`.css` 50 份 |
| 原因 | 反复 `vite build` 且 `preview` 服务常驻，旧哈希产物未被清掉（Windows 上文件被占用时清理会失败），逐次累积 |
| 干净构建实测 | `npx vite build --outDir <临时目录> --emptyOutDir` → **21.8 MB / 776 个文件 / 仅 2 个 JS chunk**（`index-*.js` + `3Dmol-*.js`） |
| 构成 | `public/assets` 19.7 MB（772 文件，已入库的资产）+ 打包产物约 2.1 MB |

**发布动作必须包含"清空再构建"**：先停掉 `vite preview`，再 `npm run build`（或至少确认 `dist/assets` 里没有多份 `index-*.js`）。直接把当前 209 MB 目录上传，等于给服务器塞 187 MB 的无用文件，并让部署慢 10 倍。

---

## 1. 攻击面实测盘点（产物里到底有什么）

### 1.1 sourcemap

| 项 | 结论 | 依据 |
| --- | --- | --- |
| `vite.config.ts` | 未配置 `build.sourcemap` → Vite 默认 **false** | 文件内容只有 `plugins` 与 `server.port` |
| `dist/**/*.map` | **0 个** | `Get-ChildItem dist -Recurse -Filter *.map` 计数为 0 |
| 公网能否靠 map 还原源码 | **不能**（没有 map；即便有也建议不发布） | — |

### 1.2 可执行/可利用面

| 项 | 结论 | 依据 |
| --- | --- | --- |
| 服务端代码 / API 路由 | **无**。没有 `server/`、没有 SSR、没有 `/api` | 路由只有 4 条前端路由（`/`、`/pathway/:pathwayId`、`/step/:stepId`、`/structures/:pathwayId`） |
| 表单 / 上传 | **无**（无 `<form>`、无 file input） | `src` 全量检索 |
| Cookie / localStorage / sessionStorage | **无**（不写入任何用户数据，也没有服务端会话） | 同上 |
| `postMessage` | **无** | 同上 |
| 到外部域的 `fetch` | **无**；`fetch` 只取本站 `/assets/steps/manifest.json` 与 `/assets/...` 资产 | 字体已本地自托管，`index.html` 无外链 |
| 动态 `import()` | 有，但全部指向已打包的本地 chunk | 5 处 `await import("3dmol")`（`Molecule3D`、`SolubleDomain3D`、`Enzyme3DPanel`、`EmbeddedStepViewer`、`StepViewPage`）→ 产出 `assets/3Dmol-*.js` |
| `new Function` | **无** | 源码检索 |
| `eval` | 有，**在依赖内部**，且本项目的调用路径不会触发（见 1.3） | — |

### 1.3 3Dmol 的 `eval`：构建警告原文与 CSP 结论

构建时警告原文：

```text
node_modules/3dmol/build/3Dmol.js (43198:19): Use of eval in "node_modules/3dmol/build/3Dmol.js"
is strongly discouraged as it poses security risks and may cause issues with minification.
```

对应代码（`node_modules/3dmol/build/3Dmol.js` 第 ~43195 行）：

```js
function makeFunction(callback) {
    //for py3dmol let users provide callback as string
    if (callback && typeof callback === "string") {
        callback = eval("(" + callback + ")");
    }
    ...
}
```

结论：这段 `eval` 只为 py3Dmol 场景设计——**只有当回调以字符串传入时才执行**。本项目所有 3Dmol 调用传的都是普通函数（`createViewer` / `addModel` / `setStyle` / `addLabel` 等），从不传字符串，因此 `eval` 分支在运行时不会被执行。

**CSP 实测**（不是推断）：用 Playwright + Edge，对全部响应注入严格 CSP（`script-src 'self'`，**不含** `'unsafe-eval'`），打开 `/structures/glycolysis`：

- 页面正常渲染，`canvas` 数量 **3**（3Dmol 已挂载）
- `console` / `pageerror` **0 条**，CSP 违规 **0 条**

→ **CSP 可以收紧，不需要 `unsafe-eval`**。仅当将来真的把字符串回调传给 3Dmol（例如做 py3Dmol 式脚本化调用）时，才需要改用本文 §7 的 B 版。

### 1.4 `index.html` 的外链

现在为 **0**：`index.html` 只有本站的 `assets/index-*.js`、`assets/index-*.css` 与内联 `data:` favicon，没有 `fonts.googleapis.com` / `fonts.gstatic.com`，也没有任何第三方脚本、统计、CDN。字体来自 `public/assets/fonts/`（404 个 woff2，10.8 MB）。

### 1.5 其它事实

- 资产全部为只读静态文件：`public/assets/pathways`（3 张 SVG）、`ligands3d`（61 个 JSON）、`steps`（109 个 SDF/JSON，7.2 MB）、`structures`（196 个 2D 资产）、`oxphos`（4 个 PDB，1.0 MB）。
- PDB 共 23 个，最大单文件 **958 KB**，平均 354 KB。
- 无 CORS 需求（同源取资产），不需要 `Access-Control-Allow-Origin: *`。

---

## 2. 攻击面清单（静态托管真正会遇到什么）

| # | 风险 | 是否真实存在 | 处置 |
| --- | --- | --- | --- |
| 1 | 目录遍历 / autoindex 泄露 | 存在（默认 `autoindex off` 就不会列目录；若开了会暴露全部资产路径与文件名） | 显式 `autoindex off;`，并 `try_files $uri =404`（资产目录不要回落到 SPA） |
| 2 | 热链盗用（21.8 MB 资产被别站直接引用） | **真实且最常见**：静态资源一旦公开，任何人 `<img src="https://your.domain/assets/...">` 即可蹭带宽 | 三层：① `limit_req`/`limit_conn` 限速；② 可选 Referer 白名单（见 §7，注意可伪造）；③ 真被滥用时上 CDN + 签名 URL / WAF |
| 3 | 大文件 + `Range` 请求耗尽带宽 | 存在（958 KB PDB 支持 Range，攻击者可并发多段下载） | `limit_conn` + `limit_req`；nginx 默认 `sendfile`；不建议关闭 Range（会破坏断点续传/浏览器缓存体验），靠限速与配额兜底 |
| 4 | Slowloris / 慢连接占用 worker | 存在（任何 HTTP 服务都有） | nginx 默认 `client_header_timeout 10s`；再加 `client_body_timeout 10s`、`send_timeout 15s`、`keepalive_timeout 30s`、`reset_timedout_connection on`；`limit_conn` 限制单 IP 并发 |
| 5 | 扫描器 / 爬虫噪音 | 必然存在（公网 IP 几小时内就会被扫） | 无需对抗，只影响日志；`server_tokens off` 减少指纹；用 `robots.txt` 表达意图 |
| 6 | 缓存投毒 / 缓存键错误 | 低（没有反向代理缓存、没有 `Vary` 敏感内容、没有多租户） | 若上 CDN：只缓存 `assets/*`（带 hash、`immutable`），`index.html` 不缓存；不要把 `Host`/`Cookie` 参与缓存键以外的东西 |
| 7 | 错误页信息泄露 | 存在（默认 nginx 404 会暴露 `nginx/x.y` 版本） | `server_tokens off` + 自定义 `error_page`；SPA 路由回落到 `index.html` 属预期，但 `/assets/**` 必须真 404 |
| 8 | HTTP 明文 | 存在（裸 HTTP 可被注入/篡改，教学演示被塞广告） | 全站 301 到 HTTPS；HSTS 在 TLS 验证稳定后再加长 `max-age` |
| 9 | `robots.txt` / `sitemap` | 建议给 | `robots.txt` 允许抓取、可选禁止 `/assets/`；`sitemap.xml` 只在需要被搜索引擎收录时给（4 条路由，手写即可） |
| 10 | 防盗链（Referer 校验） | 可选，不建议一上线就硬拦 | 见 §7 注释块；硬拦会误伤"无 Referer"的直链打开、部分隐私浏览器 |
| 11 | 限速 | **建议必做** | `limit_req zone=... burst=... nodelay` + `limit_conn`，阈值见 §7 |
| 12 | 文件上传 / 命令执行 / SQL | **不存在**（无上传、无后端、无数据库） | 无需 WAF 规则；保持"服务器上没有可写目录给站点进程"即可 |

---

## 3. 对服务器本身的影响（量化）

### 3.1 单次访问的体积（干净构建）

| 场景 | 原始体积 | 过线体积（gzip） | 说明 |
| --- | --- | --- | --- |
| 首页首访（冷缓存） | ≈ 1.5 MB | ≈ 0.6–1.0 MB | `index.html` 3 KB + JS 1.08 MB（gzip 30.4%）+ CSS 36 KB（19.0%）+ 实际用到的字体分片（woff2 已是压缩格式，**不要二次 gzip**）+ 少量 SVG/JSON |
| 结构对照页（含 3D） | 再 + 0.6 MB | 再 + 0.17 MB | `3Dmol-*.js` 574 KB（gzip ≈170 KB）+ 每个分子 3D JSON 1–3 KB |
| 单个 PDB 大文件 | 958 KB | 236 KB（gzip）/ 157 KB（brotli） | 仅氧化磷酸化相关页面会取 |

实测压缩比（`.NET`/Node 实际压缩，非估算）：

| 文件 | 原始 | gzip | brotli |
| --- | --- | --- | --- |
| `model.pdb`（958 KB） | 958 KB | **24.6%**（236 KB） | **16.4%**（157 KB） |
| `index-*.js`（1.08 MB） | 1080 KB | **30.4%**（328 KB） | **23.0%**（248 KB） |
| `index-*.css`（36 KB） | 36 KB | **19.0%** | **16.9%** |
| `manifest.json` | 10 KB | **24.8%** | **20.9%** |

结论：**JS/JSON/PDB 值得压缩**（省 70–80% 带宽）；woff2 已压缩，不要再压。

### 3.2 并发与带宽

按"每人每次会话 ≈ 2 MB（首页 + 一个结构页）"粗算：

| 并发用户 | 一次性出网流量 | 5 Mbps 上行 | 10 Mbps 上行 | 100 Mbps |
| --- | --- | --- | --- | --- |
| 20 | 40 MB | ≈ 64 s | ≈ 32 s | ≈ 3 s |
| 100 | 200 MB | ≈ 320 s | ≈ 160 s | ≈ 16 s |
| 500 | 1 GB | ≈ 27 min | ≈ 13 min | ≈ 80 s |

注意：上表是"所有人同时冷加载"的极端值；实际有浏览器缓存（带 hash 的资源可 `immutable` 缓存一年），回访几乎只拉 `index.html`。

- **CPU**：nginx 静态文件几乎不耗 CPU；压缩是主要开销，用 `gzip_static`（预压缩）或 brotli 模块可把 CPU 压到接近 0。1 核足够 100+ 并发。
- **内存**：nginx 不按用户缓存文件内容；4 个 worker + 连接缓冲，100 并发下 RSS 通常 **20–50 MB**；`sendfile` 用内核零拷贝，不占用户态内存。
- **磁盘**：站点 **21.8 MB**；建议同盘预留 1–2 GB 给日志与系统。
- **日志**：默认 combined 格式约 200 字节/请求；一次访问 ≈ 30–50 个请求 → **6–10 KB/访问**。每天 1000 次访问 ≈ 8 MB/天 ≈ **240 MB/月**，必须配 `logrotate`（保留 7–14 天，或只记录错误日志）。
- **HTTP/2**：**建议开**。本站单页会并发请求 100+ 个字体分片与若干 JSON/SVG，HTTP/1.1 的 6 连接上限会成为首屏瓶颈；HTTP/2 多路复用收益明显（需 TLS）。

---

## 4. 云服务器落地清单（腾讯云 / 阿里云）

1. **规格**：轻量应用服务器 2 核 2 GB 足够（静态站，无后端）。带宽 5 Mbps 起步；若预期同时在线 >100 人，选按流量计费或升到 10 Mbps。
2. **安全组**：只放 **80 / 443**；关闭 22 对公网（或限制源 IP）、关闭数据库/面板端口。不要装宝塔后把 8888 暴露公网。
3. **系统与用户**：单独建 `www-data` 类低权用户；nginx 以该用户运行（`user www-data;`），站点目录 `chown -R root:www-data` + `chmod 755`，**不给写权限**。
4. **TLS**：Let's Encrypt（`certbot --nginx`）或云厂商免费证书；强制 301 到 HTTPS；证书自动续期（`certbot.timer`）。HSTS 先给 `max-age=15552000`，稳定运行 1 个月后再拉到 `31536000`。
5. **备份**：站点内容来自 Git，服务器上只需保留 `dist`；打一次系统快照即可；配置（`nginx.conf`/证书）纳入 Git 或单独备份。
6. **带宽计费**：按流量计费时注意"被热链/扫描"会直接烧钱——限速与防盗链是省钱手段；固定带宽（5 Mbps）则只影响速度不额外计费。
7. **CDN**：**值得**。静态 + 带 hash 资源 + 全国访问，CDN 能把源站带宽压力降到接近 0；配置：只缓存 `/assets/**`（`immutable`），`index.html` 不缓存或短缓存 + 发布时刷新；开启 HTTPS 与 Brotli。
8. **监控**：`nginx -s reload` 前后做 `curl -I` 自检；加 `access_log` 采样或 GoAccess 看流量来源，及时发现热链。

---

## 5. 本地服务器对外落地清单（风险更高）

明确风险（按严重度）：

1. **上行带宽**：家用/办公宽带上行常是 30–50 Mbps 甚至更低，且被全屋共享；一次 20 人同时打开 3D 页就能打满，附带影响家里其它设备。
2. **公网 IP 与端口映射**：需要公网 IP（多数家宽是 NAT 后无公网 IP），端口映射会把内网端口暴露到公网；UPnP 自动映射更危险。
3. **同机其它服务连带风险**：nginx 本身被攻破的概率低，但同一台机器上的 NAS、数据库、远程桌面一旦被扫描到，损失远大于一个教学站。
4. **系统补丁**：家用机常年不更新，一旦有内核/服务漏洞，暴露在公网等于开门。
5. **权限最小化**：`user www-data`、站点目录只读、`systemd` 沙箱（`ProtectSystem=strict`、`PrivateTmp=true`、`NoNewPrivileges=true`、`ReadWritePaths` 仅日志），以及 `limit_req` / `limit_conn`。
6. **可用性与断电**：停电、路由器重启、ISP 断线都会让站点 502/不可达；没有 UPS 与监控就只能等人报障。
7. **TLS**：没有证书只能 HTTP，明文可被篡改；自签证书会吓退访问者。可用 Let's Encrypt，但要求域名解析到该公网 IP 且 80 端口可达。
8. **被入侵的波及面**：本机若存有个人文件、照片、工作资料，一旦被拿下全部暴露；这也是最需要权衡的一点。

**建议（一句话）**：先在**局域网内**用 `vite preview` 或 nginx 绑定内网地址验收全部页面与 3D 交互，确认没问题后**直接上云**；如果坚持本地对外，至少做到"独立低权用户 + 站点目录只读 + 只开 443 + 系统自动更新 + 与个人数据物理/账号隔离"，并接受"家里断网即站点不可用"。

---

## 6. nginx 配置片段（server 块级别）

以下为可直接落地的模板，`your.domain` 与证书路径需替换。`limit_req_zone` 必须放在 `http {}` 层。

```nginx
# ---------- http {} 层（放在 nginx.conf 的 http 块内） ----------
limit_req_zone  $binary_remote_addr zone=perip:10m rate=20r/s;
limit_conn_zone $binary_remote_addr zone=conn_perip:10m;

gzip on;
gzip_vary on;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types text/plain text/css application/javascript application/json application/xml image/svg+xml;

sendfile on;
tcp_nopush on;
tcp_nodelay on;
keepalive_timeout 30s;

# ---------- HTTP -> HTTPS ----------
server {
    listen 80;
    server_name your.domain;
    server_tokens off;
    return 301 https://$host$request_uri;
}

# ---------- 主站 ----------
server {
    listen 443 ssl;
    http2 on;                      # nginx < 1.25 用：listen 443 ssl http2;
    server_name your.domain;

    root /var/www/biochem-atlas/dist;
    index index.html;

    server_tokens off;
    autoindex off;
    client_max_body_size 1m;       # 纯静态站，没有上传
    client_body_timeout 10s;
    send_timeout 15s;
    reset_timedout_connection on;

    ssl_certificate     /etc/letsencrypt/live/your.domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your.domain/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # 安全头：注意 add_header 只在"该层级没有其它 add_header"时继承，
    # 因此 location 里若要改 Cache-Control，必须把这些头重复一遍。
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header X-Frame-Options "DENY" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
    add_header Strict-Transport-Security "max-age=15552000; includeSubDomains" always;

    # A 版 CSP：已实测 3Dmol 在无 unsafe-eval 下正常
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;

    # 全局限速（可按需只放在 /assets/）
    limit_req  zone=perip burst=40 nodelay;
    limit_conn conn_perip 20;

    # 带 hash 的构建产物：一年 immutable
    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
        add_header Cross-Origin-Resource-Policy "same-origin" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;
        # 预热压缩（推荐）：构建后对 js/json/pdb 生成 .gz，再开 gzip_static
        # gzip_static on;
        # 防盗链（可选，硬拦会误伤"无 Referer"的直链）：
        # valid_referers none blocked server_names;
        # if ($invalid_referer) { return 403; }
    }

    # 入口页不缓存，保证发版立即生效
    location = /index.html {
        add_header Cache-Control "no-cache" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Strict-Transport-Security "max-age=15552000; includeSubDomains" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;
    }

    # SPA 路由回落（4 条前端路由都靠它）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 隐藏文件一律 404
    location ~ /\.. {
        return 404;
    }

    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    location = /404.html { internal; }
    location = /50x.html { internal; }
}
```

**B 版 CSP（仅在真的把字符串回调传给 3Dmol 时才用）**：把 A 版的 `script-src 'self'` 改成：

```nginx
script-src 'self' 'unsafe-eval'
```

理由：3Dmol 的 `makeFunction()` 对字符串回调执行 `eval`（`node_modules/3dmol/build/3Dmol.js` 第 ~43198 行）。本项目当前不传字符串，实测 A 版无违规；只有引入脚本化调用（py3Dmol 风格）才必须放开，并应同时接受"依赖方代码可被字符串注入"的风险。

---

## 7. 上线检查表

| # | 检查 | 通过标准 |
| --- | --- | --- |
| 1 | 干净构建 | 停 `preview` 后构建；`dist/assets/index-*.js` 只有 1 份；`dist` ≈ 22 MB |
| 2 | 无非预期外链 | `grep -r "fonts.googleapis\|googleapis\|gstatic" dist` 为空 |
| 3 | 无 sourcemap | `(Get-ChildItem dist -Recurse -Filter *.map).Count` 为 0 |
| 4 | SPA 回落 | 直接访问 `/structures/glycolysis` 返回 200 且渲染；`/assets/not-exist.js` 返回真 404 |
| 5 | 安全头 | `curl -I` 看到 `X-Content-Type-Options`、CSP、`Referrer-Policy`、HSTS（仅 HTTPS） |
| 6 | 缓存 | `assets/*` 响应含 `immutable`；`index.html` 含 `no-cache` |
| 7 | 压缩 | `curl -H "Accept-Encoding: gzip" -I assets/index-*.js` 返回 `Content-Encoding: gzip`；woff2 不压缩 |
| 8 | 限速 | 并发压测（如 `ab -c 50 -n 500`）触发 503 而非拖垮 |
| 9 | 权限 | `ps -o user -p $(pgrep -f nginx)` 非 root；站点目录对站点用户只读 |
| 10 | TLS | SSL Labs 评级 ≥ A-；HSTS 头存在；HTTP 301 到 HTTPS |
| 11 | 日志轮转 | `logrotate -d` 配置有效，保留 ≤14 天 |
| 12 | 备份 | 有最近一次快照/配置备份，且能从 Git 重建 `dist` |

---

## 8. 已知限制（不是缺陷，但要知道）

- **SPA 回落的副作用**：任意未知路径返回 `index.html`（200），扫描器看不到 404 差异；这是静态 SPA 的通用取舍，若在意可用 `try_files` + 预生成路由白名单。
- **无访问控制**：站点一旦公开，所有页面与资产对所有人可见；这是设计意图（教学演示）。
- **热链只能缓解不能根除**：Referer 可伪造，真正兜底是限速 + CDN 账单监控。
- **本地服务器方案的上限**：可用性受家庭网络与供电约束，不建议作为正式对外主机。
- **CSP 实测范围**：验证覆盖了首页、结构对照页与 3D 挂载；若后续新增第三方库，应重跑 `tools/.tmp-cspcheck` 式验证（当前该临时脚本已删除）。
