# Deployment Guide for GitHub Pages

## Quick Start

### 1. Create GitHub Repository

```bash
# Go to GitHub and create a new repository named: brightsupport-invoice-processing
# Do NOT initialize with README, .gitignore, or license (we already have them)
```

### 2. Push to GitHub

```bash
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/brightsupport-invoice-processing.git

# Push to GitHub
git push -u origin main
```

### 3. Configure GitHub Pages

#### Option A: Automatic Deployment with GitHub Actions (Recommended)

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. The workflow file `.github/workflows/deploy.yml` will automatically deploy on push

#### Option B: Manual Deployment

1. **Update `next.config.js`**:
   ```javascript
   basePath: '/brightsupport-invoice-processing',
   assetPrefix: '/brightsupport-invoice-processing',
   ```

2. **Build and export**:
   ```bash
   npm run export
   ```

3. **Create gh-pages branch**:
   ```bash
   git checkout -b gh-pages
   git add -f out/
   git commit -m "Deploy to GitHub Pages"
   git subtree push --prefix out origin gh-pages
   ```

4. **Configure Pages**:
   - Settings → Pages
   - Source: Deploy from branch
   - Branch: `gh-pages` → `/` (root)

### 4. Access Your Site

Your site will be available at:
```
https://YOUR_USERNAME.github.io/brightsupport-invoice-processing/
```

## Important Notes

### For Custom Domain

If deploying to `username.github.io` (user/org page):
1. **No basePath needed** - remove or comment out basePath and assetPrefix
2. Repository must be named `username.github.io`
3. Deploy to `main` or `gh-pages` branch root

### For Repository Page

If deploying to `username.github.io/repo-name`:
1. **basePath required** - set to `'/repo-name'`
2. Update image paths if needed
3. GitHub Actions workflow handles this automatically

### Local Testing of Production Build

```bash
# Build and export
npm run export

# Serve the out directory locally
npx serve out

# Or use a simple HTTP server
python3 -m http.server --directory out 8080
```

### Troubleshooting

**Images not loading?**
- Check `next.config.js` basePath settings
- Verify images are in `public/` directory
- Images in `public/` map to `/` in URL

**404 on page refresh?**
- Static export doesn't support dynamic routes
- All routes must be pre-rendered

**GitHub Actions not running?**
- Check **Settings** → **Actions** → **General**
- Ensure "Allow all actions and reusable workflows" is enabled
- Verify workflow file syntax in `.github/workflows/deploy.yml`

**Build failing?**
- Check build logs in Actions tab
- Verify all dependencies in `package.json`
- Test build locally: `npm run export`

## Maintenance

### Update Deployment

```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin main

# GitHub Actions will automatically rebuild and deploy
```

### Rollback to Previous Version

```bash
# Find commit hash
git log

# Revert to specific commit
git revert COMMIT_HASH
git push origin main
```

## Custom Deployment Scripts

### Deploy Script (package.json)

Already configured:
```json
"deploy": "npm run export && touch out/.nojekyll && touch out/CNAME"
```

This creates:
- `.nojekyll` - Tells GitHub Pages not to process with Jekyll
- `CNAME` - For custom domain (add your domain inside)

## Security Considerations

- No sensitive data in localStorage (client-side only)
- All invoice data stays in browser
- No backend/database - fully static
- Invoice numbers reset per browser

## Performance Optimization

Already implemented:
- Static export for fast loading
- Image optimization disabled (required for static export)
- No runtime JS for image optimization
- All assets pre-built

## Monitoring

After deployment, test:
1. ✅ Main page loads
2. ✅ Invoice form works
3. ✅ Calendar displays correctly
4. ✅ Logo displays in preview
5. ✅ PDF export works
6. ✅ HTML export works
7. ✅ Invoice numbering increments

---

**Need Help?**
- Check GitHub Pages documentation: https://docs.github.com/pages
- Next.js static export docs: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
