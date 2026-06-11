<script>
        // ================= 全局配置 =================
        let targetRedirectUrl = '';
        let targetEventName = '';
        let apiStatus = 'loading';
        let apiErrorMsg = '';

        const currentLandingUrl = window.location.href.split('?')[0];
        
        // 注意：此默认ID仅用于控制台提示，不会再自动加载
        const DEFAULT_TIKTOK_PIXEL_FOR_LOG = 'D3BSR13C77UAH4NB1EB0';
        
        // 缓存配置
        const CACHE_KEY = 'tiktok_landing_config';
        const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
        
        // 记录已加载的像素ID，避免重复加载
        if (!window.__ttLoadedPixels) {
            window.__ttLoadedPixels = new Set();
        }
        
        // ================= 控制台打印配置信息 =================
        function printTiktokConfig(data, source = 'Config') {
            let pixelIds = extractPixelIds(data);
            pixelIds = pixelIds.filter(id => id && id.trim() !== '');
            const eventName = data.event_name || '(未设置事件名)';
            const redirectUrl = data.redirect_url || '(未设置跳转地址)';
            
            console.group(`📊 TikTok 配置信息 [${source}]`);
            if (pixelIds.length) {
                console.log(`🎯 像素ID:`, pixelIds);
            } else {
                console.warn(`⚠️ 未提取到任何像素ID，请检查后台配置字段（tiktok_pixel_ids / tiktok_pixel_id / pixel_id + platform=tiktok / pixel_ids 等）`);
            }
            console.log(`📌 事件名称: ${eventName}`);
            console.log(`🔗 跳转地址: ${redirectUrl}`);
            console.groupEnd();
        }
        
        // ================= 缓存操作方法 =================
        function getCachedConfig() {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (!cached) return null;
                
                const { data, timestamp } = JSON.parse(cached);
                const now = Date.now();
                
                if (now - timestamp < CACHE_TTL) {
                    console.log("[Cache] 使用缓存的配置数据");
                    return data;
                } else {
                    console.log("[Cache] 缓存已过期");
                    localStorage.removeItem(CACHE_KEY);
                    return null;
                }
            } catch (e) {
                console.error("[Cache] 读取缓存失败:", e);
                return null;
            }
        }
        
        function setCachedConfig(data) {
            try {
                const cacheData = {
                    data: data,
                    timestamp: Date.now()
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                console.log("[Cache] 配置已缓存");
            } catch (e) {
                console.error("[Cache] 写入缓存失败:", e);
            }
        }
        
        // 比较两个配置是否有实质性变化（重定向URL、事件名、像素列表）
        function isConfigChanged(oldData, newData) {
            if (!oldData || !newData) return true;
            
            if (oldData.redirect_url !== newData.redirect_url) return true;
            if (oldData.event_name !== newData.event_name) return true;
            
            const oldPixels = extractPixelIds(oldData);
            const newPixels = extractPixelIds(newData);
            
            if (oldPixels.length !== newPixels.length) return true;
            const sortedOld = [...oldPixels].sort();
            const sortedNew = [...newPixels].sort();
            for (let i = 0; i < sortedOld.length; i++) {
                if (sortedOld[i] !== sortedNew[i]) return true;
            }
            return false;
        }
        
        // ================= 增强版像素ID提取（支持多种字段名 + 详细日志）=================
        function extractPixelIds(data) {
            console.log("[提取像素ID] 输入的原始数据:", data);
            
            // 1. 优先检查 tiktok_pixel_ids (数组)
            if (data.tiktok_pixel_ids && Array.isArray(data.tiktok_pixel_ids)) {
                console.log("[提取像素ID] 从 tiktok_pixel_ids 数组提取");
                return data.tiktok_pixel_ids.filter(id => id && String(id).trim() !== '').map(id => String(id).trim());
            }
            
            // 2. 检查 tiktok_pixel_id (字符串)
            if (data.tiktok_pixel_id) {
                console.log("[提取像素ID] 从 tiktok_pixel_id 字符串提取");
                return parsePixelIds(data.tiktok_pixel_id);
            }
            
            // 3. 检查 pixel_id 且 platform === 'tiktok'
            if (data.pixel_id && data.platform === 'tiktok') {
                console.log("[提取像素ID] 从 pixel_id (platform=tiktok) 提取");
                return parsePixelIds(data.pixel_id);
            }
            
            // 4. 检查是否存在 pixel_ids 字段（复数，可能为数组或字符串）
            if (data.pixel_ids) {
                console.log("[提取像素ID] 从 pixel_ids 字段提取");
                if (Array.isArray(data.pixel_ids)) {
                    return data.pixel_ids.filter(id => id && String(id).trim() !== '').map(id => String(id).trim());
                } else if (typeof data.pixel_ids === 'string') {
                    return parsePixelIds(data.pixel_ids);
                }
            }
            
            // 5. 检查是否存在 pixel_id 字段（即使没有 platform，也尝试提取，但输出警告）
            if (data.pixel_id && typeof data.pixel_id === 'string') {
                console.warn("[提取像素ID] ⚠️ 发现 pixel_id 字段但缺少 platform='tiktok'，仍然尝试提取");
                return parsePixelIds(data.pixel_id);
            }
            
            // 6. 检查是否存在 tiktok_pixel（单数或复数）
            if (data.tiktok_pixel) {
                console.log("[提取像素ID] 从 tiktok_pixel 字段提取");
                return parsePixelIds(data.tiktok_pixel);
            }
            
            // 7. 遍历所有字段，寻找看起来像像素ID的字段（启发式，仅用于调试）
            const possibleKeys = Object.keys(data).filter(key => 
                key.toLowerCase().includes('pixel') || key.toLowerCase().includes('tt')
            );
            if (possibleKeys.length > 0) {
                console.error("[提取像素ID] ❌ 未从标准字段提取到像素ID，但发现以下可能相关的字段:", possibleKeys);
                possibleKeys.forEach(key => {
                    console.log(`  字段 ${key} =`, data[key]);
                });
            } else {
                console.error("[提取像素ID] ❌ 数据中没有任何包含 'pixel' 或 'tt' 的字段，请检查API返回结构");
            }
            
            return [];
        }
        
        // 应用配置到全局变量
        function applyConfigToGlobal(data) {
            targetRedirectUrl = data.redirect_url || '';
            targetEventName = data.event_name || 'Purchase';
        }
        
        // ================= TikTok 像素核心 =================
        (function() {
            if (window.__tiktokBaseLoaded) return;
            window.__tiktokBaseLoaded = true;
            
            !function (w, d, t) {
                w.TiktokAnalyticsObject = t;
                var ttq = w[t] = w[t] || [];
                ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
                ttq.setAndDefer = function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
                for(var i=0;i<ttq.methods.length;i++) ttq.setAndDefer(ttq,ttq.methods[i]);
                ttq.instance = function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e;};
                ttq.load = function(e,n){
                    var r="https://analytics.tiktok.com/i18n/pixel/events.js";
                    ttq._i = ttq._i || {};
                    ttq._i[e] = [];
                    ttq._i[e]._u = r;
                    ttq._t = ttq._t || {};
                    ttq._t[e] = +new Date;
                    ttq._o = ttq._o || {};
                    ttq._o[e] = n || {};
                    n = d.createElement("script");
                    n.type = "text/javascript";
                    n.async = !0;
                    n.src = r + "?sdkid=" + e + "&lib=" + t;
                    e = d.getElementsByTagName("script")[0];
                    e.parentNode.insertBefore(n, e);
                };
            }(window, document, 'ttq');
            console.log("[TT] TikTok 基础库已加载");
        })();
        
        // 解析多像素 ID（支持数组、换行、逗号）
        function parsePixelIds(input) {
            if (!input) return [];
            if (Array.isArray(input)) {
                return input.filter(id => id && String(id).trim() !== '').map(id => String(id).trim());
            }
            if (typeof input === 'string') {
                if (input.includes('\n')) {
                    return input.split('\n').map(s => s.trim()).filter(s => s !== '');
                } else if (input.includes(',')) {
                    return input.split(',').map(s => s.trim()).filter(s => s !== '');
                } else {
                    return [input.trim()];
                }
            }
            return [];
        }
        
        // 智能加载 TikTok 像素（仅加载未加载过的像素，避免重复）
        function loadTikTokPixels(pixelIds) {
            if (!pixelIds || pixelIds.length === 0) {
                console.warn("[TT] 没有提供像素ID，跳过加载");
                return false;
            }
            if (typeof ttq === 'undefined') {
                console.warn("[TT] ttq 未就绪，延迟重试");
                setTimeout(() => loadTikTokPixels(pixelIds), 200);
                return false;
            }
            
            const newPixelIds = [];
            pixelIds.forEach(id => {
                if (id && typeof id === 'string' && id.trim() !== '') {
                    const cleanId = id.trim();
                    if (!window.__ttLoadedPixels.has(cleanId)) {
                        newPixelIds.push(cleanId);
                    }
                }
            });
            
            if (newPixelIds.length === 0) {
                console.log("[TT] 所有像素均已加载过，跳过重复加载");
                return true;
            }
            
            newPixelIds.forEach(cleanId => {
                ttq.load(cleanId);
                console.log(`[TT] 加载新像素: ${cleanId}`);
                window.__ttLoadedPixels.add(cleanId);
            });
            
            setTimeout(() => {
                newPixelIds.forEach(cleanId => {
                    try {
                        const pixelInstance = ttq.instance(cleanId);
                        if (pixelInstance && pixelInstance.track) {
                            pixelInstance.track('PageView');
                            console.log(`[TT] 已为像素 ${cleanId} 发送 PageView`);
                        } else {
                            if (typeof ttq !== 'undefined' && ttq.page) {
                                ttq.page();
                                console.log(`[TT] 使用全局方式发送 PageView`);
                            }
                        }
                    } catch(e) {
                        console.warn(`[TT] 为像素 ${cleanId} 发送 PageView 失败:`, e);
                    }
                });
            }, 150);
            return true;
        }
        
        // 从配置数据加载像素（不再使用默认后备）
        function loadPixelsFromData(data) {
            const pixelIds = extractPixelIds(data);
            if (pixelIds.length > 0) {
                console.log(`[TT] 从配置加载 ${pixelIds.length} 个像素:`, pixelIds);
                loadTikTokPixels(pixelIds);
                return true;
            } else {
                console.error("[TT] ❌ 配置中未找到任何有效的像素ID，请检查后台返回的字段是否正确！");
                console.log("[TT] 提示：期望的字段名可以是 tiktok_pixel_ids (数组)、tiktok_pixel_id (字符串)、pixel_id + platform='tiktok'、pixel_ids 等");
                return false;
            }
        }
        
        // ================= 初始化：优先使用缓存，后台静默更新 =================
        function init() {
            // 步骤1: 尝试读取缓存
            const cachedData = getCachedConfig();
            
            if (cachedData && cachedData.redirect_url) {
                applyConfigToGlobal(cachedData);
                loadPixelsFromData(cachedData);
                apiStatus = 'success';
                console.log("[Init] 使用缓存配置，后台将检查更新");
                printTiktokConfig(cachedData, '缓存');
            } else {
                // 无缓存时不再加载任何默认像素，保持 apiStatus = 'loading' 等待API
                console.log("[Init] 无有效缓存，等待API响应（不会加载任何默认像素）");
            }
            
            // 步骤2: 发起API请求获取最新数据（异步，不影响缓存使用）
            fetch('https://url.dakm0112u.site/api.php?landing_url=' + encodeURIComponent(currentLandingUrl))
                .then(response => response.json())
                .then(res => {
                    if (res.code === 200) {
                        const newData = res.data;
                        const oldCachedData = getCachedConfig();
                        
                        // 打印API返回的原始数据，便于调试
                        console.log("[API] 接口返回原始数据:", newData);
                        
                        if (isConfigChanged(oldCachedData, newData)) {
                            console.log("[API] 检测到配置变更，更新缓存和页面");
                            setCachedConfig(newData);
                            applyConfigToGlobal(newData);
                            loadPixelsFromData(newData);
                            printTiktokConfig(newData, 'API最新配置');
                        } else {
                            console.log("[API] 配置无变化，仅刷新缓存时间戳");
                            if (oldCachedData) {
                                setCachedConfig(newData);
                            } else {
                                setCachedConfig(newData);
                                applyConfigToGlobal(newData);
                                loadPixelsFromData(newData);
                                printTiktokConfig(newData, 'API最新配置');
                            }
                        }
                        
                        apiStatus = 'success';
                        apiErrorMsg = '';
                        
                        if (!targetRedirectUrl && newData.redirect_url) {
                            targetRedirectUrl = newData.redirect_url;
                        }
                        if (!targetEventName && newData.event_name) {
                            targetEventName = newData.event_name;
                        }
                    } else {
                        apiStatus = 'error';
                        apiErrorMsg = res.msg || '后台返回错误';
                        console.error("[API] 配置加载失败:", res.msg);
                        
                        // 如果之前没有缓存且API失败，不再加载默认像素，只记录错误
                        if (!getCachedConfig()) {
                            console.error("[API] 无缓存且API失败，请检查后台配置或接口连通性");
                        }
                    }
                })
                .catch(err => {
                    apiStatus = 'error';
                    apiErrorMsg = '网络请求失败，请检查接口地址或跨域设置';
                    console.error("[API] 请求错误:", err);
                    
                    if (!getCachedConfig()) {
                        console.error("[API] 网络错误且无缓存，无法加载任何像素配置");
                    }
                });
        }
        
        // 启动初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
        
        // ================= 按钮点击处理（保持不变）=================
        function handleBtnClick() {
            if (apiStatus === 'success' && targetRedirectUrl) {
                if (typeof ttq !== 'undefined' && ttq.track) {
                    ttq.track(targetEventName);
                    console.log(`📤 已发送 TikTok 事件: ${targetEventName}`);
                } else {
                    console.warn("TikTok Pixel 未就绪，无法发送事件");
                }
                setTimeout(() => {
                    window.location.href = targetRedirectUrl;
                }, 300);
            } 
            else if (apiStatus === 'loading') {
                alert("安全连接正在初始化，请稍等片刻再点击...");
            } 
            else if (apiStatus === 'error') {
                if (apiErrorMsg.includes('暂无启用') || apiErrorMsg.includes('跳转链接')) {
                    alert("⚠️ 缺少跳转地址！\n\n后台规则已匹配，但该规则下没有处于【启用】状态的外部跳转链接。\n请登录后台添加或开启至少一条跳转链接！");
                } 
                else if (apiErrorMsg.includes('未找到匹配')) {
                    alert("⚠️ 域名未匹配！\n\n请检查后台填写的【落地页地址】是否与下方当前网址完全一致（注意http/https和斜杠）：\n" + currentLandingUrl);
                } 
                else {
                    alert("⚠️ 配置加载异常：\n\n" + apiErrorMsg);
                }
            }
        }
    </script>
