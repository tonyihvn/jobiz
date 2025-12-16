Import backup into MySQL

This folder contains helper scripts to seed or import demo/local data into the MySQL schema created in `schema.sql`.

1) Generate a backup from the app (in browser):
   - Log in as Super Admin (or a user with backup access) and run the app's backup feature which returns a JSON string.
   - Save that JSON into `scripts/local_backup.json` or provide a path to the importer.

2) Ensure your `.env` is configured (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT)

3) Install dependencies if needed:

```powershell
npm install mysql2 dotenv
```

4) Run the importer (PowerShell):

```powershell
node .\scripts\import_backup.js .\scripts\local_backup.json
```

If you omit the path, the script will look for `scripts/local_backup.json` by default.

Notes:
- The importer uses `INSERT ... ON DUPLICATE KEY UPDATE` to be idempotent.
- Sales and sale items mapping attempt to match the schema in `schema.sql`; complex custom fields may need manual adjustment.
- Passwords in the backup are inserted as-is; migrating to hashed passwords is recommended for production.
