# SmolVLM2 Browser Agent

An AI-powered browser agent that runs SmolVLM2 vision-language models directly in your browser using WebGPU and WebLLM.

## Features

- **SmolVLM2 Support**: Three model sizes (2.2B, 500M, 256M parameters)
- **Video Understanding**: Process and understand video content
- **Multi-Image Analysis**: Analyze multiple images simultaneously  
- **Text-in-Image Reading**: Extract and read text from images
- **Math Problem Solving**: Solve mathematical problems from visual input
- **Complex Diagram Understanding**: Interpret and analyze complex diagrams
- **Browser-Native**: Runs entirely in browser with WebGPU
- **Offline Capable**: Works without internet after initial model download
- **Memory Persistence**: Remembers context across sessions

## Quick Start

### GitHub Pages Deployment

1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Select source: Deploy from a branch
4. Select branch: main, folder: / (root)
5. Visit: `https://[your-username].github.io/smolvlm-agent`

### Local Development

```bash
# Clone the repository
git clone https://github.com/[your-username]/smolvlm-agent.git
cd smolvlm-agent

# Start a local server
python3 -m http.server 8000

# Visit http://localhost:8000
```

### Browser Extension

1. Open Chrome/Edge browser
2. Navigate to Extensions page (chrome://extensions)
3. Enable Developer mode
4. Click "Load unpacked"
5. Select the smolvlm-agent folder

## Model Selection

| Model | Size | Features | Use Case |
|-------|------|----------|----------|
| SmolVLM2 2.2B | 2.2GB | Full features, best quality | Desktop with GPU |
| SmolVLM2 500M | 500MB | Efficient, multi-image | Mobile devices |
| SmolVLM2 256M | 256MB | Ultra-light | Edge devices, IoT |

## Requirements

- **Browser**: Chrome 113+ or Edge 113+
- **WebGPU**: Enabled (check chrome://gpu)
- **GPU Memory**: 256MB - 2.2GB depending on model
- **Storage**: 500MB - 3GB for model cache

## Architecture

```
smolvlm-agent/
├── index.html          # Main UI
├── agent-updated.js    # Core agent logic with SmolVLM2
├── manifest.json       # Browser extension manifest
├── popup.html         # Extension popup
├── popup.js          # Extension popup logic
├── background.js     # Service worker
└── content.js        # Content script
```

## API Fallback

When WebGPU is not available, the agent automatically falls back to API mode using external inference services.

## Privacy

- All processing happens locally in your browser
- No data is sent to external servers (except in API fallback mode)
- Models are cached locally after first download
- Memory and conversations stored in browser localStorage

## Development

### Adding New Models

Edit `agent-updated.js` and add to `modelConfigs`:

```javascript
'model-name': {
    model_id: 'HuggingFace/Model-ID',
    model_lib: 'https://huggingface.co/mlc-ai/Model-MLC/resolve/main/',
    vram_required_MB: 1000,
    features: ['feature1', 'feature2']
}
```

### Customizing UI

Edit `index.html` for layout and styling changes.

## Troubleshooting

### WebGPU Not Available
- Ensure Chrome/Edge is updated to 113+
- Check chrome://flags/#enable-unsafe-webgpu
- Verify GPU drivers are updated

### Model Loading Fails
- Check available GPU memory
- Clear browser cache and reload
- Try smaller model variant

### Performance Issues
- Use smaller model (256M or 500M)
- Close other GPU-intensive applications
- Enable hardware acceleration in browser

## References

- [SmolVLM2 Blog Post](https://huggingface.co/blog/smolvlm2)
- [WebLLM Documentation](https://webllm.mlc.ai/)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)

## License

MIT License - see LICENSE file for details