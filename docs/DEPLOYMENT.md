# Deployment Guide

Step-by-step guide for deploying Harmony to production.

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database schema applied to production Supabase project
- [ ] S3 bucket created and configured
- [ ] CORS updated for production domain
- [ ] Stripe keys switched to production (if using payments)
- [ ] Stripe webhook configured for `/api/webhooks/stripe`
- [ ] Build passes locally (`npm run build`)

## Deployment Platforms

### Vercel (Recommended)

Vercel is optimized for Next.js apps.

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

   Or connect via GitHub:
   - Push code to GitHub
   - Go to [vercel.com](https://vercel.com)
   - Import repository
   - Configure environment variables

4. **Set Environment Variables**

   In Vercel dashboard > Project > Settings > Environment Variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_production_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   AWS_REGION=your_region
   S3_BUCKET_NAME=your_bucket_name
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

5. **Redeploy**
   ```bash
   vercel --prod
   ```

### Other Platforms

**Netlify:**
- Connect GitHub repo
- Build command: `npm run build`
- Publish directory: `.next`
- Set environment variables in Netlify dashboard

**AWS Amplify:**
- Connect GitHub repo
- Build settings auto-detected for Next.js
- Set environment variables in Amplify Console

## Production Configuration

### Update Supabase

1. Create new Supabase project (or use existing)
2. Run `database.sql` in production database
3. Update environment variables with production URLs

### Update AWS S3 CORS

1. Go to S3 Console > Your bucket > Permissions
2. Update CORS to include production domain:

```json
[
  {
    "AllowedOrigins": [
      "https://yourdomain.com",
      "https://www.yourdomain.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### Domain Configuration

1. **Custom Domain** (if using Vercel):
   - Go to Project > Settings > Domains
   - Add your domain
   - Update DNS records as instructed

2. **SSL Certificate**
   - Automatically handled by Vercel/Netlify
   - HTTPS required for production

## Post-Deployment

### Test Checklist

- [ ] Home page loads
- [ ] User can sign up
- [ ] User can log in
- [ ] Songs display correctly
- [ ] User can upload songs
- [ ] Player works (play/pause/seek)
- [ ] Images load correctly
- [ ] Search works
- [ ] Liked songs work

### Monitoring

- **Vercel Analytics** - Track page views and performance
- **Supabase Dashboard** - Monitor database usage
- **AWS CloudWatch** - Monitor S3 usage
- **Error Tracking** - Consider Sentry for error monitoring

### Performance Optimization

1. **Enable CDN** (optional):
   - Set up CloudFront for S3 bucket
   - Update `songPath` and `imagePath` to CloudFront URLs

2. **Image Optimization**:
   - Use Next.js Image component for covers
   - Compress images before upload

3. **Database Indexing**:
   - Verify indexes on `user_id`, `song_id`
   - Monitor slow queries in Supabase

## Environment Variables Reference

### Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=eu-north-1
S3_BUCKET_NAME=your-bucket-name
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Optional (Stripe)

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Stripe webhooks (required for production)

- Add a webhook endpoint in Stripe Dashboard pointing to:
  - `https://yourdomain.com/api/webhooks/stripe`
- Configure these events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

Server note: webhook sync requires `SUPABASE_SERVICE_ROLE_KEY` to write into `subscriptions` and update `users.is_subscribed` (RLS blocks writes from anon key).

## Troubleshooting

### Build Fails

- Check environment variables are set
- Verify TypeScript errors are fixed
- Check Next.js version compatibility

### 500 Errors

- Check server logs (Vercel dashboard > Functions)
- Verify database connection
- Check AWS credentials

### Images/Songs Not Loading

- Verify S3 CORS includes production domain
- Check presigned URL generation
- Verify IAM user has `s3:GetObject` permission

### Authentication Issues

- Verify Supabase production URL
- Check cookie settings (should work automatically)
- Test on production domain, not localhost

## Security Checklist

- [ ] Environment variables not in code
- [ ] HTTPS enabled (required)
- [ ] S3 bucket private
- [ ] IAM user has minimal permissions
- [ ] CORS restricted to your domain
- [ ] Database RLS policies enabled
- [ ] No sensitive data in client-side code

## Backup Strategy

1. **Database**: Supabase automatic backups (free tier: daily)
2. **Files**: S3 versioning (optional, adds cost)
3. **Code**: GitHub repository (source of truth)

## Scaling Considerations

### Database

- Upgrade Supabase plan if hitting limits
- Consider read replicas for high traffic
- Optimize queries with indexes

### Storage

- Monitor S3 usage
- Set up lifecycle policies for old files
- Consider S3 Glacier for archives

### Compute

- Vercel auto-scales Next.js functions
- Monitor function execution time
- Optimize cold starts if needed

## Rollback Plan

1. **Vercel**: Use "Deployments" tab to rollback
2. **Database**: Restore from Supabase backup
3. **Files**: Keep S3 versioning enabled

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **AWS S3 Docs**: https://docs.aws.amazon.com/s3
