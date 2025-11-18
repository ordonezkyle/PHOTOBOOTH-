# 📸 Photobooth MySQL Database Setup Guide

## Overview
Your photobooth application is now configured to save photos and collages to a MySQL database.

---

## 📋 Prerequisites

Before starting, ensure you have:
1. **Node.js** installed (v14 or higher) - [Download](https://nodejs.org)
2. **MySQL Server** installed and running - [Download](https://dev.mysql.com/downloads/mysql/)
3. **MySQL command-line tools** or a GUI like **MySQL Workbench**

---

## 🚀 Quick Start (5 Steps)

### **Step 1: Install Node.js Dependencies**

Open PowerShell/Terminal in your `photobooth` directory and run:

```powershell
npm install
```

This will install:
- `express` - Web server framework
- `mysql2` - MySQL database driver
- `dotenv` - Environment variables
- `cors` - Cross-origin requests
- `body-parser` - Request parsing

---

### **Step 2: Configure Database Credentials**

Edit the `.env` file in your photobooth directory:

```env
# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YourPassword
DB_NAME=photobooth

# Server Configuration
PORT=3000
NODE_ENV=development
```

Replace `YourPassword` with your actual MySQL root password (or leave blank if no password).

---

### **Step 3: Create Database Tables**

**Option A: Using MySQL Command Line**

```powershell
mysql -u root -p < init.sql
```

(Enter your MySQL password when prompted)

**Option B: Using MySQL Workbench**

1. Open MySQL Workbench
2. Open the `init.sql` file
3. Execute the script

**Option C: Using Command Line (Alternative)**

```powershell
mysql -u root -p

# In MySQL prompt, paste the contents of init.sql and hit Enter
```

✅ Your database tables are now created!

---

### **Step 4: Start the Backend Server**

In PowerShell, navigate to your photobooth directory:

```powershell
cd C:\Users\admin\Desktop\photobooth
node server.js
```

You should see:
```
╔════════════════════════════════════╗
║   PHOTOBOOTH SERVER STARTED        ║
╠════════════════════════════════════╣
║ 🚀 Server: http://localhost:3000    ║
║ 📁 Static Files: Enabled            ║
║ 🗄️  MySQL: Connected               ║
║ 📷 API: /api/photos                ║
║ 🖼️  API: /api/collages             ║
╚════════════════════════════════════╝
```

---

### **Step 5: Open Your Photobooth App**

Open your browser and go to:

```
http://localhost:3000
```

Now when you capture photos or collages, they will automatically save to your MySQL database! 🎉

---

## 📡 API Endpoints Reference

### **Photos**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/photos` | Get all photos |
| GET | `/api/photos/:id` | Get single photo |
| POST | `/api/photos` | Save new photo |
| DELETE | `/api/photos/:id` | Delete photo |

### **Collages**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/collages` | Get all collages |
| POST | `/api/collages` | Save new collage |

### **Health Check**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server status |

---

## 🗄️ Database Schema

### **photos table**
```sql
- id: Auto-increment primary key
- filename: Photo filename
- data_url: Base64-encoded image data
- created_at: Timestamp
- updated_at: Updated timestamp
```

### **collages table**
```sql
- id: Auto-increment primary key
- title: Collage title
- format: '2x2' or 'vertical'
- data_url: Base64-encoded image data
- created_at: Timestamp
- updated_at: Updated timestamp
```

### **sessions table** (Optional)
```sql
- id: Auto-increment primary key
- session_id: Unique session identifier
- photo_count: Number of photos in session
- collage_id: Foreign key to collages table
- created_at: Timestamp
```

---

## 🔧 Troubleshooting

### **Error: "connect ECONNREFUSED"**
- MySQL is not running. Start MySQL service:
  ```powershell
  # Windows: Start MySQL from Services
  # Or use: net start MySQL80 (adjust version number)
  ```

### **Error: "Access denied for user 'root'"**
- Your database password is incorrect. Update `.env` file with correct credentials.

### **Error: "Unknown database 'photobooth'"**
- Run `init.sql` script first to create the database.

### **Images not saving**
- Check browser console (F12) for errors
- Verify backend server is running on http://localhost:3000
- Check `.env` file for correct database credentials

---

## 📊 Viewing Your Data

### **Using MySQL Command Line**

```powershell
mysql -u root -p

USE photobooth;

# View all photos
SELECT id, filename, created_at FROM photos;

# View all collages
SELECT id, title, format, created_at FROM collages;

# View a specific photo's data
SELECT data_url FROM photos WHERE id = 1;
```

### **Using MySQL Workbench**

1. Connect to your MySQL server
2. Select `photobooth` database
3. Click on tables to view data

---

## 🎯 How It Works

1. **Frontend** (HTML/JS): User captures photo or collage
2. **API Call**: Frontend sends image data to backend server
3. **Backend** (Node.js/Express): Receives request and validates data
4. **Database** (MySQL): Stores image as base64 data
5. **Response**: Server confirms save with photo/collage ID

```
[Browser] → POST /api/photos → [Server] → INSERT → [MySQL Database]
```

---

## 🚨 Important Notes

⚠️ **Base64 Image Storage Warning**
- Storing large images as base64 in database can use significant disk space
- For production, consider storing images as files and keeping only references in database
- Recommended: Keep LONGTEXT column but implement size limits

⚠️ **Security**
- Don't commit `.env` file to version control
- Use strong MySQL passwords in production
- Implement authentication for API endpoints
- Validate/sanitize all user inputs

---

## 📦 File Structure

```
photobooth/
├── index.html          # Frontend HTML
├── script.js           # Frontend JavaScript (updated with API calls)
├── styles.css          # Frontend styles
├── server.js           # Express backend server
├── db.js               # MySQL connection configuration
├── package.json        # Node.js dependencies
├── .env                # Database credentials (don't commit!)
└── init.sql            # Database schema
```

---

## ✅ Next Steps

After setup:

1. ✅ Test capturing photos - they should appear in database
2. ✅ View data in MySQL to confirm saves
3. ✅ Consider adding user authentication
4. ✅ Implement image file storage instead of base64 (for production)
5. ✅ Add image download from database
6. ✅ Create admin dashboard to view/manage photos

---

## 💡 Pro Tips

- Keep server running while using the app (or use `pm2` for auto-restart)
- Use `npm run dev` to run with auto-reload (install `nodemon` first)
- Monitor database size as images accumulate
- Regular backups recommended for production use

---

## 🆘 Need Help?

Check logs in terminal for error messages. Common issues are usually:
1. MySQL not running
2. Wrong password in `.env`
3. Database not initialized with `init.sql`
4. Server not running on port 3000

---

# How to Run Photobooth with MySQL Database

1. **Start MySQL Server**
   - Make sure MySQL is running on your PC.

2. **Import Database Schema**
   - Open MySQL Workbench.
   - Connect to your server (host: 127.0.0.1, user: root, password: !Champorado123).
   - Open `init.sql` and execute it to create the `photobooth` database and tables.

3. **Install Project Dependencies**
   - Open PowerShell in your project folder.
   - Run:
     ```powershell
     npm install
     ```

4. **Start the Backend Server**
   - In the same PowerShell window, run:
     ```powershell
     node server.js
     ```
   - This will start the Node.js backend and connect to your database.

5. **Open the Web App**
   - Open your browser and go to:
     ```
     http://localhost:3000
     ```
   - You should now see your photobooth app running and connected to MySQL.

---

**Troubleshooting:**
- If you get a database connection error, check your credentials in `db.js`.
- Make sure MySQL server is running and the `photobooth` database exists.
- If you need to change the port, update `server.js` and use the new port in your browser.

---

**Your photobooth is now database-enabled! 🎉📸**
