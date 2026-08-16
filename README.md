# 🎓 EduAI – AI Education Management Portal

EduAI is a web-based **Education Management Portal** that connects **Students, Staff, and Admin** through a common backend and SQLite database.

The system helps manage student records, courses, assignments, exams, marks, attendance, academic performance, and AI-based academic insights from a single platform.

## 🚀 Features

### 👨‍🎓 Student

* Student login
* View personal details
* View attendance
* View assigned courses
* View assignments and marks
* View exam schedules and marks
* View overall academic performance
* AI-based academic insights and recommendations

### 👩‍🏫 Staff

* Staff login
* Add, update, and delete students
* Manage student attendance
* Manage assignment marks
* Manage exam marks
* Manage courses
* Manage assignments
* Manage exams
* Search and filter students
* View low-performing students
* Export student performance data

### 👨‍💼 Admin

* Admin login
* Monitor total students
* Monitor courses and classes
* View attendance statistics
* View student academic performance
* Identify at-risk students
* View AI academic insights
* Monitor overall portal information

## 🛠️ Technologies Used

* **HTML5**
* **CSS3**
* **JavaScript**
* **Node.js**
* **Express.js**
* **SQLite**
* **better-sqlite3**
* **CORS**
* REST API

## 🏗️ Project Structure

```text
EduAI/
│
├── login.html
├── student-dashboard.html
├── student-details.html
├── staff-dashboard.html
├── admin-dashboard.html
│
└── backend/
    ├── server.js
    ├── education.db
    ├── package.json
    └── node_modules/
```

## 🔄 System Flow

```text
                 EduAI Portal
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
       Student      Staff       Admin
          │           │           │
          └───────────┼───────────┘
                      ↓
                 Node.js API
                      ↓
                 SQLite Database
```

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/EduAI.git
cd EduAI
```

### 2. Open the backend folder

```bash
cd backend
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the backend

```bash
node server.js
```

The backend will run at:

```text
http://localhost:5000
```

## 🔗 API

Main API endpoints include:

```text
GET    /api/students
POST   /api/students
PUT    /api/students/:id
DELETE /api/students/:id

GET    /api/courses
POST   /api/courses
PUT    /api/courses/:id
DELETE /api/courses/:id

GET    /api/assignments
POST   /api/assignments
PUT    /api/assignments/:id
DELETE /api/assignments/:id

GET    /api/exams
POST   /api/exams
PUT    /api/exams/:id
DELETE /api/exams/:id
```

The backend also provides APIs for student courses, assignment marks, exam marks, attendance, and AI academic analysis.

## 🔐 Demo Login

### Staff

```text
User ID: staff
Password: staff123
```

### Admin

```text
User ID: admin
Password: admin123
```

### Student

Use a **Student ID created by Staff**.

## 🎯 Purpose

The main goal of EduAI is to provide a centralized platform for managing academic information and helping institutions identify students who may need additional academic support.

## 🔮 Future Enhancements

* Real authentication and role-based authorization
* Teacher dashboard
* Course enrollment management
* Advanced AI predictions
* Attendance tracking by individual classes
* Automated notifications
* Detailed reports and charts
* Cloud database integration
* Mobile application

## 👩‍💻 Project

**EduAI – AI Education Management Portal**

Built as an education management project using **HTML, CSS, JavaScript, Node.js, Express.js, and SQLite**.
