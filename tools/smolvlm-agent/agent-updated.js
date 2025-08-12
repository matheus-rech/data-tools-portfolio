class SmolVLMAgent {
    constructor() {
        this.engine = null;
        this.model = null;
        this.isModelLoading = false;
        this.currentImage = null;
        this.conversationHistory = [];
        this.memories = this.loadMemories();
        this.currentModelKey = null;
        
        // Model configurations for SmolVLM2
        this.modelConfigs = {
            'smolvlm2-2.2b': {
                model_id: 'HuggingFaceTB/SmolVLM2-2.2B-Instruct',
                model_lib: 'https://huggingface.co/mlc-ai/SmolVLM2-2.2B-Instruct-q4f16_1-MLC/resolve/main/',
                vram_required_MB: 2200,
                features: ['video', 'multi-image', 'text-in-image', 'math', 'diagrams']
            },
            'smolvlm2-500m': {
                model_id: 'HuggingFaceTB/SmolVLM2-500M-Instruct',
                model_lib: 'https://huggingface.co/mlc-ai/SmolVLM2-500M-Instruct-q4f16_1-MLC/resolve/main/',
                vram_required_MB: 500,
                features: ['video', 'multi-image', 'efficient', 'mobile-ready']
            },
            'smolvlm2-256m': {
                model_id: 'HuggingFaceTB/SmolVLM2-256M-Instruct',
                model_lib: 'https://huggingface.co/mlc-ai/SmolVLM2-256M-Instruct-q4f16_1-MLC/resolve/main/',
                vram_required_MB: 256,
                features: ['ultra-light', 'mobile-ready', 'edge-device']
            },
            'smolvlm': {
                model_id: 'HuggingFaceTB/SmolVLM-Instruct',
                model_lib: 'https://huggingface.co/mlc-ai/SmolVLM-Instruct-q4f16_1-MLC/resolve/main/',
                vram_required_MB: 2000,
                features: ['vision', 'text', 'image-understanding']
            },
            'tinyllama': {
                model_id: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
                model_lib: 'https://huggingface.co/mlc-ai/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC/resolve/main/',
                vram_required_MB: 1100,
                features: ['text-only', 'lightweight']
            },
            'phi3': {
                model_id: 'microsoft/Phi-3-mini-4k-instruct',
                model_lib: 'https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC/resolve/main/',
                vram_required_MB: 3800,
                features: ['text', 'reasoning', 'coding']
            },
            'gemma': {
                model_id: 'google/gemma-2b-it',
                model_lib: 'https://huggingface.co/mlc-ai/gemma-2b-it-q4f16_1-MLC/resolve/main/',
                vram_required_MB: 2000,
                features: ['text', 'instruction-following']
            }
        };
        
        this.initializeUI();
        this.checkWebGPUSupport();
    }

    async checkWebGPUSupport() {
        const statusEl = document.getElementById('status');
        if (!navigator.gpu) {
            statusEl.textContent = 'WebGPU not supported. Using fallback API.';
            statusEl.className = 'status error';
            return false;
        }
        
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            statusEl.textContent = 'No GPU adapter found. Using fallback API.';
            statusEl.className = 'status error';
            return false;
        }
        
        statusEl.textContent = 'WebGPU supported. Ready to load model.';
        statusEl.className = 'status success';
        return true;
    }

    initializeUI() {
        // Model selection with buttons
        const modelButtons = document.querySelectorAll('[data-model]');
        modelButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const modelKey = e.target.dataset.model;
                
                // Prevent loading if already loading
                if (this.isModelLoading) {
                    return;
                }
                
                // Remove active class from all buttons
                modelButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                
                // Load the selected model
                await this.loadModel(modelKey);
            });
        });
        
        // Chat functionality
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        
        if (chatForm) {
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const message = chatInput.value.trim();
                if (message) {
                    await this.sendMessage(message);
                    chatInput.value = '';
                }
            });
        }
        
        // Vision input
        const imageInput = document.getElementById('image-input');
        const screenshotBtn = document.getElementById('screenshot-btn');
        const clearImageBtn = document.getElementById('clear-image');
        
        if (imageInput) imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        if (screenshotBtn) screenshotBtn.addEventListener('click', () => this.captureScreenshot());
        if (clearImageBtn) clearImageBtn.addEventListener('click', () => this.clearImage());
        
        // Memory management
        const saveMemoryBtn = document.getElementById('save-memory');
        const clearMemoriesBtn = document.getElementById('clear-memories');
        const exportMemoriesBtn = document.getElementById('export-memories');
        
        if (saveMemoryBtn) saveMemoryBtn.addEventListener('click', () => this.saveCurrentConversation());
        if (clearMemoriesBtn) clearMemoriesBtn.addEventListener('click', () => this.clearMemories());
        if (exportMemoriesBtn) exportMemoriesBtn.addEventListener('click', () => this.exportMemories());
    }

    async loadModel(modelKey) {
        const statusEl = document.getElementById('status');
        const modelStatus = document.getElementById('model-status');
        
        if (!modelKey) {
            statusEl.textContent = 'No model selected';
            return;
        }
        
        const modelConfig = this.modelConfigs[modelKey];
        if (!modelConfig) {
            statusEl.textContent = `Unknown model: ${modelKey}`;
            statusEl.className = 'status error';
            return;
        }
        
        if (this.isModelLoading) {
            statusEl.textContent = 'Model is already loading...';
            return;
        }
        
        this.isModelLoading = true;
        this.currentModelKey = modelKey;
        
        statusEl.textContent = `Loading ${modelKey.toUpperCase()}...`;
        statusEl.className = 'status loading';
        
        if (modelStatus) {
            modelStatus.textContent = `Model: Loading ${modelKey}...`;
            modelStatus.className = 'loading';
        }
        
        try {
            // Check WebGPU support
            const hasWebGPU = await this.checkWebGPUSupport();
            
            if (hasWebGPU) {
                // Import WebLLM
                const webllm = await import('https://esm.run/@mlc-ai/web-llm');
                
                // Create engine config
                const engineConfig = {
                    initProgressCallback: (progress) => {
                        const percent = Math.round(progress.progress * 100);
                        statusEl.textContent = `Loading ${modelKey}: ${percent}%`;
                        
                        if (progress.text) {
                            console.log('Progress:', progress.text);
                        }
                    }
                };
                
                // Create or get engine
                if (!this.engine) {
                    this.engine = await webllm.CreateMLCEngine(
                        modelConfig.model_id,
                        engineConfig,
                        {
                            model_lib_url: modelConfig.model_lib,
                            temperature: 0.7,
                            top_p: 0.95
                        }
                    );
                } else {
                    await this.engine.reload(modelConfig.model_id);
                }
                
                this.model = modelConfig.model_id;
                
                statusEl.textContent = `${modelKey.toUpperCase()} loaded successfully!`;
                statusEl.className = 'status success';
                
                if (modelStatus) {
                    const features = modelConfig.features.join(', ');
                    modelStatus.textContent = `Model: ${modelKey} (${features})`;
                    modelStatus.className = 'loaded';
                }
                
                // Show model features
                this.displayModelFeatures(modelConfig.features);
                
            } else {
                // Fallback to API
                statusEl.textContent = `Using API fallback for ${modelKey}`;
                statusEl.className = 'status warning';
                this.model = 'api-fallback';
                
                if (modelStatus) {
                    modelStatus.textContent = `Model: ${modelKey} (API mode)`;
                    modelStatus.className = 'api-mode';
                }
            }
            
        } catch (error) {
            console.error('Failed to load model:', error);
            statusEl.textContent = `Failed to load ${modelKey}: ${error.message}`;
            statusEl.className = 'status error';
            
            if (modelStatus) {
                modelStatus.textContent = 'Model: Not loaded';
                modelStatus.className = 'error';
            }
        } finally {
            this.isModelLoading = false;
        }
    }

    displayModelFeatures(features) {
        const featuresEl = document.getElementById('model-features');
        if (featuresEl) {
            featuresEl.innerHTML = `
                <div class="features-list">
                    <h4>Model Capabilities:</h4>
                    <ul>
                        ${features.map(f => `<li>✓ ${f}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    }

    async sendMessage(message) {
        if (!this.model && !this.engine) {
            alert('Please load a model first');
            return;
        }
        
        const chatMessages = document.getElementById('chat-messages');
        
        // Add user message
        this.addMessageToChat('user', message);
        this.conversationHistory.push({ role: 'user', content: message });
        
        // Prepare context with image if available
        let fullMessage = message;
        if (this.currentImage) {
            fullMessage = `[Image attached]\n${message}`;
        }
        
        try {
            let response;
            
            if (this.engine) {
                // Use WebLLM
                const messages = [
                    { role: 'system', content: 'You are a helpful AI assistant with vision capabilities.' },
                    ...this.conversationHistory.slice(-10) // Keep last 10 messages for context
                ];
                
                if (this.currentImage) {
                    // Add image to the last user message
                    messages[messages.length - 1].images = [this.currentImage];
                }
                
                response = await this.engine.chat.completions.create({
                    messages,
                    temperature: 0.7,
                    max_tokens: 500
                });
                
                response = response.choices[0].message.content;
            } else {
                // Use fallback API
                response = await this.callFallbackAPI(fullMessage);
            }
            
            // Add assistant response
            this.addMessageToChat('assistant', response);
            this.conversationHistory.push({ role: 'assistant', content: response });
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessageToChat('error', `Error: ${error.message}`);
        }
    }

    async callFallbackAPI(message) {
        // This would call an external API service
        // For demo purposes, return a mock response
        return `I received your message: "${message}". 
                However, I'm currently running in fallback mode as WebLLM couldn't load. 
                To use the full vision-language capabilities, please ensure WebGPU is enabled in your browser.`;
    }

    addMessageToChat(role, content) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const timestamp = new Date().toLocaleTimeString();
        messageDiv.innerHTML = `
            <div class="message-header">${role} - ${timestamp}</div>
            <div class="message-content">${this.escapeHtml(content)}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImage = e.target.result;
            this.displayImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    displayImage(imageSrc) {
        const imagePreview = document.getElementById('image-preview');
        imagePreview.innerHTML = `<img src="${imageSrc}" alt="Uploaded image">`;
        imagePreview.style.display = 'block';
        
        const clearBtn = document.getElementById('clear-image');
        if (clearBtn) clearBtn.style.display = 'inline-block';
    }

    clearImage() {
        this.currentImage = null;
        const imagePreview = document.getElementById('image-preview');
        imagePreview.innerHTML = '';
        imagePreview.style.display = 'none';
        
        const clearBtn = document.getElementById('clear-image');
        if (clearBtn) clearBtn.style.display = 'none';
        
        const imageInput = document.getElementById('image-input');
        if (imageInput) imageInput.value = '';
    }

    async captureScreenshot() {
        try {
            // This would use browser extension API or screen capture API
            if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
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
                    
                    const imageData = canvas.toDataURL('image/png');
                    this.currentImage = imageData;
                    this.displayImage(imageData);
                    
                    // Stop the stream
                    stream.getTracks().forEach(track => track.stop());
                };
            } else {
                alert('Screen capture not supported in this browser');
            }
        } catch (error) {
            console.error('Error capturing screenshot:', error);
            alert('Failed to capture screenshot');
        }
    }

    // Memory management
    loadMemories() {
        const stored = localStorage.getItem('smolvlm_memories');
        return stored ? JSON.parse(stored) : [];
    }

    saveMemory(memory) {
        this.memories.push({
            ...memory,
            timestamp: new Date().toISOString(),
            modelUsed: this.currentModelKey
        });
        localStorage.setItem('smolvlm_memories', JSON.stringify(this.memories));
    }

    saveCurrentConversation() {
        if (this.conversationHistory.length === 0) {
            alert('No conversation to save');
            return;
        }
        
        const memory = {
            conversation: this.conversationHistory,
            context: 'Manual save',
            summary: this.generateSummary(this.conversationHistory)
        };
        
        this.saveMemory(memory);
        alert('Conversation saved to memory');
    }

    generateSummary(conversation) {
        // Simple summary - in production, use the model to generate
        const userMessages = conversation.filter(m => m.role === 'user').map(m => m.content);
        return userMessages.slice(0, 3).join('; ');
    }

    clearMemories() {
        if (confirm('Are you sure you want to clear all memories?')) {
            this.memories = [];
            localStorage.removeItem('smolvlm_memories');
            alert('All memories cleared');
        }
    }

    exportMemories() {
        const dataStr = JSON.stringify(this.memories, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `smolvlm_memories_${new Date().toISOString()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    // Browser automation capabilities
    async analyzePage() {
        const pageData = {
            title: document.title,
            url: window.location.href,
            text: document.body.innerText.slice(0, 5000),
            links: Array.from(document.links).map(l => ({ text: l.text, href: l.href })).slice(0, 20),
            images: Array.from(document.images).map(img => ({ src: img.src, alt: img.alt })).slice(0, 10)
        };
        
        return pageData;
    }

    async performAction(action) {
        // This would be expanded with actual browser automation
        switch(action.type) {
            case 'click':
                const element = document.querySelector(action.selector);
                if (element) element.click();
                break;
            case 'type':
                const input = document.querySelector(action.selector);
                if (input) input.value = action.text;
                break;
            case 'navigate':
                window.location.href = action.url;
                break;
            default:
                console.log('Unknown action:', action);
        }
    }
}

// Initialize the agent when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.smolVLMAgent = new SmolVLMAgent();
});