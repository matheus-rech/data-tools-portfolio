// Portfolio JavaScript - Interactive Features

class ToolsPortfolio {
    constructor() {
        this.tools = [];
        this.filteredTools = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        
        this.init();
    }

    init() {
        this.loadTools();
        this.bindEvents();
        this.updateToolCount();
        this.animateOnScroll();
    }

    loadTools() {
        // Get all tool cards (excluding placeholders and add card)
        const toolCards = document.querySelectorAll('.tool-card:not(.tool-placeholder):not(.add-tool-card)');
        
        toolCards.forEach(card => {
            const tool = {
                element: card,
                name: card.dataset.name || card.querySelector('.tool-title').textContent,
                categories: card.dataset.categories ? card.dataset.categories.split(',') : [],
                description: card.querySelector('.tool-description').textContent.toLowerCase()
            };
            this.tools.push(tool);
        });
        
        this.filteredTools = [...this.tools];
    }

    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('search-tools');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterTools();
            });
        }

        // Filter tags
        const filterTags = document.querySelectorAll('.filter-tag');
        filterTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                // Remove active class from all tags
                filterTags.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tag
                e.target.classList.add('active');
                
                this.currentFilter = e.target.dataset.category;
                this.filterTools();
            });
        });

        // Add tool card
        const addToolCard = document.querySelector('.add-tool-card');
        if (addToolCard) {
            addToolCard.addEventListener('click', () => {
                this.showAddToolModal();
            });
        }

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Documentation and Contact links
        document.getElementById('documentation-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showComingSoonMessage('Documentation');
        });

        document.getElementById('contact-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showComingSoonMessage('Contact Form');
        });
    }

    filterTools() {
        const toolsGrid = document.getElementById('tools-grid');
        const allCards = toolsGrid.querySelectorAll('.tool-card');
        const noResults = document.getElementById('no-results');
        
        let visibleCount = 0;

        allCards.forEach(card => {
            // Skip placeholder and add cards
            if (card.classList.contains('tool-placeholder') || card.classList.contains('add-tool-card')) {
                return;
            }

            const toolName = card.dataset.name || '';
            const categories = card.dataset.categories ? card.dataset.categories.split(',') : [];
            const description = card.querySelector('.tool-description')?.textContent.toLowerCase() || '';
            
            // Check category filter
            const categoryMatch = this.currentFilter === 'all' || categories.includes(this.currentFilter);
            
            // Check search term
            const searchMatch = !this.searchTerm || 
                toolName.toLowerCase().includes(this.searchTerm) ||
                description.includes(this.searchTerm) ||
                categories.some(cat => cat.includes(this.searchTerm));
            
            if (categoryMatch && searchMatch) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show/hide no results message
        if (visibleCount === 0 && !document.querySelector('.tool-placeholder:not(.hidden)')) {
            noResults?.classList.remove('hidden');
        } else {
            noResults?.classList.add('hidden');
        }
    }

    updateToolCount() {
        const toolCount = this.tools.length;
        const countBadge = document.getElementById('tool-count');
        if (countBadge) {
            countBadge.textContent = `${toolCount} Tool${toolCount !== 1 ? 's' : ''}`;
        }
    }

    showAddToolModal() {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Add New Tool</h2>
                <p>To add a new tool to this portfolio:</p>
                <ol>
                    <li>Create your tool in a new folder under <code>/tools/</code></li>
                    <li>Add a new tool card to the index.html</li>
                    <li>Deploy to GitHub Pages</li>
                </ol>
                <div class="modal-code">
                    <pre><code>tools/
├── json-spreadsheet-mapper/
├── your-new-tool/
│   ├── index.html
│   ├── style.css
│   └── app.js</code></pre>
                </div>
                <button class="modal-close">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add styles for modal
        const style = document.createElement('style');
        style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                animation: fadeIn 0.3s ease-out;
            }
            .modal-content {
                background: var(--bg-primary);
                padding: 2rem;
                border-radius: 1rem;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.3);
                animation: slideUp 0.3s ease-out;
            }
            .modal-content h2 {
                margin-bottom: 1rem;
                color: var(--text-primary);
            }
            .modal-content p {
                color: var(--text-secondary);
                margin-bottom: 1rem;
            }
            .modal-content ol {
                color: var(--text-secondary);
                margin-left: 1.5rem;
                margin-bottom: 1rem;
            }
            .modal-content li {
                margin-bottom: 0.5rem;
            }
            .modal-code {
                background: var(--bg-tertiary);
                border-radius: 0.5rem;
                padding: 1rem;
                margin-bottom: 1.5rem;
                overflow-x: auto;
            }
            .modal-code code {
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.875rem;
                color: var(--text-primary);
            }
            .modal-close {
                background: var(--primary-color);
                color: white;
                border: none;
                padding: 0.5rem 1.5rem;
                border-radius: 0.5rem;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.2s;
            }
            .modal-close:hover {
                background: var(--primary-dark);
            }
            @keyframes slideUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Close modal on click
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close')) {
                modal.remove();
                style.remove();
            }
        });
    }

    showComingSoonMessage(feature) {
        const message = document.createElement('div');
        message.className = 'toast-message';
        message.textContent = `${feature} coming soon!`;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .toast-message {
                position: fixed;
                bottom: 2rem;
                left: 50%;
                transform: translateX(-50%);
                background: var(--gray-800);
                color: white;
                padding: 1rem 2rem;
                border-radius: 0.5rem;
                box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3);
                animation: slideUp 0.3s ease-out;
                z-index: 1000;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(message);
        
        // Remove after 3 seconds
        setTimeout(() => {
            message.remove();
            style.remove();
        }, 3000);
    }

    animateOnScroll() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe tool cards
        document.querySelectorAll('.tool-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            observer.observe(card);
        });
    }

    // Method to dynamically add a new tool (for future use)
    addTool(toolData) {
        const toolsGrid = document.getElementById('tools-grid');
        const addCard = document.querySelector('.add-tool-card');
        
        const newToolCard = document.createElement('article');
        newToolCard.className = 'tool-card';
        newToolCard.dataset.categories = toolData.categories.join(',');
        newToolCard.dataset.name = toolData.name;
        
        newToolCard.innerHTML = `
            <div class="tool-card-header">
                <div class="tool-icon">
                    ${toolData.icon || '<svg>...</svg>'}
                </div>
                <div class="tool-badges">
                    <span class="badge badge-active">Active</span>
                    <span class="badge badge-version">${toolData.version || 'v1.0'}</span>
                </div>
            </div>
            <h3 class="tool-title">${toolData.name}</h3>
            <p class="tool-description">${toolData.description}</p>
            <div class="tool-features">
                ${toolData.features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
            </div>
            <div class="tool-stats">
                ${toolData.stats.map(s => `
                    <div class="stat">
                        ${s.icon}
                        <span>${s.label}</span>
                    </div>
                `).join('')}
            </div>
            <a href="${toolData.url}" class="tool-link">
                <span>Open Tool</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            </a>
        `;
        
        toolsGrid.insertBefore(newToolCard, addCard);
        
        // Update tools array and count
        this.tools.push({
            element: newToolCard,
            name: toolData.name,
            categories: toolData.categories,
            description: toolData.description.toLowerCase()
        });
        
        this.updateToolCount();
        
        // Animate the new card
        newToolCard.style.opacity = '0';
        newToolCard.style.transform = 'translateY(20px)';
        setTimeout(() => {
            newToolCard.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            newToolCard.style.opacity = '1';
            newToolCard.style.transform = 'translateY(0)';
        }, 100);
    }
}

// Initialize the portfolio when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ToolsPortfolio();
    
    // Add some interactive console messages for developers
    console.log('%c🚀 Data Tools Portfolio', 'font-size: 20px; font-weight: bold; color: #0ea5e9;');
    console.log('%cBuilt with ❤️ for medical research', 'font-size: 14px; color: #6b7280;');
    console.log('%cAdd your own tools at: /tools/', 'font-size: 12px; color: #9ca3af;');
});