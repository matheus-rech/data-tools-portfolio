// Content script for SmolVLM Browser Extension
// Runs on all web pages to enable interaction with the agent

// Listen for messages from popup and background scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyze_page') {
        // Analyze the current page
        const pageData = extractPageData();
        sendResponse({ status: 'success', data: pageData });
    } else if (request.action === 'get_content') {
        // Get page content for quick actions
        const content = extractPageContent();
        sendResponse(content);
    } else if (request.action === 'analyze_selection') {
        // Analyze selected text
        analyzeSelection(request.text);
        sendResponse({ status: 'success' });
    } else if (request.action === 'quick_analyze') {
        // Quick analyze with visual overlay
        performQuickAnalysis();
        sendResponse({ status: 'started' });
    }
    return true;
});

// Extract structured data from the page
function extractPageData() {
    return {
        url: window.location.href,
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        keywords: document.querySelector('meta[name="keywords"]')?.content || '',
        headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
            level: h.tagName,
            text: h.textContent.trim()
        })),
        images: Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt,
            width: img.width,
            height: img.height
        })).slice(0, 10), // Limit to 10 images
        links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
            href: a.href,
            text: a.textContent.trim()
        })).slice(0, 20), // Limit to 20 links
        metadata: {
            language: document.documentElement.lang || 'unknown',
            charset: document.characterSet,
            lastModified: document.lastModified,
            readyState: document.readyState
        }
    };
}

// Extract text content from the page
function extractPageContent() {
    // Get main content areas
    const contentSelectors = [
        'main', 'article', '[role="main"]', 
        '#content', '.content', '#main', '.main'
    ];
    
    let content = '';
    for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            content = element.innerText;
            break;
        }
    }
    
    // Fallback to body text
    if (!content) {
        content = document.body.innerText;
    }
    
    return {
        text: content.substring(0, 10000), // Limit to 10k chars
        title: document.title,
        url: window.location.href,
        selection: window.getSelection().toString()
    };
}

// Analyze selected text with visual feedback
function analyzeSelection(text) {
    // Create overlay to show analysis is happening
    const overlay = createAnalysisOverlay(text);
    document.body.appendChild(overlay);
    
    // Send to background for processing
    chrome.runtime.sendMessage({
        action: 'quick_action',
        type: 'analyze',
        prompt: `Analyze this text: ${text}`,
        content: text
    }, (response) => {
        if (response && response.result) {
            showAnalysisResult(response.result, overlay);
        } else {
            overlay.remove();
        }
    });
}

// Create visual overlay for analysis
function createAnalysisOverlay(text) {
    const overlay = document.createElement('div');
    overlay.id = 'smolvlm-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 350px;
        max-height: 500px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: slideIn 0.3s ease-out;
    `;
    
    overlay.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; font-size: 18px;">🤖 SmolVLM Analysis</h3>
            <button id="close-overlay" style="
                background: transparent;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            ">✕</button>
        </div>
        <div style="
            background: rgba(255,255,255,0.1);
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 15px;
            max-height: 100px;
            overflow-y: auto;
        ">
            <strong>Analyzing:</strong><br>
            ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}
        </div>
        <div id="analysis-result" style="
            background: rgba(0,0,0,0.2);
            padding: 10px;
            border-radius: 8px;
            min-height: 50px;
        ">
            <div style="text-align: center;">
                <div class="spinner" style="
                    border: 3px solid rgba(255,255,255,0.3);
                    border-top: 3px solid white;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                "></div>
                <p style="margin-top: 10px;">Processing...</p>
            </div>
        </div>
    `;
    
    // Add styles for animations
    if (!document.getElementById('smolvlm-styles')) {
        const style = document.createElement('style');
        style.id = 'smolvlm-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add close button handler
    setTimeout(() => {
        document.getElementById('close-overlay')?.addEventListener('click', () => {
            overlay.remove();
        });
    }, 100);
    
    return overlay;
}

// Show analysis result in overlay
function showAnalysisResult(result, overlay) {
    const resultDiv = overlay.querySelector('#analysis-result');
    if (resultDiv) {
        resultDiv.innerHTML = `
            <strong>Analysis Result:</strong><br>
            <div style="margin-top: 10px; line-height: 1.5;">
                ${result.replace(/\n/g, '<br>')}
            </div>
            <button id="copy-result" style="
                margin-top: 15px;
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                width: 100%;
            ">Copy Result</button>
        `;
        
        // Add copy button handler
        document.getElementById('copy-result')?.addEventListener('click', () => {
            navigator.clipboard.writeText(result).then(() => {
                const btn = document.getElementById('copy-result');
                btn.textContent = 'Copied!';
                setTimeout(() => {
                    btn.textContent = 'Copy Result';
                }, 2000);
            });
        });
    }
}

// Perform quick visual analysis of the page
function performQuickAnalysis() {
    // Highlight important elements
    const importantElements = document.querySelectorAll('h1, h2, h3, img, video, [role="main"]');
    
    importantElements.forEach((el, index) => {
        setTimeout(() => {
            const rect = el.getBoundingClientRect();
            const highlight = document.createElement('div');
            highlight.className = 'smolvlm-highlight';
            highlight.style.cssText = `
                position: fixed;
                top: ${rect.top}px;
                left: ${rect.left}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                border: 2px solid #667eea;
                background: rgba(102, 126, 234, 0.1);
                pointer-events: none;
                z-index: 99999;
                animation: pulse 2s ease-in-out;
            `;
            document.body.appendChild(highlight);
            
            // Remove after animation
            setTimeout(() => highlight.remove(), 2000);
        }, index * 100);
    });
    
    // Add pulse animation if not already added
    if (!document.getElementById('smolvlm-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'smolvlm-pulse-style';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 0; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.02); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Send page data for analysis
    const pageData = extractPageData();
    chrome.runtime.sendMessage({
        action: 'quick_action',
        type: 'full_analysis',
        prompt: 'Analyze this webpage structure and content',
        content: JSON.stringify(pageData)
    });
}

// Auto-inject analysis button on pages
function injectAnalysisButton() {
    // Only inject on certain pages or when enabled
    if (window.location.hostname.includes('github.com') || 
        window.location.hostname.includes('stackoverflow.com')) {
        
        const button = document.createElement('button');
        button.id = 'smolvlm-quick-analyze';
        button.innerHTML = '🤖';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 99998;
            transition: transform 0.3s;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
        
        button.addEventListener('click', () => {
            performQuickAnalysis();
        });
        
        document.body.appendChild(button);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAnalysisButton);
} else {
    injectAnalysisButton();
}