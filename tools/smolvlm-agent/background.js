// Background service worker for SmolVLM Browser Extension

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('SmolVLM Agent Extension installed');
    
    // Set default storage values
    chrome.storage.local.set({
        apiKey: '',
        preferredModel: 'smolvlm-instruct',
        memories: [],
        settings: {
            autoAnalyze: false,
            saveHistory: true,
            maxMemories: 100
        }
    });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'quick_action') {
        // Process quick actions
        processQuickAction(request)
            .then(result => sendResponse({ result }))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Keep channel open for async response
    }
    
    if (request.action === 'analyze_url') {
        // Fetch and analyze URL content
        fetchAndAnalyze(request.url)
            .then(result => sendResponse({ result }))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
    
    if (request.action === 'save_memory') {
        // Save conversation to memory
        saveToMemory(request.memory)
            .then(() => sendResponse({ status: 'saved' }))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
});

// Process quick actions using the model
async function processQuickAction(request) {
    const { type, prompt, content, url, title } = request;
    
    // Get API key from storage
    const storage = await chrome.storage.local.get(['apiKey', 'preferredModel']);
    
    if (!storage.apiKey) {
        // Try to use WebLLM if no API key
        return processWithWebLLM(prompt, content);
    }
    
    // Use external API (OpenAI, Anthropic, etc.)
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${storage.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: `You are analyzing web content from: ${title} (${url})`
                    },
                    {
                        role: 'user',
                        content: `${prompt}\n\nContent:\n${content?.substring(0, 4000)}`
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Fallback to WebLLM for local processing
async function processWithWebLLM(prompt, content) {
    // This would integrate with WebLLM when available
    // For now, return a placeholder
    return `Local processing not available. Please configure an API key or open the main agent interface for WebLLM support.`;
}

// Fetch and analyze webpage content
async function fetchAndAnalyze(url) {
    try {
        // Use fetch with CORS proxy if needed
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        // Extract text content (simplified)
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        const textContent = doc.body?.innerText || '';
        
        return {
            url: url,
            title: doc.title || 'Untitled',
            content: textContent.substring(0, 5000),
            metadata: {
                fetchedAt: new Date().toISOString(),
                contentLength: textContent.length
            }
        };
    } catch (error) {
        console.error('Fetch failed:', error);
        throw error;
    }
}

// Save conversation to memory
async function saveToMemory(memory) {
    const storage = await chrome.storage.local.get(['memories', 'settings']);
    const memories = storage.memories || [];
    const settings = storage.settings || {};
    
    // Add new memory
    memories.push({
        ...memory,
        id: Date.now(),
        savedAt: new Date().toISOString()
    });
    
    // Limit number of memories
    if (memories.length > (settings.maxMemories || 100)) {
        memories.shift(); // Remove oldest
    }
    
    // Save back to storage
    await chrome.storage.local.set({ memories });
}

// Handle context menu actions
chrome.runtime.onInstalled.addListener(() => {
    // Create context menu items
    chrome.contextMenus.create({
        id: 'analyze-selection',
        title: 'Analyze with SmolVLM',
        contexts: ['selection']
    });
    
    chrome.contextMenus.create({
        id: 'analyze-image',
        title: 'Analyze image with SmolVLM',
        contexts: ['image']
    });
    
    chrome.contextMenus.create({
        id: 'analyze-link',
        title: 'Analyze link with SmolVLM',
        contexts: ['link']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'analyze-selection') {
        // Analyze selected text
        chrome.tabs.sendMessage(tab.id, {
            action: 'analyze_selection',
            text: info.selectionText
        });
    } else if (info.menuItemId === 'analyze-image') {
        // Analyze image
        chrome.storage.local.set({ 
            imageToAnalyze: info.srcUrl 
        }, () => {
            chrome.tabs.create({ 
                url: chrome.runtime.getURL('index.html#image=' + encodeURIComponent(info.srcUrl))
            });
        });
    } else if (info.menuItemId === 'analyze-link') {
        // Analyze linked page
        fetchAndAnalyze(info.linkUrl).then(result => {
            chrome.storage.local.set({ 
                linkAnalysis: result 
            }, () => {
                chrome.tabs.create({ 
                    url: chrome.runtime.getURL('index.html#link=' + encodeURIComponent(info.linkUrl))
                });
            });
        });
    }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-agent') {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    } else if (command === 'quick-analyze') {
        // Quick analyze current page
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'quick_analyze' });
            }
        });
    }
});