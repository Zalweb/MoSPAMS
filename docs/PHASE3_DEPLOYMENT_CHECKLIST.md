# Phase 3 Deployment Checklist

## Pre-Deployment Verification

### Code Review
- [ ] All changes reviewed by senior developer
- [ ] Security audit completed
- [ ] No hardcoded credentials or secrets
- [ ] All console.log/dd() statements removed
- [ ] Code follows project guidelines

### Testing
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Multi-tenancy tests passing (11/11)
- [ ] Manual testing completed in staging
- [ ] Cross-browser testing completed (if frontend changes)

### Database
- [ ] Migrations reviewed
- [ ] Seeders reviewed
- [ ] Backup strategy confirmed
- [ ] Rollback plan documented

### Documentation
- [ ] PHASE3_COMPLETE.md reviewed
- [ ] MULTI_TENANCY_GUIDE.md reviewed
- [ ] API documentation updated (if needed)
- [ ] README updated (if needed)

---

## Deployment Steps

### 1. Pre-Deployment Backup
```bash
# Backup database
mysqldump -u root -p mospams_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup .env file
cp Backend/.env Backend/.env.backup

# Tag current version
git tag -a v1.0-pre-phase3 -m "Before Phase 3 deployment"
git push origin v1.0-pre-phase3
```
- [ ] Database backed up
- [ ] .env backed up
- [ ] Git tag created

### 2. Deploy Code
```bash
# Pull latest code
cd /path/to/MoSPAMS
git pull origin main

# Install dependencies
cd Backend
composer install --no-dev --optimize-autoloader

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```
- [ ] Code pulled
- [ ] Dependencies installed
- [ ] Caches cleared

### 3. Run Migrations
```bash
# Run migrations
php artisan migrate --force

# Verify migrations
php artisan migrate:status
```
- [ ] Migrations executed successfully
- [ ] Migration status verified

### 4. Run Seeders
```bash
# Seed roles and statuses
php artisan db:seed --class=RolesAndStatusesSeeder --force

# Seed shops and SuperAdmin
php artisan db:seed --class=ShopsSeeder --force
```
- [ ] Roles seeded
- [ ] Shops seeded
- [ ] SuperAdmin created

### 5. Verify Database
```bash
# Check shop_id_fk columns exist
mysql -u root -p mospams_db -e "SHOW COLUMNS FROM parts LIKE 'shop_id_fk';"
mysql -u root -p mospams_db -e "SHOW COLUMNS FROM service_jobs LIKE 'shop_id_fk';"
mysql -u root -p mospams_db -e "SHOW COLUMNS FROM sales LIKE 'shop_id_fk';"

# Check shops table
mysql -u root -p mospams_db -e "SELECT * FROM shops;"

# Check SuperAdmin user
mysql -u root -p mospams_db -e "SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id_fk = r.role_id WHERE r.role_name = 'SuperAdmin';"
```
- [ ] shop_id_fk columns exist
- [ ] Shops table populated
- [ ] SuperAdmin user exists

### 6. Run Tests
```bash
# Run multi-tenancy tests
php artisan test --filter MultiTenancyTest

# Run all tests
php artisan test
```
- [ ] Multi-tenancy tests pass (11/11)
- [ ] All tests pass

### 7. Smoke Tests
```bash
# Test SuperAdmin login
curl -X POST http://your-domain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin","password":"YOUR_PASSWORD"}'

# Test shop owner login
curl -X POST http://your-domain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@shop.com","password":"password"}'
```
- [ ] SuperAdmin can login
- [ ] Shop owner can login
- [ ] Token returned successfully

### 8. Verify Endpoints
```bash
# Get auth token first
TOKEN="your-token-here"

# Test parts endpoint (should be scoped)
curl -X GET http://your-domain.com/api/parts \
  -H "Authorization: Bearer $TOKEN"

# Test users endpoint (should be scoped)
curl -X GET http://your-domain.com/api/users \
  -H "Authorization: Bearer $TOKEN"

# Test reports endpoint (should be scoped)
curl -X GET http://your-domain.com/api/reports/sales \
  -H "Authorization: Bearer $TOKEN"
```
- [ ] Parts endpoint returns scoped data
- [ ] Users endpoint returns scoped data
- [ ] Reports endpoint returns scoped data

### 9. Security Verification
```bash
# Test cross-tenant access (should fail)
# Login as Shop A user, try to access Shop B's data
# This should return 404

# Test suspended shop (should fail)
# Suspend a shop, try to login
# This should return 403
```
- [ ] Cross-tenant access blocked
- [ ] Suspended shop access blocked

### 10. Performance Check
```bash
# Check query performance
mysql -u root -p mospams_db -e "EXPLAIN SELECT * FROM parts WHERE shop_id_fk = 1;"

# Should show "Using index" or "Using where; Using index"
```
- [ ] Queries use shop_id_fk index
- [ ] No full table scans

---

## Post-Deployment Verification

### Functional Tests
- [ ] Login works for all user types
- [ ] Shop owners can only see their data
- [ ] SuperAdmin can see all data
- [ ] CRUD operations work correctly
- [ ] Reports show correct data
- [ ] Activity logs are created

### Security Tests
- [ ] Cross-tenant access is blocked
- [ ] Suspended shops are blocked
- [ ] Unauthorized access is blocked
- [ ] No data leakage in error messages

### Performance Tests
- [ ] Page load times acceptable
- [ ] API response times < 200ms
- [ ] Database queries optimized
- [ ] No N+1 query issues

---

## Rollback Procedure

If critical issues are found:

### 1. Stop Application
```bash
# Put application in maintenance mode
php artisan down --message="Emergency maintenance"
```
- [ ] Application in maintenance mode

### 2. Restore Database
```bash
# Restore from backup
mysql -u root -p mospams_db < backup_YYYYMMDD_HHMMSS.sql
```
- [ ] Database restored

### 3. Revert Code
```bash
# Revert to previous version
git revert HEAD
git push origin main

# Or checkout previous tag
git checkout v1.0-pre-phase3
```
- [ ] Code reverted

### 4. Clear Caches
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```
- [ ] Caches cleared

### 5. Bring Application Online
```bash
php artisan up
```
- [ ] Application online

### 6. Verify Rollback
- [ ] Application accessible
- [ ] Data intact
- [ ] No errors in logs

---

## Monitoring

### First 24 Hours
- [ ] Monitor error logs every hour
- [ ] Monitor 404 errors (may indicate scoping issues)
- [ ] Monitor 403 errors (suspended shops)
- [ ] Monitor query performance
- [ ] Monitor user complaints/support tickets

### First Week
- [ ] Daily log review
- [ ] Performance metrics review
- [ ] User feedback collection
- [ ] Security audit review

---

## Success Criteria

Deployment is successful if:
- [ ] All tests pass
- [ ] No critical errors in logs
- [ ] Users can access their data
- [ ] Cross-tenant isolation verified
- [ ] Performance acceptable
- [ ] No security incidents

---

## Sign-Off

### Development Team
- [ ] Code complete and tested
- [ ] Documentation complete
- [ ] Ready for deployment

**Signed:** _________________ Date: _______

### QA Team
- [ ] All tests passed
- [ ] Security verified
- [ ] Performance acceptable

**Signed:** _________________ Date: _______

### DevOps Team
- [ ] Deployment successful
- [ ] Monitoring configured
- [ ] Rollback plan tested

**Signed:** _________________ Date: _______

### Product Owner
- [ ] Functionality verified
- [ ] Acceptance criteria met
- [ ] Approved for production

**Signed:** _________________ Date: _______

---

## Emergency Contacts

**Development Lead:** [Name] - [Phone] - [Email]  
**DevOps Lead:** [Name] - [Phone] - [Email]  
**Security Lead:** [Name] - [Phone] - [Email]  
**Product Owner:** [Name] - [Phone] - [Email]

---

## Notes

[Space for deployment notes, issues encountered, resolutions, etc.]

---

**Deployment Date:** _____________  
**Deployment Time:** _____________  
**Deployed By:** _____________  
**Deployment Status:** [ ] Success [ ] Failed [ ] Rolled Back
