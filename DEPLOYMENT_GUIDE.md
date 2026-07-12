# Deployment Guide: GitHub Actions & Vercel

This guide explains how to deploy the UR Creator Platform to your own server using GitHub Actions and Vercel.

---

## Architecture Overview

```
GitHub Repository
    ↓
GitHub Actions (CI/CD Pipeline)
    ├─ Run tests
    ├─ Check TypeScript
    ├─ Run linter
    └─ Deploy to Vercel
         ↓
    Vercel (Hosting)
    ├─ Preview deployments (on PRs)
    └─ Production deployment (on main branch)
```

---

## Step 1: Set Up GitHub Repository

### 1.1 Create Repository

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit: UR Creator Platform"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/ur-creator-platform.git
git branch -M main
git push -u origin main
```

### 1.2 Verify GitHub Actions Workflow

The workflow file is already created at `.github/workflows/ci.yml`

Check that it exists:
```bash
ls -la .github/workflows/ci.yml
```

---

## Step 2: Configure Vercel

### 2.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Authorize Vercel to access your repositories

### 2.2 Create Vercel Project

1. Click **"Add New..."** → **"Project"**
2. Select your GitHub repository
3. Configure settings:
   - **Framework Preset**: Node.js
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install`

### 2.3 Add Environment Variables

In Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add all required variables:

```
DATABASE_URL=postgresql://user:password@host/db
JWT_SECRET=your_secret_key
AI_API_URL=https://api.manus.im/v1
AI_API_KEY=your_api_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
BUFFER_ACCESS_TOKEN=your_buffer_token
BUFFER_TIKTOK_PROFILE_ID=...
BUFFER_INSTAGRAM_PROFILE_ID=...
BUFFER_TWITTER_PROFILE_ID=...
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/...
WALMART_TRACKING_ID=your_walmart_id
AMAZON_ASSOCIATE_TAG=your_amazon_tag
```

---

## Step 3: Configure GitHub Secrets

### 3.1 Add Secrets to GitHub

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
AI_API_KEY=your_api_key
STRIPE_SECRET_KEY_TEST=sk_test_...
```

### 3.2 Get Vercel Credentials

To find your Vercel credentials:

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Create new token
3. Copy token and add to GitHub secrets as `VERCEL_TOKEN`

For Org ID and Project ID:
1. Go to your project in Vercel
2. URL is: `vercel.com/YOUR_ORG/PROJECT_NAME/PROJ_ID`
3. Add both to GitHub secrets

---

## Step 4: Database Setup

### 4.1 Create PostgreSQL Database

Option A: Vercel Postgres (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Create database
vercel postgres create

# Get connection string
vercel env pull
```

Option B: Self-hosted PostgreSQL

```bash
# Create database
createdb ur_creator_platform

# Get connection string
postgresql://user:password@localhost:5432/ur_creator_platform
```

### 4.2 Run Migrations

```bash
# Generate migrations
pnpm db:push

# Seed database (optional)
pnpm db:seed
```

---

## Step 5: Deploy

### 5.1 Automatic Deployment

Every push to `main` automatically deploys:

```bash
git add .
git commit -m "Feature: Add new feature"
git push origin main
```

GitHub Actions will:
1. Run tests
2. Check TypeScript
3. Run linter
4. Deploy to Vercel

### 5.2 Manual Deployment

To deploy manually:

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 5.3 Check Deployment Status

1. Go to GitHub repository
2. Click **Actions** tab
3. View workflow run status
4. Check Vercel dashboard for deployment logs

---

## Step 6: Environment-Specific Configuration

### 6.1 Development Environment

```bash
# .env.local (not committed)
DATABASE_URL=postgresql://localhost/ur_dev
JWT_SECRET=dev_secret_key
NODE_ENV=development
```

### 6.2 Staging Environment

```bash
# Vercel Staging Branch
git checkout -b staging
git push origin staging

# Configure in Vercel:
# Settings → Git → Branches
# Add staging branch for preview deployments
```

### 6.3 Production Environment

```bash
# Main branch automatically deploys to production
git push origin main

# Verify deployment
curl https://your-domain.vercel.app/health
```

---

## Step 7: Monitoring & Logs

### 7.1 GitHub Actions Logs

1. Go to repository **Actions** tab
2. Click on workflow run
3. View logs for each step

### 7.2 Vercel Logs

1. Go to Vercel dashboard
2. Click project
3. View **Deployments** tab
4. Click deployment to see logs

### 7.3 Application Logs

```bash
# View live logs
vercel logs

# View production logs
vercel logs --prod
```

---

## Step 8: Rollback

### 8.1 Rollback to Previous Deployment

```bash
# View deployments
vercel deployments list

# Promote previous deployment to production
vercel promote <deployment_id>
```

### 8.2 Rollback Git Commits

```bash
# View commit history
git log --oneline

# Revert to previous commit
git revert <commit_id>
git push origin main
```

---

## Step 9: Custom Domain

### 9.1 Add Domain to Vercel

1. Go to Vercel project **Settings** → **Domains**
2. Enter your domain
3. Update DNS records:

```
CNAME: your-domain.com → cname.vercel.com
```

### 9.2 SSL Certificate

Vercel automatically provisions SSL certificates via Let's Encrypt.

---

## Troubleshooting

### Build Failures

| Error | Solution |
|-------|----------|
| `pnpm: command not found` | Install pnpm: `npm i -g pnpm` |
| `TypeScript errors` | Run `pnpm check` locally to debug |
| `Database connection failed` | Verify DATABASE_URL in Vercel settings |

### Deployment Issues

| Error | Solution |
|-------|----------|
| `Deployment timeout` | Check build logs in Vercel dashboard |
| `Environment variables not found` | Verify secrets in GitHub and Vercel |
| `Port already in use` | Vercel automatically assigns ports |

### Performance Issues

| Issue | Solution |
|-------|----------|
| Slow builds | Check for large dependencies, use `pnpm install --frozen-lockfile` |
| High memory usage | Split into multiple functions, use serverless |
| Database slow queries | Add indexes, optimize queries |

---

## Advanced Configuration

### A/B Testing

```bash
# Create feature branch
git checkout -b feature/new-feature

# Deploy preview
git push origin feature/new-feature

# Vercel automatically creates preview URL
# Share preview URL for testing
```

### Scheduled Jobs

Use GitHub Actions for scheduled tasks:

```yaml
# .github/workflows/scheduled.yml
name: Scheduled Tasks
on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM daily

jobs:
  daily-tasks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm run daily-tasks
```

### Monitoring & Alerts

Set up alerts in Vercel:

1. **Settings** → **Monitoring**
2. Configure alerts for:
   - Build failures
   - Deployment errors
   - High error rates

---

## Checklist for August Migration

- [ ] GitHub repository created and pushed
- [ ] Vercel account and project set up
- [ ] All environment variables configured
- [ ] Database created and migrated
- [ ] GitHub Actions workflow running successfully
- [ ] Preview deployments working
- [ ] Production deployment successful
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Monitoring and alerts configured
- [ ] Team members have access
- [ ] Documentation updated

---

## Support

For deployment issues:

1. Check GitHub Actions logs
2. Check Vercel deployment logs
3. Review this guide's troubleshooting section
4. Contact support at help.manus.im

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Configure Vercel
3. ✅ Set up environment variables
4. ✅ Deploy to production
5. ✅ Monitor logs and performance
