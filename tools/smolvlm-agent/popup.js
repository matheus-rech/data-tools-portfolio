// Popup script for SmolVLM Browser Extension

document.addEventListener('DOMContentLoaded', () => {
    const status = document.getElementById('status');
    
    // Open main agent interface
    document.getElementById('open-agent').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
        window.close();
    });
    
    // Analyze current page
    document.getElementById('analyze-page').addEventListener('click', async () => {
        status.textContent = 'Analyzing page...';
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Send message to content script
        chrome.tabs.sendMessage(tab.id, {
            action: 'analyze_page',
            url: tab.url,
            title: tab.title
        }, (response) => {
            if (response && response.status === 'success') {
                status.textContent = 'Page analyzed!';
                // Open agent interface with context
                chrome.tabs.create({ 
                    url: chrome.runtime.getURL('index.html#analyze=' + encodeURIComponent(tab.url))
                });
                window.close();
            } else {
                status.textContent = 'Analysis failed';
            }
        });
    });
    
    // Capture and analyze screenshot
    document.getElementById('capture-screenshot').addEventListener('click', () => {
        status.textContent = 'Capturing screenshot...';
        
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (dataUrl) {
                // Store screenshot and open agent
                chrome.storage.local.set({ 
                    screenshot: dataUrl,
                    timestamp: Date.now()
                }, () => {
                    status.textContent = 'Screenshot captured!';
                    chrome.tabs.create({ 
                        url: chrome.runtime.getURL('index.html#screenshot=true')
                    });
                    window.close();
                });
            } else {
                status.textContent = 'Screenshot failed';
            }
        });
    });
    
    // Quick action buttons
    const quickActions = {
        'summarize': 'Summarize the content of this page',
        'extract-data': 'Extract structured data from this page',
        'translate': 'Translate this page content',
        'explain': 'Explain the main concepts on this page'
    };
    
    Object.keys(quickActions).forEach(actionId => {
        document.getElementById(actionId).addEventListener('click', async () => {
            status.textContent = 'Processing...';
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Get page content
            chrome.tabs.sendMessage(tab.id, {
                action: 'get_content'
            }, (content) => {
                // Send to background script for processing
                chrome.runtime.sendMessage({
                    action: 'quick_action',
                    type: actionId,
                    prompt: quickActions[actionId],
                    content: content,
                    url: tab.url,
                    title: tab.title
                }, (response) => {
                    if (response && response.result) {
                        // Open agent with result
                        chrome.storage.local.set({ 
                            quickActionResult: response.result,
                            quickActionType: actionId
                        }, () => {
                            chrome.tabs.create({ 
                                url: chrome.runtime.getURL('index.html#action=' + actionId)
                            });
                            window.close();
                        });
                    } else {
                        status.textContent = 'Action failed';
                    }
                });
            });
        });
    });
});