// 获取视频链接的函数
async function getVideoLinks(minLikes = 0) {
    // 先滚动到底部加载所有视频
    await scrollToBottom();
    
    // 查找所有视频链接元素
    const videoElements = document.querySelectorAll('a.uz1VJwFY');
    const links = [];
    
    // 遍历所有视频元素
    videoElements.forEach(element => {
        // 获取点赞数
        const likeElement = element.querySelector('.BgCg_ebQ');
        const likeCount = likeElement ? parseLikeCount(likeElement.textContent) : 0;
        
        // 如果点赞数大于最小值，添加链接
        if (likeCount >= minLikes) {
            const href = element.getAttribute('href');
            if (href) {
                // 构建完整的视频链接
                const fullLink = 'https://www.douyin.com' + href;
                links.push({
                    url: fullLink,
                    likes: likeCount
                });
            }
        }
    });
    
    return links;
}

// 解析点赞数文本
function parseLikeCount(text) {
    // 移除所有空格
    text = text.trim();
    
    // 处理带单位的数字
    if (text.includes('w') || text.includes('W')) {
        return parseFloat(text) * 10000;
    } else if (text.includes('k') || text.includes('K')) {
        return parseFloat(text) * 1000;
    }
    
    // 直接返回数字
    return parseInt(text) || 0;
}

// 滚动到底部的函数
async function scrollToBottom() {
    return new Promise((resolve) => {
        // 记录上一次内容高度
        let lastHeight = document.documentElement.scrollHeight;
        let unchanged = 0; // 记录高度未变化的次数
        let maxAttempts = 50; // 最大尝试次数
        let attempts = 0; // 当前尝试次数
        
        // 定时滚动
        const timer = setInterval(() => {
            attempts++;
            
            // 尝试获取不同的滚动容器
            const scrollContainers = [
                document.querySelector('.EZC0YBrG'),
                document.querySelector('.MFQG0LVD'),
                document.querySelector('[data-e2e="scroll-content"]'),
                document.querySelector('[data-e2e="user-post-list"]'),
                document.documentElement
            ];
            
            // 找到第一个有效的滚动容器
            const scrollContainer = scrollContainers.find(container => container);
            
            if (scrollContainer) {
                // 计算滚动距离
                const scrollDistance = 2000; // 每次滚动2000像素
                const currentScroll = scrollContainer.scrollTop || window.pageYOffset;
                const targetScroll = currentScroll + scrollDistance;
                
                // 执行滚动
                if (scrollContainer === document.documentElement) {
                    window.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                } else {
                    scrollContainer.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                }
                
                // 等待内容加载
                setTimeout(() => {
                    // 获取新的内容高度
                    const newHeight = scrollContainer.scrollHeight;
                    
                    // 如果高度没有变化或达到最大尝试次数
                    if (newHeight === lastHeight || attempts >= maxAttempts) {
                        unchanged++;
                        // 如果连续3次高度未变化，认为已到达底部
                        if (unchanged >= 3 || attempts >= maxAttempts) {
                            clearInterval(timer);
                            // 滚动回顶部
                            if (scrollContainer === document.documentElement) {
                                window.scrollTo({top: 0, behavior: 'smooth'});
                            } else {
                                scrollContainer.scrollTo({top: 0, behavior: 'smooth'});
                            }
                            resolve();
                        }
                    } else {
                        // 高度发生变化，重置计数
                        unchanged = 0;
                        lastHeight = newHeight;
                    }
                    
                    // 更新加载进度
                    const progress = Math.min((attempts / maxAttempts) * 100, 100);
                    chrome.runtime.sendMessage({
                        action: 'scrollProgress',
                        progress: Math.round(progress)
                    });
                    
                }, 500); // 等待0.5秒检查高度变化
            } else {
                // 如果找不到任何滚动容器，报告错误
                clearInterval(timer);
                chrome.runtime.sendMessage({
                    action: 'error',
                    message: '无法找到可滚动的容器'
                });
                resolve();
            }
        }, 800); // 每0.8秒滚动一次
    });
}

// 添加一个标志位来防止重复执行
let isProcessing = false;

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getLinks' && !isProcessing) {
        // 设置处理标志
        isProcessing = true;
        
        // 显示加载提示
        sendResponse({status: 'loading'});
        
        // 获取链接
        getVideoLinks(request.minLikes).then(links => {
            // 发送结果
            chrome.runtime.sendMessage({
                action: 'linksReady',
                links: links
            });
            // 重置处理标志
            isProcessing = false;
        }).catch(error => {
            // 发送错误信息
            chrome.runtime.sendMessage({
                action: 'error',
                message: '获取链接失败'
            });
            // 重置处理标志
            isProcessing = false;
        });
    }
    return true; // 保持消息通道开启
}); 