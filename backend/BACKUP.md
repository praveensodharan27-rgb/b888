# Backup Plan

Without backups, a DB crash or accidental delete means **game over**. This doc describes a minimal backup strategy.

---

## 1. MongoDB (primary data store)

### Option A: MongoDB Atlas (recommended if you use Atlas)

- **Automated backups:** Atlas offers continuous backup and point-in-time restore on paid tiers (M10+).
- **Snapshot:** In Atlas Dashboard → Cluster → Backup → Configure. Enable daily snapshots.
- **Restore:** Cluster → Backup → Restore to a point in time or from a snapshot.

### Option B: Self-hosted MongoDB (e.g. EC2, VPS)

**Daily backup with cron:**

1. **Install mongodump** (comes with MongoDB tools).

2. **Script** (save as `backend/scripts/backup-mongodb.sh`):

```bash
#!/bin/bash
# Run daily via cron: 0 2 * * * /path/to/backup-mongodb.sh
set -e
BACKUP_DIR="/var/backups/mongodb"   # or your path
DATE=$(date +%Y-%m-%d)
mkdir -p "$BACKUP_DIR"
# Use DATABASE_URL from env or .env
mongodump --uri="$DATABASE_URL" --out="$BACKUP_DIR/$DATE" --gzip
# Optional: keep only last 7 days
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

3. **Windows (PowerShell)** – same idea: run `mongodump` daily via Task Scheduler; store dumps in a folder and prune old ones.

4. **Restore:**

```bash
mongorestore --uri="$DATABASE_URL" --gzip --drop /path/to/backup/2025-02-05
```

**Important:** Store backups off the same server (e.g. S3, another machine). Otherwise a server failure can wipe both DB and backups.

---

## 2. Uploaded files (images)

- **Local uploads:** Back up the `backend/uploads` directory daily (e.g. rsync or copy to S3).
- **S3/Cloudinary:** Enable versioning (S3) or use provider’s backup; replicate to another region/bucket if critical.

---

## 3. Checklist

- [ ] Backup strategy chosen (Atlas automated vs self-hosted mongodump).
- [ ] Daily backup running (cron or Atlas).
- [ ] Backup destination is off the main server (e.g. S3, second region).
- [ ] Restore tested at least once (e.g. to a staging DB).
- [ ] Retention defined (e.g. keep 7 days, or 30 days for weekly).

---

## 4. Quick restore test (self-hosted)

```bash
# 1. Create a backup
mongodump --uri="$DATABASE_URL" --out=./backup-test --gzip

# 2. Restore to a separate DB (e.g. olx_app_restore) to verify
mongorestore --uri="mongodb://.../olx_app_restore" --gzip ./backup-test
```

If this works, your backup is usable.
