# Troubleshooting Guide

Common issues and solutions for Harmony music streaming platform.

## Authentication Issues

### "Invalid login credentials"

**Cause**: Wrong email/password or account doesn't exist.

**Solution**:
- Verify email and password are correct
- Try resetting password in Supabase dashboard
- Check if email confirmation is required (Supabase settings)

### Signup not working

**Cause**: Email validation or Supabase configuration issue.

**Solution**:
1. Check Supabase dashboard > Authentication > Settings
2. Verify email confirmation is not blocking signups
3. Check browser console for detailed error messages
4. See `/auth/test-connection` page for diagnostics

### Session expires immediately

**Cause**: Cookie configuration or CORS issue.

**Solution**:
- Check Supabase URL is correct in `.env.local`
- Verify cookies are allowed in browser
- Clear browser cache and cookies

## S3 Upload Issues

### "Access Denied" error

**Cause**: IAM user doesn't have required permissions.

**Solution**:
1. Go to AWS IAM > Users > Your user > Permissions
2. Verify policy includes `s3:PutObject` and `s3:GetObject`
3. Check bucket name in policy matches actual bucket
4. Ensure policy is attached to IAM user (not just bucket)

### "CORS policy" error

**Cause**: S3 bucket CORS not configured or incorrect.

**Solution**:
1. Go to S3 Console > Your bucket > Permissions > CORS
2. Ensure `PUT` method is included
3. Check `AllowedOrigins` includes `http://localhost:3000` (dev) and production domain
4. Save and wait 10-30 seconds for changes to propagate

### "Region mismatch" error

**Cause**: `AWS_REGION` in `.env.local` doesn't match bucket region.

**Solution**:
1. Check bucket region in S3 Console (Properties tab)
2. Update `AWS_REGION` in `.env.local` to match
3. Restart dev server: `npm run dev`

### Upload succeeds but files not accessible

**Cause**: Files uploaded but presigned URLs not generated correctly.

**Solution**:
- Verify `s3:GetObject` permission in IAM policy
- Check file paths in database match S3 keys
- Test presigned URL generation manually

## Playback Issues

### Songs won't play

**Cause**: Presigned URL generation fails, expires, or the user is not subscribed.

**Solution**:
1. Check browser console for errors
2. Verify `/api/s3/presign-play` endpoint works
3. Check IAM user has `s3:GetObject` permission
4. Try refreshing the page (presigned URLs expire after 5 min)
5. Verify the user is Premium (go to `/subscription`)

### Audio player controls not working

**Cause**: React state or audio element issue.

**Solution**:
- Check browser console for JavaScript errors
- Verify `usePlayerStore` is working (check Zustand state)
- Try hard refresh (Ctrl+Shift+R)

### Images not loading

**Cause**: `S3Image` component not fetching presigned URLs.

**Solution**:
- Check browser Network tab for failed requests to `/api/s3/presign-play`
- Verify image URLs in database are correct S3 paths
- Check IAM user has `s3:GetObject` permission

## Database Issues

### "Table does not exist" error

**Cause**: Database schema not created.

**Solution**:
1. Go to Supabase dashboard > SQL Editor
2. Run `database.sql` script
3. Verify tables were created (Database > Tables)

### "Row Level Security" error

**Cause**: RLS policies blocking queries.

**Solution**:
- Check RLS is enabled but policies allow public read for songs
- Verify user is authenticated for protected queries
- Check Supabase logs for specific policy violations

### Stripe subscription saves but user is not recognized as subscribed

**Cause**: subscription sync couldn't write into `subscriptions` / `users` due to missing service role key, webhook not configured, or webhook delay.

**Solution**:
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (server-only)
- Ensure Stripe webhooks are configured for `/api/webhooks/stripe` and `STRIPE_WEBHOOK_SECRET` is set
- Use `POST /api/checkout-success` after redirect (app calls it automatically)
- Use `POST /api/sync-subscription` as a manual fallback

### Query returns empty array

**Cause**: No data or RLS blocking access.

**Solution**:
- Check if data exists in Supabase dashboard
- Verify RLS policies allow access
- Test query in Supabase SQL Editor

## GraphQL Issues

### "Unauthorized" error on queries

**Cause**: Query requires auth but user not logged in.

**Solution**:
- Check if query requires authentication (`songsByUserId`, `likedSongs`)
- Ensure user is logged in
- Check GraphQL context is extracting user correctly

### GraphQL endpoint not responding

**Cause**: Server error or build issue.

**Solution**:
1. Check server logs (terminal or Vercel logs)
2. Verify `app/api/graphql/route.ts` exists
3. Test GraphQL endpoint directly (use GraphQL Playground)
4. Check environment variables are set correctly

### Type errors in GraphQL resolvers

**Cause**: TypeScript types don't match database schema.

**Solution**:
- Regenerate types from Supabase if schema changed
- Check `types/database.ts` matches actual database
- Verify field names match (snake_case vs camelCase)

## Development Issues

### Build fails

**Cause**: TypeScript errors or missing dependencies.

**Solution**:
1. Run `npm install` to ensure dependencies are installed
2. Check TypeScript errors: `npm run build`
3. Fix any type errors shown
4. Clear `.next` folder and rebuild

### Hot reload not working

**Cause**: Next.js dev server issue.

**Solution**:
- Restart dev server: `npm run dev`
- Clear `.next` folder
- Check for file watching issues (too many files)

### Environment variables not loading

**Cause**: `.env.local` not in root or incorrect format.

**Solution**:
1. Verify `.env.local` is in project root (same level as `package.json`)
2. Check variable names start with `NEXT_PUBLIC_` for client-side
3. Restart dev server after changing `.env.local`
4. Never commit `.env.local` to git

## Performance Issues

### Slow page loads

**Cause**: Large bundle size or slow queries.

**Solution**:
- Check Network tab for slow requests
- Optimize images (compress before upload)
- Add database indexes for frequently queried fields
- Consider code splitting for large components

### High S3 costs

**Cause**: Many files or large file sizes.

**Solution**:
- Compress audio files before upload
- Set up S3 Lifecycle policies to archive old files
- Monitor S3 usage in AWS Console
- Consider CloudFront CDN for frequently accessed files

## Still Having Issues?

1. **Check Logs**:
   - Browser console (F12)
   - Terminal/Server logs
   - Supabase logs (Dashboard > Logs)
   - AWS CloudWatch (for S3 issues)

2. **Test Components**:
   - `/auth/test-connection` - Test Supabase connection
   - GraphQL Playground - Test API directly
   - AWS Console - Verify S3 configuration

3. **Verify Setup**:
   - All environment variables set correctly
   - Database schema applied
   - IAM permissions correct
   - CORS configured

4. **Get Help**:
   - Check [Supabase Docs](https://supabase.com/docs)
   - Check [AWS S3 Docs](https://docs.aws.amazon.com/s3)
   - Check [Next.js Docs](https://nextjs.org/docs)
