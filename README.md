# Data Tools Portfolio

A collection of web-based tools for medical research data processing and analysis, hosted on GitHub Pages.

## 🚀 Live Demo

Once deployed: `https://[your-username].github.io/data-tools-portfolio/`

## 📁 Project Structure

```
data-tools-portfolio/
├── index.html                 # Portfolio landing page
├── portfolio-style.css        # Portfolio styles
├── portfolio.js              # Portfolio JavaScript
├── tools/                    # Individual tools directory
│   ├── json-spreadsheet-mapper/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   └── [other-tools]/       # Add more tools here
└── README.md                 # This file
```

## 🛠️ Current Tools

1. **JSON Spreadsheet Mapper** - Map JSON fields to spreadsheet columns for medical research data
   - Intelligent field matching (exact, partial, case-insensitive)
   - Pre-configured for 28 medical research fields
   - Real-time validation and statistics

## 📦 Deployment to GitHub Pages

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `data-tools-portfolio` (or your preferred name)
3. Make it public
4. Don't initialize with README (we already have one)

### Step 2: Push Code to GitHub

```bash
# Navigate to project directory
cd json-spreadsheet-mapper

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Data Tools Portfolio with JSON Spreadsheet Mapper"

# Add your GitHub repository as origin
git remote add origin https://github.com/[your-username]/data-tools-portfolio.git

# Push to GitHub
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**
6. Wait 2-3 minutes for deployment
7. Your site will be available at: `https://[your-username].github.io/data-tools-portfolio/`

## 🆕 Adding New Tools

### 1. Create Tool Directory

```bash
# Create new tool folder
mkdir tools/your-new-tool

# Add your tool files
cp your-tool-files/* tools/your-new-tool/
```

### 2. Add Tool Card to Portfolio

Edit `index.html` and add a new tool card in the tools grid:

```html
<article class="tool-card" data-categories="category1,category2" data-name="Your Tool Name">
    <div class="tool-card-header">
        <div class="tool-icon">
            <!-- Add icon SVG -->
        </div>
        <div class="tool-badges">
            <span class="badge badge-active">Active</span>
            <span class="badge badge-version">v1.0</span>
        </div>
    </div>
    <h3 class="tool-title">Your Tool Name</h3>
    <p class="tool-description">Tool description here...</p>
    <div class="tool-features">
        <span class="feature-tag">Feature 1</span>
        <span class="feature-tag">Feature 2</span>
    </div>
    <a href="tools/your-new-tool/" class="tool-link">
        <span>Open Tool</span>
        <!-- Arrow icon -->
    </a>
</article>
```

### 3. Deploy Updates

```bash
git add .
git commit -m "Add new tool: [Tool Name]"
git push
```

## 🎨 Customization

### Changing Colors

Edit the CSS variables in `portfolio-style.css`:

```css
:root {
  --primary-color: #0ea5e9;    /* Change primary color */
  --secondary-color: #8b5cf6;  /* Change secondary color */
  /* ... other colors */
}
```

### Adding Categories

1. Add new filter button in `index.html`:
```html
<button class="filter-tag" data-category="new-category">New Category</button>
```

2. Add category to tool cards:
```html
<article class="tool-card" data-categories="medical,new-category">
```

## 📝 Features

- ✅ Responsive design
- ✅ Dark mode support
- ✅ Search functionality
- ✅ Category filtering
- ✅ Animated cards
- ✅ Professional UI/UX
- ✅ Fast loading
- ✅ SEO friendly

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/NewTool`)
3. Commit your changes (`git commit -m 'Add new tool'`)
4. Push to the branch (`git push origin feature/NewTool`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built for medical research data processing
- Designed with accessibility in mind
- Optimized for GitHub Pages hosting

## 📧 Contact

For questions or suggestions, please open an issue on GitHub.

---

**Note:** Replace `[your-username]` with your actual GitHub username throughout this document.