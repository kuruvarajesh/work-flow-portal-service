# Assignment Portal Backend

Node.js + Express + MongoDB (Atlas-ready) backend for the **Assignment Workflow Portal**.

---

## 🚀 Setup Instructions

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd <project-folder>
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory of the project.  
You can start by copying the example file:

```bash
cp .env.example .env
```

Then, open `.env` and update the values as needed:

```bash
PORT=5000
MONGO_URI=your-mongodb-atlas-connection-string
```

> ⚠️ **Important:**  
> Do **not** commit your `.env` file to GitHub.  
> It should already be listed in `.gitignore` to keep your credentials secure.

---

### 4. Run the Server

#### For development:
```bash
npm run dev
```

#### For production:
```bash
npm start
```

---

### 5. API URL
Once the server is running, the backend will be available at:  
```
http://localhost:5000
```

---

### 6. Tech Stack
- **Node.js**
- **Express.js**
- **MongoDB (Atlas)**
- **Mongoose**
- **CORS**

---

### 7. Example `.env.example`
```bash
# Server Configuration
PORT=5000

# Database Configuration
MONGO_URI=mongodb+srv://username:password@clustername.mongodb.net/dbname
```

---

### 8. Notes
- Ensure MongoDB Atlas is properly configured and accessible.
- Replace placeholder credentials in `.env` with your actual details.
- Use `nodemon` (already configured) for hot reloading in development.

---