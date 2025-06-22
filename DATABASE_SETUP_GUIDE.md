<!-- @format -->

# Database Setup and Deployment Guide

## 🎯 Current Status

✅ **Neon Extension Installed**: Extension ID 3580 is active
✅ **Environment Variables Set**: `NETLIFY_DATABASE_URL` and `DATABASE_URL` configured  
✅ **Database Connection**: Valid Neon PostgreSQL connection string
✅ **Schema Defined**: Complete Drizzle schema with all tables
✅ **Migration Files**: SQL migration files ready to deploy
✅ **Auto-Migration**: Server includes automatic table creation logic

## 🚀 Quick Start

### 1. Test Database Connection (Optional)

```bash
# Test your database connection locally
pnpm run db:test
```

### 2. Deploy to Netlify

```bash
# Build and deploy
pnpm run build:netlify

# Then push to your Git repository
git add .
git commit -m "Database setup complete"
git push origin main
```

### 3. Verify Deployment

After deployment, test your API endpoints:

- Visit: `https://3dpc-webpage.netlify.app/api/health`
- Test DB: `https://3dpc-webpage.netlify.app/api/admin/init-db-test`

## 🔧 How It Works

### Automatic Database Initialization

The server includes smart initialization logic that:

1. **Checks database connectivity** on first request
2. **Verifies table existence** for all required tables
3. **Automatically creates missing tables** using embedded SQL
4. **Validates foreign key constraints** are properly set up
5. **Logs the entire process** for debugging

### Tables Created Automatically

- `users` - User accounts and profiles
- `clubs` - Club/organization information
- `orders` - 3D printing requests
- `batches` - Grouped printing jobs
- `audit_logs` - System activity tracking
- `system_config` - Application configuration

### Environment Variables Used

- `NETLIFY_DATABASE_URL` (preferred) - Set by Neon extension
- `DATABASE_URL` (fallback) - Manual configuration
- Both point to the same Neon PostgreSQL instance

## 🐛 Troubleshooting

### Common Issues & Solutions

**❌ "Database tables do not exist"**

- ✅ **Solution**: The server will auto-create them on the next API request
- ✅ **Manual test**: Visit `/api/admin/init-db-test` endpoint

**❌ "Database connection failed"**

- ✅ **Check**: Verify `NETLIFY_DATABASE_URL` in Netlify dashboard
- ✅ **Check**: Ensure Neon database is not paused
- ✅ **Check**: Run `pnpm run db:test` locally

**❌ "Token verification failed"**

- ✅ **Expected**: Firebase tokens will fail without proper setup
- ✅ **Note**: Registration endpoints work without Firebase

**❌ "Function timeout"**

- ✅ **Cause**: Database initialization on cold start
- ✅ **Solution**: Retry the request (tables will be cached after first creation)

### Debug Commands

```bash
# Test database locally
pnpm run db:test

# Check deployment (dry run)
node deploy-netlify.js --dry-run

# View server logs in Netlify dashboard
# Site Overview > Functions > server > View logs
```

## 📊 Monitoring

### Check Database Status

```bash
# Local test
curl https://3dpc-webpage.netlify.app/api/health

# Database-specific test
curl https://3dpc-webpage.netlify.app/api/admin/init-db-test
```

### Expected API Responses

- `/api/health` - Returns `{"status": "ok", ...}`
- `/api/admin/init-db-test` - Returns detailed database status
- `/api/user/register` - Accepts user registration (creates users table if missing)

## 🔄 Next Steps

1. **Test User Registration**: Try registering with an `@smail.iitm.ac.in` email
2. **Monitor Function Logs**: Check Netlify dashboard for any errors
3. **Add Sample Data**: Consider adding clubs and test orders
4. **Setup Monitoring**: Monitor database usage in Neon dashboard

## 📚 Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Your Neon Dashboard](https://console.neon.tech/)

---

**Database URL**: `postgresql://neondb_owner:***@ep-fancy-recipe-a55ll7tz-pooler.us-east-2.aws.neon.tech/neondb`  
**Region**: US East 2 (Ohio)  
**Status**: ✅ Ready for Production
