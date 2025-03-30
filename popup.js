// 存储获取到的链接
let videoLinks = [];
// 添加处理状态标志
let isProcessing = false;

// 获取链接按钮点击事件
document.getElementById('getLinks').addEventListener('click', async () => {
    // 如果正在处理中，直接返回
    if (isProcessing) return;
    
    // 设置处理状态
    isProcessing = true;
    
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    // 获取最小点赞数
    const minLikes = parseInt(document.getElementById('minLikes').value) || 0;
    
    // 禁用所有按钮
    document.getElementById('getLinks').disabled = true;
    document.getElementById('copyLinks').disabled = true;
    document.getElementById('downloadLinks').disabled = true;
    
    showMessage('正在获取视频链接，请稍候...');
    
    try {
        // 向content script发送消息
        chrome.tabs.sendMessage(tab.id, {
            action: 'getLinks',
            minLikes: minLikes
        });
    } catch (error) {
        handleError('获取链接失败，请刷新页面重试');
    }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'linksReady') {
        // 重置处理状态
        isProcessing = false;
        
        // 启用所有按钮
        document.getElementById('getLinks').disabled = false;
        document.getElementById('copyLinks').disabled = false;
        document.getElementById('downloadLinks').disabled = false;
        
        videoLinks = request.links;
        showMessage(`成功获取 ${videoLinks.length} 个视频链接！`);
        displayLinks(videoLinks);
    } else if (request.action === 'scrollProgress') {
        showMessage(`正在获取视频链接，已完成 ${request.progress}%`);
    } else if (request.action === 'error') {
        handleError(request.message);
    }
});

// 错误处理函数
function handleError(message) {
    isProcessing = false;
    document.getElementById('getLinks').disabled = false;
    document.getElementById('copyLinks').disabled = true;
    document.getElementById('downloadLinks').disabled = true;
    showMessage(`错误：${message}`);
}

// 复制到剪贴板
document.getElementById('copyLinks').addEventListener('click', () => {
    const text = videoLinks.map(item => item.url).join('\n');
    navigator.clipboard.writeText(text);
    showMessage('已复制到剪贴板！');
});

// 下载文本文件
document.getElementById('downloadLinks').addEventListener('click', () => {
    const text = videoLinks.map(item => 
        `${item.url} (${item.likes}个赞)`
    ).join('\n');
    
    const blob = new Blob([text], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
        url: url,
        filename: '抖音视频链接.txt'
    });
});

// 显示链接列表
function displayLinks(links) {
    const resultDiv = document.getElementById('result');
    if (links.length > 0) {
        const linksHtml = links.map((item, index) => `
            <div class="link-item">
                ${index + 1}. ${item.url}
                <span class="like-count">${item.likes}个赞</span>
            </div>
        `).join('');
        
        resultDiv.innerHTML = `
            <div class="stats">共获取到 ${links.length} 个视频链接</div>
            <div class="links-container">${linksHtml}</div>
        `;
    } else {
        resultDiv.innerHTML = '未找到符合条件的视频链接';
    }
}

// 显示消息
function showMessage(msg) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `<div class="message">${msg}</div>`;
} 