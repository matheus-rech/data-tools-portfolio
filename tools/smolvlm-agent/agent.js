// SmolVLM Browser Agent - WebLLM Integration
// Runs vision-language models directly in the browser using WebGPU

class SmolVLMAgent {
    constructor() {
        this.currentModel = null;
        this.modelEngine = null;
        this.chatHistory = [];
        this.memories = [];
        this.isModelLoading = false;
        this.initializeUI();
        this.loadMemories();
        this.checkWebGPUSupport();
    }

    async checkWebGPUSupport() {
        const statusEl = document.getElementById('status');
        const gpuStatus = document.getElementById('gpu-status');
        
        if (!navigator.gpu) {
            statusEl.textContent = 'WebGPU not supported in this browser';
            statusEl.className = 'status error';
            gpuStatus.textContent = 'WebGPU: Not Available';
            gpuStatus.className = 'error';
            return false;
        }
        
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                throw new Error('No GPU adapter found');
            }
            
            gpuStatus.textContent = 'WebGPU: Ready';
            gpuStatus.className = 'success';
            statusEl.textContent = 'Ready to load model';
            statusEl.className = 'status success';
            return true;
        } catch (error) {
            gpuStatus.textContent = 'WebGPU: Error';
            gpuStatus.className = 'error';
            statusEl.textContent = `GPU Error: ${error.message}`;
            statusEl.className = 'status error';
            return false;
        }
    }

    initializeUI() {
        // Model selection
        const modelSelect = document.getElementById('model-select');
        const loadModelBtn = document.getElementById('load-model');
        
        loadModelBtn.addEventListener('click', () => this.loadModel());
        
        // Chat functionality
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (message) {
                await this.sendMessage(message);
                chatInput.value = '';
            }
        });
        
        // Vision input
        const imageInput = document.getElementById('image-input');
        const screenshotBtn = document.getElementById('screenshot-btn');
        const clearImageBtn = document.getElementById('clear-image');
        
        imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        screenshotBtn.addEventListener('click', () => this.captureScreenshot());
        clearImageBtn.addEventListener('click', () => this.clearImage());
        
        // Memory management
        const saveMemoryBtn = document.getElementById('save-memory');
        const clearMemoriesBtn = document.getElementById('clear-memories');
        const exportMemoriesBtn = document.getElementById('export-memories');
        
        saveMemoryBtn.addEventListener('click', () => this.saveCurrentConversation());
        clearMemoriesBtn.addEventListener('click', () => this.clearMemories());
        exportMemoriesBtn.addEventListener('click', () => this.exportMemories());
    }

    async loadModel() {
        const modelSelect = document.getElementById('model-select');
        const selectedModel = modelSelect.value;
        const statusEl = document.getElementById('status');
        const modelStatus = document.getElementById('model-status');
        
        if (this.isModelLoading) {
            statusEl.textContent = 'Model is already loading...';
            return;
        }
        
        this.isModelLoading = true;
        statusEl.textContent = `Loading ${selectedModel}...`;
        statusEl.className = 'status loading';
        modelStatus.textContent = 'Model: Loading...';
        modelStatus.className = 'loading';
        
        try {
            // Import WebLLM
            const webllm = await import('https://esm.run/@mlc-ai/web-llm');
            
            // Model configurations for vision-language models
            const modelConfigs = {
                'smolvlm2-2.2b': {
                    model_id: 'HuggingFaceTB/SmolVLM2-2.2B-Instruct',
                    model_lib: 'https://huggingface.co/mlc-ai/SmolVLM2-2.2B-Instruct-q4f16_1-MLC/resolve/main/',
                    vram_required_MB: 2200,
                    features: ['video', 'multi-image', 'text-in-image']
                },
                'smolvlm2-500m': {
                    model_id: 'HuggingFaceTB/SmolVLM2-500M-Instruct',
                    model_lib: 'https://huggingface.co/mlc-ai/SmolVLM2-500M-Instruct-q4f16_1-MLC/resolve/main/',
                    vram_required_MB: 500,
                    features: ['video', 'multi-image', 'efficient']
                },
                'smolvlm2-256m': {
                    model_id: 'HuggingFaceTB/SmolVLM2-256M-Instruct',
                    model_lib: 'https://huggingface.co/mlc-ai/SmolVLM2-256M-Instruct-q4f16_1-MLC/resolve/main/',
                    vram_required_MB: 256,
                    features: ['ultra-light', 'mobile-ready']
                },
                'smolvlm-instruct': {
                    model_id: 'HuggingFaceTB/SmolVLM-Instruct',
                    model_lib: 'https://huggingface.co/mlc-ai/SmolVLM-Instruct-q4f16_1-MLC/resolve/main/',
                    vram_required_MB: 2000,
                    features: ['legacy', 'stable']
                },
                'tinyllama': {
                    model_id: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
                    model_lib: 'https://huggingface.co/mlc-ai/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC/resolve/main/',
                    vram_required_MB: 1000,
                    features: ['text-only']
                },
                'phi-3-mini': {
                    model_id: 'microsoft/Phi-3-mini-4k-instruct',
                    model_lib: 'https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC/resolve/main/',
                    vram_required_MB: 3000,
                    features: ['reasoning', 'math']
                },
                'gemma-2b': {
                    model_id: 'google/gemma-2b-it',
                    model_lib: 'https://huggingface.co/mlc-ai/gemma-2b-it-q4f16_1-MLC/resolve/main/',
                    vram_required_MB: 2500,
                    features: ['multilingual']
                }
            };
            
            const config = modelConfigs[selectedModel];
            if (!config) {
                throw new Error(`Model ${selectedModel} not configured`);
            }
            
            // Initialize WebLLM engine
            this.modelEngine = new webllm.MLCEngine();
            
            // Load model with progress callback
            await this.modelEngine.reload(config.model_id, {
                model_lib: config.model_lib,
                temperature: 0.7,
                top_p: 0.95,
                initProgressCallback: (progress) => {
                    const percentage = Math.round(progress.progress * 100);
                    statusEl.textContent = `Loading ${selectedModel}: ${percentage}%`;
                }
            });
            
            this.currentModel = selectedModel;
            statusEl.textContent = `Model ${selectedModel} loaded successfully`;
            statusEl.className = 'status success';
            modelStatus.textContent = `Model: ${selectedModel}`;
            modelStatus.className = 'success';
            
            // Enable chat input
            document.getElementById('chat-input').disabled = false;
            document.getElementById('send-btn').disabled = false;
            
            this.addMessage('system', `🤖 ${selectedModel} is ready! You can now chat or upload images for analysis.`);
            
        } catch (error) {
            console.error('Model loading error:', error);
            statusEl.textContent = `Failed to load model: ${error.message}`;
            statusEl.className = 'status error';
            modelStatus.textContent = 'Model: Not Loaded';
            modelStatus.className = 'error';
            
            // Fallback to API-based approach if WebLLM fails
            this.addMessage('system', '⚠️ WebLLM loading failed. Falling back to API mode. You can still use the chat with external APIs.');
        } finally {
            this.isModelLoading = false;
        }
    }

    async sendMessage(message, imageData = null) {
        if (!message.trim()) return;
        
        // Add user message to chat
        this.addMessage('user', message, imageData);
        
        // Check if we have a loaded model
        if (!this.modelEngine && !this.currentModel) {
            // Fallback to using external API or show instructions
            this.addMessage('assistant', 'Please load a model first or configure an external API.');
            return;
        }
        
        try {
            // Prepare the prompt with vision context if image is provided
            let fullPrompt = message;
            if (imageData) {
                fullPrompt = `[Image provided]\n${message}`;
            }
            
            // Add chat history context
            const context = this.getChatContext();
            fullPrompt = context + '\nUser: ' + fullPrompt + '\nAssistant:';
            
            // Generate response
            let response = '';
            
            if (this.modelEngine) {
                // Use WebLLM
                const completion = await this.modelEngine.chat.completions.create({
                    messages: [
                        { role: "system", content: "You are a helpful AI assistant with vision capabilities." },
                        { role: "user", content: fullPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 500,
                });
                
                response = completion.choices[0].message.content;
            } else {
                // Fallback to API call
                response = await this.callExternalAPI(fullPrompt, imageData);
            }
            
            this.addMessage('assistant', response);
            
        } catch (error) {
            console.error('Message processing error:', error);
            this.addMessage('assistant', `Error: ${error.message}`);
        }
    }

    async callExternalAPI(prompt, imageData) {
        // This is a fallback for when WebLLM doesn't work
        // You can configure this to use OpenAI, Anthropic, or other APIs
        
        const apiKey = localStorage.getItem('api_key');
        if (!apiKey) {
            return 'Please configure your API key in settings to use external models.';
        }
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4-vision-preview',
                    messages: [
                        {
                            role: 'user',
                            content: imageData ? [
                                { type: 'text', text: prompt },
                                { type: 'image_url', image_url: { url: imageData } }
                            ] : prompt
                        }
                    ],
                    max_tokens: 500
                })
            });
            
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            return `API Error: ${error.message}`;
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            this.displayImage(imageData);
            
            // Auto-analyze if model is loaded
            if (this.currentModel) {
                this.sendMessage('What do you see in this image?', imageData);
            }
        };
        reader.readAsDataURL(file);
    }

    displayImage(imageData) {
        const imagePreview = document.getElementById('image-preview');
        imagePreview.innerHTML = `<img src="${imageData}" alt="Uploaded image">`;
        document.getElementById('clear-image').style.display = 'block';
    }

    clearImage() {
        document.getElementById('image-preview').innerHTML = '';
        document.getElementById('clear-image').style.display = 'none';
        document.getElementById('image-input').value = '';
    }

    async captureScreenshot() {
        try {
            // Check if we're in a browser extension context
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                // Browser extension screenshot
                chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
                    this.displayImage(dataUrl);
                    this.sendMessage('Analyze this screenshot', dataUrl);
                });
            } else if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                // Web API screen capture
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { mediaSource: 'screen' }
                });
                
                const video = document.createElement('video');
                video.srcObject = stream;
                video.play();
                
                video.onloadedmetadata = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    
                    const dataUrl = canvas.toDataURL('image/png');
                    this.displayImage(dataUrl);
                    
                    // Stop the stream
                    stream.getTracks().forEach(track => track.stop());
                    
                    this.sendMessage('Analyze this screenshot', dataUrl);
                };
            } else {
                throw new Error('Screenshot capture not available in this context');
            }
        } catch (error) {
            console.error('Screenshot capture error:', error);
            this.addMessage('system', `Screenshot error: ${error.message}`);
        }
    }

    addMessage(role, content, imageData = null) {
        const messagesDiv = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        let messageContent = `<strong>${role === 'user' ? 'You' : role === 'assistant' ? 'AI' : 'System'}:</strong> `;
        
        if (imageData && role === 'user') {
            messageContent += `<br><img src="${imageData}" style="max-width: 200px; max-height: 200px; margin: 10px 0;">`;
        }
        
        messageContent += `<br>${this.formatMessage(content)}`;
        messageDiv.innerHTML = messageContent;
        
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Add to chat history
        this.chatHistory.push({ role, content, imageData, timestamp: new Date() });
    }

    formatMessage(content) {
        // Basic markdown formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    getChatContext(maxMessages = 5) {
        // Get recent chat history for context
        const recentMessages = this.chatHistory.slice(-maxMessages);
        return recentMessages
            .filter(msg => msg.role !== 'system')
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');
    }

    saveCurrentConversation() {
        if (this.chatHistory.length === 0) {
            alert('No conversation to save');
            return;
        }
        
        const memory = {
            id: Date.now(),
            date: new Date().toISOString(),
            model: this.currentModel || 'unknown',
            messages: this.chatHistory,
            summary: this.generateSummary()
        };
        
        this.memories.push(memory);
        this.saveMemories();
        this.updateMemoryList();
        
        this.addMessage('system', '💾 Conversation saved to memory');
    }

    generateSummary() {
        // Simple summary generation
        const messages = this.chatHistory.filter(m => m.role !== 'system');
        if (messages.length === 0) return 'Empty conversation';
        
        const firstUser = messages.find(m => m.role === 'user');
        const firstAssistant = messages.find(m => m.role === 'assistant');
        
        return `${firstUser ? firstUser.content.substring(0, 50) : 'Chat'} - ${messages.length} messages`;
    }

    loadMemories() {
        const saved = localStorage.getItem('smolvlm_memories');
        if (saved) {
            this.memories = JSON.parse(saved);
            this.updateMemoryList();
        }
    }

    saveMemories() {
        localStorage.setItem('smolvlm_memories', JSON.stringify(this.memories));
    }

    updateMemoryList() {
        const memoryList = document.getElementById('memory-list');
        memoryList.innerHTML = '';
        
        this.memories.forEach((memory, index) => {
            const memoryDiv = document.createElement('div');
            memoryDiv.className = 'memory-item';
            memoryDiv.innerHTML = `
                <strong>${new Date(memory.date).toLocaleDateString()}</strong><br>
                ${memory.summary}<br>
                <button onclick="agent.loadMemory(${index})">Load</button>
                <button onclick="agent.deleteMemory(${index})">Delete</button>
            `;
            memoryList.appendChild(memoryDiv);
        });
    }

    loadMemory(index) {
        const memory = this.memories[index];
        if (!memory) return;
        
        // Clear current chat
        document.getElementById('messages').innerHTML = '';
        this.chatHistory = [];
        
        // Load saved messages
        memory.messages.forEach(msg => {
            this.addMessage(msg.role, msg.content, msg.imageData);
        });
        
        this.addMessage('system', '📂 Memory loaded');
    }

    deleteMemory(index) {
        if (confirm('Delete this memory?')) {
            this.memories.splice(index, 1);
            this.saveMemories();
            this.updateMemoryList();
        }
    }

    clearMemories() {
        if (confirm('Clear all memories? This cannot be undone.')) {
            this.memories = [];
            this.saveMemories();
            this.updateMemoryList();
            this.addMessage('system', '🗑️ All memories cleared');
        }
    }

    exportMemories() {
        const dataStr = JSON.stringify(this.memories, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportLink = document.createElement('a');
        exportLink.setAttribute('href', dataUri);
        exportLink.setAttribute('download', `smolvlm_memories_${Date.now()}.json`);
        document.body.appendChild(exportLink);
        exportLink.click();
        document.body.removeChild(exportLink);
        
        this.addMessage('system', '📥 Memories exported');
    }
}

// Initialize the agent when the page loads
let agent;
document.addEventListener('DOMContentLoaded', () => {
    agent = new SmolVLMAgent();
});

// Browser extension API integration
if (typeof chrome !== 'undefined' && chrome.runtime) {
    // Listen for messages from extension popup or background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'analyze_page') {
            // Analyze current page
            agent.sendMessage(`Analyze this webpage: ${request.url}`);
        } else if (request.action === 'capture_screenshot') {
            // Capture and analyze screenshot
            agent.captureScreenshot();
        }
        sendResponse({ status: 'received' });
    });
}