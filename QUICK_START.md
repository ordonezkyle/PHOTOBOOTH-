# 🚀 Quick Setup Checklist

## Your Photobooth MySQL Connection - Quick Start

### ✅ Step-by-Step

**1. Install Dependencies** (Run once)
```
npm install
```

**2. Configure `.env` file** with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YourPassword
DB_NAME=photobooth
PORT=3000
```

**3. Create Database** (Run once):
```
mysql -u root -p < init.sql
```
Or paste `init.sql` contents in MySQL Workbench

**4. Start Server** (Every time):
```
node server.js
```

**5. Open Browser**:
```
http://localhost:3000
```

---

## 📊 What Happens Now?

✅ When you **capture photos** → Saved to MySQL database  
✅ When you **create collages** → Saved to MySQL database  
✅ Data stored with timestamps  
✅ Can retrieve photos anytime from database  

---

## 🔍 Verify It's Working

### Check Server is Running
Open browser: `http://localhost:3000` should show photobooth

### Check Database Connection
```
mysql -u root -p
USE photobooth;
SELECT COUNT(*) FROM photos;
```

### View Saved Photos
```
SELECT id, filename, created_at FROM photos;
```

---

## 🚨 Common Issues

| Problem | Solution |
|---------|----------|
| "ECONNREFUSED" | Start MySQL service |
| "Access denied" | Check DB_PASSWORD in .env |
| "Unknown database" | Run init.sql script |
| Images not saving | Check browser console (F12) for errors |
| Can't connect to server | Ensure Node.js server is running |

---

## 📁 Files Created/Modified

- ✅ `server.js` - Express backend (NEW)
- ✅ `db.js` - Database connection (NEW)
- ✅ `package.json` - Dependencies (NEW)
- ✅ `.env` - Configuration (NEW)
- ✅ `init.sql` - Database schema (NEW)
- ✅ `script.js` - Updated with API calls (MODIFIED)
- ✅ `SETUP_GUIDE.md` - Full documentation (NEW)

---

## 🎯 Test It!

1. Start server: `node server.js`
2. Open: `http://localhost:3000`
3. Capture a photo
4. Check database:
```
mysql -u root -p photobooth
SELECT * FROM photos WHERE id = 1 \G
```

---

**You're all set! 🎉**

Questions? Check `SETUP_GUIDE.md` for detailed documentation.
