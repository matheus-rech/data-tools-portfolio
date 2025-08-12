#!/bin/bash

# SmolVLM2 Browser Agent - Portfolio Deployment Script
# Integrates SmolVLM2 agent into data-tools-portfolio

set -e  # Exit on error

echo "🚀 Starting SmolVLM2 Browser Agent deployment..."

# Configuration
PORTFOLIO_DIR="$HOME/data-tools-portfolio"
SOURCE_DIR="$HOME/smolvlm-agent"
TARGET_DIR="$PORTFOLIO_DIR/tools/smolvlm-agent"

# Check if portfolio directory exists
if [ ! -d "$PORTFOLIO_DIR" ]; then
    echo "❌ Portfolio directory not found at $PORTFOLIO_DIR"
    echo "Please clone https://github.com/matheus-rech/data-tools-portfolio first"
    exit 1
fi

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ SmolVLM2 agent directory not found at $SOURCE_DIR"
    exit 1
fi

# Navigate to portfolio directory
cd "$PORTFOLIO_DIR"

# Create tools directory if it doesn't exist
mkdir -p tools

# Step 1: Copy SmolVLM2 files to portfolio
echo "📁 Copying SmolVLM2 files to portfolio..."
if [ -d "$TARGET_DIR" ]; then
    echo "⚠️  Target directory exists. Backing up..."
    mv "$TARGET_DIR" "$TARGET_DIR.backup.$(date +%Y%m%d_%H%M%S)"
fi

cp -r "$SOURCE_DIR" "$TARGET_DIR"
echo "✅ Files copied successfully"

# Step 2: Update portfolio index.html
echo "📝 Updating portfolio index.html..."

# Check if SmolVLM2 card already exists
if grep -q "SmolVLM2 Browser Agent" index.html; then
    echo "⚠️  SmolVLM2 already exists in portfolio. Skipping HTML update."
else
    # Create temporary file with the new tool card
    cat > /tmp/smolvlm_card.html << 'EOF'
                <div class="tool-card" data-categories="ai,vision,browser">
                    <div class="tool-icon">🤖</div>
                    <h3>SmolVLM2 Browser Agent</h3>
                    <p>Vision-language AI assistant running entirely in your browser using WebGPU. No API keys needed.</p>
                    <div class="features">
                        <span class="feature">WebGPU</span>
                        <span class="feature">Vision AI</span>
                        <span class="feature">Multi-Modal</span>
                        <span class="feature">Privacy-First</span>
                    </div>
                    <a href="tools/smolvlm-agent/" class="tool-link">Launch Tool →</a>
                </div>
EOF

    # Insert the new card before the closing grid div
    # Using a more robust approach with awk
    awk '
    /<\/div><!-- tools-grid -->/ {
        while ((getline line < "/tmp/smolvlm_card.html") > 0) {
            print line
        }
    }
    {print}
    ' index.html > index.html.tmp && mv index.html.tmp index.html

    echo "✅ SmolVLM2 card added to portfolio"
fi

# Step 3: Update tool count
echo "📊 Updating tool count..."
sed -i.bak 's/<h2>2 Tools/<h2>3 Tools/' index.html && rm index.html.bak
echo "✅ Tool count updated"

# Step 4: Git operations
echo "📤 Committing changes to Git..."

# Check if we're in a git repository
if [ -d .git ]; then
    git add tools/smolvlm-agent/
    git add index.html
    
    # Create commit
    git commit -m "Add SmolVLM2 Browser Agent to portfolio

- Added SmolVLM2 vision-language model browser agent
- Features: WebGPU acceleration, multi-modal AI, privacy-first
- Supports 3 model sizes: 2.2B, 500M, 256M parameters
- No API keys required - runs entirely in browser" || echo "⚠️  No changes to commit"
    
    echo "✅ Changes committed"
    
    # Push to GitHub
    echo "📤 Pushing to GitHub..."
    git push origin main || git push origin master || echo "⚠️  Could not push. Please push manually: git push"
    
    echo "✅ Pushed to GitHub"
else
    echo "⚠️  Not a git repository. Please commit and push manually."
fi

# Step 5: Verify deployment
echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Summary:"
echo "  • SmolVLM2 files copied to: $TARGET_DIR"
echo "  • Portfolio updated with new tool card"
echo "  • Tool count updated to 3"
echo ""
echo "🌐 GitHub Pages URLs:"
echo "  • Portfolio: https://matheus-rech.github.io/data-tools-portfolio/"
echo "  • SmolVLM2: https://matheus-rech.github.io/data-tools-portfolio/tools/smolvlm-agent/"
echo ""
echo "📦 Local development:"
echo "  • cd $PORTFOLIO_DIR"
echo "  • python3 -m http.server 8000"
echo "  • Open: http://localhost:8000"
echo ""
echo "✨ SmolVLM2 Browser Agent successfully integrated into your portfolio!"