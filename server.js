const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = 5000;

/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(cors());
app.use(express.json());

/* =====================================================
   DATABASE
===================================================== */

const db = new Database("education.db");


/* =====================================================
   HELPERS
===================================================== */

function cleanText(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
}


function numberValue(value) {
    const number = Number.parseFloat(value);

    return Number.isNaN(number) ? 0 : number;
}


function percentage(value) {
    return Math.min(
        100,
        Math.max(
            0,
            numberValue(value)
        )
    );
}


function calculateOverall(student) {
    const assignment =
        percentage(student.assignment);

    const exam =
        percentage(student.exam);

    return Math.round(
        (assignment + exam) / 2
    );
}


function getAcademicStatus(student) {

    const attendance =
        percentage(student.attendance);

    const overall =
        calculateOverall(student);

    if (
        attendance < 60 ||
        overall < 40
    ) {
        return "High Risk";
    }

    if (
        attendance < 75 ||
        overall < 60
    ) {
        return "Needs Improvement";
    }

    return "Good";
}


/* =====================================================
   STUDENTS TABLE
===================================================== */

db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        className TEXT DEFAULT '',
        section TEXT DEFAULT '',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        attendance REAL DEFAULT 0,
        assignment REAL DEFAULT 0,
        exam REAL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
`).run();


/* =====================================================
   COURSES TABLE
===================================================== */

db.prepare(`
    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        courseCode TEXT UNIQUE,
        courseName TEXT NOT NULL,
        faculty TEXT DEFAULT '',
        semester TEXT DEFAULT '',
        description TEXT DEFAULT '',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
`).run();


/* =====================================================
   STUDENT COURSES TABLE
===================================================== */

db.prepare(`
    CREATE TABLE IF NOT EXISTS student_courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId TEXT NOT NULL,
        courseId INTEGER NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(studentId, courseId),

        FOREIGN KEY(studentId)
            REFERENCES students(id)
            ON DELETE CASCADE,

        FOREIGN KEY(courseId)
            REFERENCES courses(id)
            ON DELETE CASCADE
    )
`).run();


/* =====================================================
   ASSIGNMENTS TABLE
===================================================== */

db.prepare(`
    CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        courseId INTEGER,
        dueDate TEXT,
        maxMark REAL DEFAULT 100,
        description TEXT DEFAULT '',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(courseId)
            REFERENCES courses(id)
            ON DELETE SET NULL
    )
`).run();


/* =====================================================
   STUDENT ASSIGNMENT MARKS
===================================================== */

db.prepare(`
    CREATE TABLE IF NOT EXISTS assignment_marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignmentId INTEGER NOT NULL,
        studentId TEXT NOT NULL,
        mark REAL DEFAULT 0,
        status TEXT DEFAULT 'Pending',
        submittedAt TEXT DEFAULT '',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(assignmentId, studentId),

        FOREIGN KEY(assignmentId)
            REFERENCES assignments(id)
            ON DELETE CASCADE,

        FOREIGN KEY(studentId)
            REFERENCES students(id)
            ON DELETE CASCADE
    )
`).run();


/* =====================================================
   EXAMS TABLE
===================================================== */

db.prepare(`
    CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        examName TEXT NOT NULL,
        courseId INTEGER,
        examDate TEXT,
        maxMark REAL DEFAULT 100,
        description TEXT DEFAULT '',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(courseId)
            REFERENCES courses(id)
            ON DELETE SET NULL
    )
`).run();


/* =====================================================
   STUDENT EXAM MARKS
===================================================== */

db.prepare(`
    CREATE TABLE IF NOT EXISTS exam_marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        examId INTEGER NOT NULL,
        studentId TEXT NOT NULL,
        mark REAL DEFAULT 0,
        result TEXT DEFAULT '',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(examId, studentId),

        FOREIGN KEY(examId)
            REFERENCES exams(id)
            ON DELETE CASCADE,

        FOREIGN KEY(studentId)
            REFERENCES students(id)
            ON DELETE CASCADE
    )
`).run();


/* =====================================================
   OLD DATABASE COLUMNS
===================================================== */

function addColumnIfMissing(column, definition) {

    try {

        db.prepare(
            `ALTER TABLE students ADD COLUMN ${column} ${definition}`
        ).run();

    } catch (error) {
        // Already exists
    }
}

addColumnIfMissing(
    "className",
    "TEXT DEFAULT ''"
);

addColumnIfMissing(
    "section",
    "TEXT DEFAULT ''"
);

addColumnIfMissing(
    "email",
    "TEXT DEFAULT ''"
);

addColumnIfMissing(
    "phone",
    "TEXT DEFAULT ''"
);

addColumnIfMissing(
    "attendance",
    "REAL DEFAULT 0"
);

addColumnIfMissing(
    "assignment",
    "REAL DEFAULT 0"
);

addColumnIfMissing(
    "exam",
    "REAL DEFAULT 0"
);

addColumnIfMissing(
    "createdAt",
    "TEXT"
);

addColumnIfMissing(
    "updatedAt",
    "TEXT"
);


/* =====================================================
   TEST
===================================================== */

app.get("/", (req, res) => {

    res.json({
        success: true,
        message:
            "Education Management Portal Backend is running!",
        port: PORT
    });

});


/* =====================================================
   HEALTH
===================================================== */

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "Backend is healthy"
    });

});


/* =====================================================
   STUDENTS
===================================================== */

/* GET ALL STUDENTS */

app.get("/api/students", (req, res) => {

    try {

        const students =
            db.prepare(`
                SELECT *
                FROM students
                ORDER BY rowid DESC
            `).all();


        const result =
            students.map(student => ({

                ...student,

                overall:
                    calculateOverall(student),

                status:
                    getAcademicStatus(student)

            }));


        res.json(result);

    } catch (error) {

        console.error(
            "GET STUDENTS ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load students"

        });

    }

});


/* GET ONE STUDENT */

app.get("/api/students/:id", (req, res) => {

    try {

        const id =
            cleanText(req.params.id);


        const student =
            db.prepare(`
                SELECT *
                FROM students
                WHERE id = ?
            `).get(id);


        if (!student) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Student not found"

                });

        }


        res.json({

            success: true,

            student: {

                ...student,

                overall:
                    calculateOverall(student),

                status:
                    getAcademicStatus(student)

            }

        });

    } catch (error) {

        console.error(
            "GET ONE STUDENT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load student"

        });

    }

});


/* ADD STUDENT */

app.post("/api/students", (req, res) => {

    try {

        const id =
            cleanText(req.body.id);

        const name =
            cleanText(req.body.name);

        const className =
            cleanText(req.body.className);

        const section =
            cleanText(req.body.section);

        const email =
            cleanText(req.body.email);

        const phone =
            cleanText(req.body.phone);

        const attendance =
            percentage(req.body.attendance);

        const assignment =
            percentage(req.body.assignment);

        const exam =
            percentage(req.body.exam);


        if (!id || !name) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Student ID and Name are required"

                });

        }


        const existing =
            db.prepare(`
                SELECT id
                FROM students
                WHERE id = ?
            `).get(id);


        if (existing) {

            return res
                .status(409)
                .json({

                    success: false,

                    message:
                        "Student ID already exists"

                });

        }


        const now =
            new Date().toISOString();


        db.prepare(`
            INSERT INTO students
            (
                id,
                name,
                className,
                section,
                email,
                phone,
                attendance,
                assignment,
                exam,
                createdAt,
                updatedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(

            id,
            name,
            className,
            section,
            email,
            phone,
            attendance,
            assignment,
            exam,
            now,
            now

        );


        const student =
            db.prepare(`
                SELECT *
                FROM students
                WHERE id = ?
            `).get(id);


        res.status(201).json({

            success: true,

            message:
                "Student added successfully",

            student: {

                ...student,

                overall:
                    calculateOverall(student),

                status:
                    getAcademicStatus(student)

            }

        });

    } catch (error) {

        console.error(
            "ADD STUDENT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to add student"

        });

    }

});


/* UPDATE STUDENT */

app.put("/api/students/:id", (req, res) => {

    try {

        const id =
            cleanText(req.params.id);


        const existing =
            db.prepare(`
                SELECT id
                FROM students
                WHERE id = ?
            `).get(id);


        if (!existing) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Student not found"

                });

        }


        const name =
            cleanText(req.body.name);

        const className =
            cleanText(req.body.className);

        const section =
            cleanText(req.body.section);

        const email =
            cleanText(req.body.email);

        const phone =
            cleanText(req.body.phone);

        const attendance =
            percentage(req.body.attendance);

        const assignment =
            percentage(req.body.assignment);

        const exam =
            percentage(req.body.exam);


        if (!name) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Student name is required"

                });

        }


        const now =
            new Date().toISOString();


        db.prepare(`
            UPDATE students
            SET
                name = ?,
                className = ?,
                section = ?,
                email = ?,
                phone = ?,
                attendance = ?,
                assignment = ?,
                exam = ?,
                updatedAt = ?
            WHERE id = ?
        `).run(

            name,
            className,
            section,
            email,
            phone,
            attendance,
            assignment,
            exam,
            now,
            id

        );


        const student =
            db.prepare(`
                SELECT *
                FROM students
                WHERE id = ?
            `).get(id);


        res.json({

            success: true,

            message:
                "Student updated successfully",

            student: {

                ...student,

                overall:
                    calculateOverall(student),

                status:
                    getAcademicStatus(student)

            }

        });

    } catch (error) {

        console.error(
            "UPDATE STUDENT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to update student"

        });

    }

});


/* DELETE STUDENT */

app.delete("/api/students/:id", (req, res) => {

    try {

        const id =
            cleanText(req.params.id);


        const existing =
            db.prepare(`
                SELECT id
                FROM students
                WHERE id = ?
            `).get(id);


        if (!existing) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Student not found"

                });

        }


        db.prepare(`
            DELETE FROM students
            WHERE id = ?
        `).run(id);


        res.json({

            success: true,

            message:
                "Student deleted successfully"

        });

    } catch (error) {

        console.error(
            "DELETE STUDENT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to delete student"

        });

    }

});


/* =====================================================
   ATTENDANCE / BASIC MARK APIs
===================================================== */

app.put(
    "/api/students/:id/attendance",
    (req, res) => {

        try {

            const id =
                cleanText(req.params.id);

            const attendance =
                percentage(
                    req.body.attendance
                );


            const result =
                db.prepare(`
                    UPDATE students
                    SET
                        attendance = ?,
                        updatedAt = ?
                    WHERE id = ?
                `).run(

                    attendance,
                    new Date().toISOString(),
                    id

                );


            if (!result.changes) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Student not found"

                    });

            }


            res.json({

                success: true,

                message:
                    "Attendance updated successfully",

                attendance

            });

        } catch (error) {

            console.error(
                "ATTENDANCE ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to update attendance"

            });

        }

    }
);


app.put(
    "/api/students/:id/assignment",
    (req, res) => {

        try {

            const id =
                cleanText(req.params.id);

            const assignment =
                percentage(
                    req.body.assignment
                );


            const result =
                db.prepare(`
                    UPDATE students
                    SET
                        assignment = ?,
                        updatedAt = ?
                    WHERE id = ?
                `).run(

                    assignment,
                    new Date().toISOString(),
                    id

                );


            if (!result.changes) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Student not found"

                    });

            }


            res.json({

                success: true,

                message:
                    "Assignment mark updated successfully",

                assignment

            });

        } catch (error) {

            console.error(
                "ASSIGNMENT ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to update assignment"

            });

        }

    }
);


app.put(
    "/api/students/:id/exam",
    (req, res) => {

        try {

            const id =
                cleanText(req.params.id);

            const exam =
                percentage(
                    req.body.exam
                );


            const result =
                db.prepare(`
                    UPDATE students
                    SET
                        exam = ?,
                        updatedAt = ?
                    WHERE id = ?
                `).run(

                    exam,
                    new Date().toISOString(),
                    id

                );


            if (!result.changes) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Student not found"

                    });

            }


            res.json({

                success: true,

                message:
                    "Exam mark updated successfully",

                exam

            });

        } catch (error) {

            console.error(
                "EXAM ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to update exam"

            });

        }

    }
);


/* =====================================================
   COURSES
===================================================== */

/* GET ALL COURSES */

app.get("/api/courses", (req, res) => {

    try {

        const courses =
            db.prepare(`
                SELECT *
                FROM courses
                ORDER BY id DESC
            `).all();


        res.json({

            success: true,

            courses

        });

    } catch (error) {

        console.error(
            "GET COURSES ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load courses"

        });

    }

});


/* GET ONE COURSE */

app.get("/api/courses/:id", (req, res) => {

    try {

        const courseId =
            Number(req.params.id);


        const course =
            db.prepare(`
                SELECT *
                FROM courses
                WHERE id = ?
            `).get(courseId);


        if (!course) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Course not found"

                });

        }


        res.json({

            success: true,

            course

        });

    } catch (error) {

        console.error(
            "GET COURSE ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load course"

        });

    }

});


/* ADD COURSE */

app.post("/api/courses", (req, res) => {

    try {

        const courseCode =
            cleanText(
                req.body.courseCode
            );

        const courseName =
            cleanText(
                req.body.courseName
            );

        const faculty =
            cleanText(
                req.body.faculty
            );

        const semester =
            cleanText(
                req.body.semester
            );

        const description =
            cleanText(
                req.body.description
            );


        if (!courseName) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Course name is required"

                });

        }


        try {

            const result =
                db.prepare(`
                    INSERT INTO courses
                    (
                        courseCode,
                        courseName,
                        faculty,
                        semester,
                        description
                    )
                    VALUES (?, ?, ?, ?, ?)
                `).run(

                    courseCode,
                    courseName,
                    faculty,
                    semester,
                    description

                );


            const course =
                db.prepare(`
                    SELECT *
                    FROM courses
                    WHERE id = ?
                `).get(result.lastInsertRowid);


            res.status(201).json({

                success: true,

                message:
                    "Course added successfully",

                course

            });

        } catch (insertError) {

            if (
                String(
                    insertError.message
                ).includes("UNIQUE")
            ) {

                return res
                    .status(409)
                    .json({

                        success: false,

                        message:
                            "Course code already exists"

                    });

            }

            throw insertError;

        }

    } catch (error) {

        console.error(
            "ADD COURSE ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to add course"

        });

    }

});


/* UPDATE COURSE */

app.put("/api/courses/:id", (req, res) => {

    try {

        const courseId =
            Number(req.params.id);


        const courseName =
            cleanText(
                req.body.courseName
            );

        const courseCode =
            cleanText(
                req.body.courseCode
            );

        const faculty =
            cleanText(
                req.body.faculty
            );

        const semester =
            cleanText(
                req.body.semester
            );

        const description =
            cleanText(
                req.body.description
            );


        if (!courseName) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Course name is required"

                });

        }


        const result =
            db.prepare(`
                UPDATE courses
                SET
                    courseCode = ?,
                    courseName = ?,
                    faculty = ?,
                    semester = ?,
                    description = ?
                WHERE id = ?
            `).run(

                courseCode,
                courseName,
                faculty,
                semester,
                description,
                courseId

            );


        if (!result.changes) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Course not found"

                });

        }


        const course =
            db.prepare(`
                SELECT *
                FROM courses
                WHERE id = ?
            `).get(courseId);


        res.json({

            success: true,

            message:
                "Course updated successfully",

            course

        });

    } catch (error) {

        console.error(
            "UPDATE COURSE ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to update course"

        });

    }

});


/* DELETE COURSE */

app.delete("/api/courses/:id", (req, res) => {

    try {

        const courseId =
            Number(req.params.id);


        const result =
            db.prepare(`
                DELETE FROM courses
                WHERE id = ?
            `).run(courseId);


        if (!result.changes) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Course not found"

                });

        }


        res.json({

            success: true,

            message:
                "Course deleted successfully"

        });

    } catch (error) {

        console.error(
            "DELETE COURSE ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to delete course"

        });

    }

});


/* =====================================================
   ASSIGN COURSE TO STUDENT
===================================================== */

app.post(
    "/api/students/:studentId/courses/:courseId",
    (req, res) => {

        try {

            const studentId =
                cleanText(
                    req.params.studentId
                );

            const courseId =
                Number(
                    req.params.courseId
                );


            const student =
                db.prepare(`
                    SELECT id
                    FROM students
                    WHERE id = ?
                `).get(studentId);


            if (!student) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Student not found"

                    });

            }


            const course =
                db.prepare(`
                    SELECT id
                    FROM courses
                    WHERE id = ?
                `).get(courseId);


            if (!course) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Course not found"

                    });

            }


            try {

                db.prepare(`
                    INSERT INTO student_courses
                    (
                        studentId,
                        courseId
                    )
                    VALUES (?, ?)
                `).run(
                    studentId,
                    courseId
                );

            } catch (insertError) {

                if (
                    String(
                        insertError.message
                    ).includes("UNIQUE")
                ) {

                    return res
                        .status(409)
                        .json({

                            success: false,

                            message:
                                "Course already assigned to this student"

                        });

                }

                throw insertError;

            }


            res.status(201).json({

                success: true,

                message:
                    "Course assigned successfully"

            });

        } catch (error) {

            console.error(
                "ASSIGN COURSE ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to assign course"

            });

        }

    }
);


/* REMOVE COURSE FROM STUDENT */

app.delete(
    "/api/students/:studentId/courses/:courseId",
    (req, res) => {

        try {

            const studentId =
                cleanText(
                    req.params.studentId
                );

            const courseId =
                Number(
                    req.params.courseId
                );


            const result =
                db.prepare(`
                    DELETE FROM student_courses
                    WHERE studentId = ?
                    AND courseId = ?
                `).run(
                    studentId,
                    courseId
                );


            if (!result.changes) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Course assignment not found"

                    });

            }


            res.json({

                success: true,

                message:
                    "Course removed from student"

            });

        } catch (error) {

            console.error(
                "REMOVE COURSE ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to remove course"

            });

        }

    }
);


/* GET STUDENT COURSES */

app.get(
    "/api/students/:studentId/courses",
    (req, res) => {

        try {

            const studentId =
                cleanText(
                    req.params.studentId
                );


            const courses =
                db.prepare(`
                    SELECT
                        c.id,
                        c.courseCode,
                        c.courseName,
                        c.faculty,
                        c.semester,
                        c.description
                    FROM courses c
                    INNER JOIN student_courses sc
                        ON c.id = sc.courseId
                    WHERE sc.studentId = ?
                    ORDER BY c.courseName
                `).all(studentId);


            res.json({

                success: true,

                courses

            });

        } catch (error) {

            console.error(
                "GET STUDENT COURSES ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to load student courses"

            });

        }

    }
);


/* =====================================================
   ASSIGNMENTS
===================================================== */

/* GET ALL ASSIGNMENTS */

app.get("/api/assignments", (req, res) => {

    try {

        const assignments =
            db.prepare(`
                SELECT
                    a.*,
                    c.courseCode,
                    c.courseName
                FROM assignments a
                LEFT JOIN courses c
                    ON a.courseId = c.id
                ORDER BY a.id DESC
            `).all();


        res.json({

            success: true,

            assignments

        });

    } catch (error) {

        console.error(
            "GET ASSIGNMENTS ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load assignments"

        });

    }

});


/* ADD ASSIGNMENT */

app.post("/api/assignments", (req, res) => {

    try {

        const title =
            cleanText(
                req.body.title
            );

        const courseId =
            req.body.courseId
                ? Number(req.body.courseId)
                : null;

        const dueDate =
            cleanText(
                req.body.dueDate
            );

        const maxMark =
            numberValue(
                req.body.maxMark || 100
            );

        const description =
            cleanText(
                req.body.description
            );


        if (!title) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Assignment title is required"

                });

        }


        const result =
            db.prepare(`
                INSERT INTO assignments
                (
                    title,
                    courseId,
                    dueDate,
                    maxMark,
                    description
                )
                VALUES (?, ?, ?, ?, ?)
            `).run(

                title,
                courseId,
                dueDate,
                maxMark,
                description

            );


        const assignment =
            db.prepare(`
                SELECT
                    a.*,
                    c.courseCode,
                    c.courseName
                FROM assignments a
                LEFT JOIN courses c
                    ON a.courseId = c.id
                WHERE a.id = ?
            `).get(
                result.lastInsertRowid
            );


        res.status(201).json({

            success: true,

            message:
                "Assignment added successfully",

            assignment

        });

    } catch (error) {

        console.error(
            "ADD ASSIGNMENT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to add assignment"

        });

    }

});


/* UPDATE ASSIGNMENT */

app.put("/api/assignments/:id", (req, res) => {

    try {

        const assignmentId =
            Number(req.params.id);


        const title =
            cleanText(
                req.body.title
            );

        const courseId =
            req.body.courseId
                ? Number(req.body.courseId)
                : null;

        const dueDate =
            cleanText(
                req.body.dueDate
            );

        const maxMark =
            numberValue(
                req.body.maxMark || 100
            );

        const description =
            cleanText(
                req.body.description
            );


        if (!title) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Assignment title is required"

                });

        }


        const result =
            db.prepare(`
                UPDATE assignments
                SET
                    title = ?,
                    courseId = ?,
                    dueDate = ?,
                    maxMark = ?,
                    description = ?
                WHERE id = ?
            `).run(

                title,
                courseId,
                dueDate,
                maxMark,
                description,
                assignmentId

            );


        if (!result.changes) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Assignment not found"

                });

        }


        res.json({

            success: true,

            message:
                "Assignment updated successfully"

        });

    } catch (error) {

        console.error(
            "UPDATE ASSIGNMENT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to update assignment"

        });

    }

});


/* DELETE ASSIGNMENT */

app.delete("/api/assignments/:id", (req, res) => {

    try {

        const assignmentId =
            Number(req.params.id);


        const result =
            db.prepare(`
                DELETE FROM assignments
                WHERE id = ?
            `).run(assignmentId);


        if (!result.changes) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Assignment not found"

                });

        }


        res.json({

            success: true,

            message:
                "Assignment deleted successfully"

        });

    } catch (error) {

        console.error(
            "DELETE ASSIGNMENT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to delete assignment"

        });

    }

});


/* ADD / UPDATE ASSIGNMENT MARK */

app.post(
    "/api/assignments/:assignmentId/students/:studentId",
    (req, res) => {

        try {

            const assignmentId =
                Number(
                    req.params.assignmentId
                );

            const studentId =
                cleanText(
                    req.params.studentId
                );

            const mark =
                numberValue(
                    req.body.mark
                );

            const status =
                cleanText(
                    req.body.status ||
                    "Submitted"
                );

            const submittedAt =
                cleanText(
                    req.body.submittedAt
                );


            const assignment =
                db.prepare(`
                    SELECT *
                    FROM assignments
                    WHERE id = ?
                `).get(
                    assignmentId
                );


            if (!assignment) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Assignment not found"

                    });

            }


            const student =
                db.prepare(`
                    SELECT id
                    FROM students
                    WHERE id = ?
                `).get(
                    studentId
                );


            if (!student) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Student not found"

                    });

            }


            const existing =
                db.prepare(`
                    SELECT id
                    FROM assignment_marks
                    WHERE assignmentId = ?
                    AND studentId = ?
                `).get(
                    assignmentId,
                    studentId
                );


            if (existing) {

                db.prepare(`
                    UPDATE assignment_marks
                    SET
                        mark = ?,
                        status = ?,
                        submittedAt = ?
                    WHERE assignmentId = ?
                    AND studentId = ?
                `).run(

                    mark,
                    status,
                    submittedAt,
                    assignmentId,
                    studentId

                );

            } else {

                db.prepare(`
                    INSERT INTO assignment_marks
                    (
                        assignmentId,
                        studentId,
                        mark,
                        status,
                        submittedAt
                    )
                    VALUES (?, ?, ?, ?, ?)
                `).run(

                    assignmentId,
                    studentId,
                    mark,
                    status,
                    submittedAt

                );

            }


            res.json({

                success: true,

                message:
                    "Assignment mark saved successfully"

            });

        } catch (error) {

            console.error(
                "ASSIGNMENT MARK ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to save assignment mark"

            });

        }

    }
);


/* GET STUDENT ASSIGNMENTS */

app.get(
    "/api/students/:studentId/assignments",
    (req, res) => {

        try {

            const studentId =
                cleanText(
                    req.params.studentId
                );


            const assignments =
                db.prepare(`
                    SELECT
                        a.id,
                        a.title,
                        a.dueDate,
                        a.maxMark,
                        a.description,
                        c.courseCode,
                        c.courseName,
                        COALESCE(am.mark, 0) AS mark,
                        COALESCE(am.status, 'Pending') AS status,
                        COALESCE(am.submittedAt, '') AS submittedAt
                    FROM assignments a
                    LEFT JOIN courses c
                        ON a.courseId = c.id
                    LEFT JOIN assignment_marks am
                        ON a.id = am.assignmentId
                        AND am.studentId = ?
                    ORDER BY
                        CASE
                            WHEN a.dueDate IS NULL
                            OR a.dueDate = ''
                            THEN 1
                            ELSE 0
                        END,
                        a.dueDate ASC,
                        a.id DESC
                `).all(studentId);


            const result =
                assignments.map(item => ({

                    ...item,

                    percentage:
                        item.maxMark > 0
                            ? Math.round(
                                (
                                    item.mark /
                                    item.maxMark
                                ) * 100
                            )
                            : 0

                }));


            res.json({

                success: true,

                assignments:
                    result

            });

        } catch (error) {

            console.error(
                "GET STUDENT ASSIGNMENTS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to load student assignments"

            });

        }

    }
);


/* =====================================================
   EXAMS
===================================================== */

/* GET ALL EXAMS */

app.get("/api/exams", (req, res) => {

    try {

        const exams =
            db.prepare(`
                SELECT
                    e.*,
                    c.courseCode,
                    c.courseName
                FROM exams e
                LEFT JOIN courses c
                    ON e.courseId = c.id
                ORDER BY e.id DESC
            `).all();


        res.json({

            success: true,

            exams

        });

    } catch (error) {

        console.error(
            "GET EXAMS ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load exams"

        });

    }

});


/* ADD EXAM */

app.post("/api/exams", (req, res) => {

    try {

        const examName =
            cleanText(
                req.body.examName
            );

        const courseId =
            req.body.courseId
                ? Number(req.body.courseId)
                : null;

        const examDate =
            cleanText(
                req.body.examDate
            );

        const maxMark =
            numberValue(
                req.body.maxMark || 100
            );

        const description =
            cleanText(
                req.body.description
            );


        if (!examName) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Exam name is required"

                });

        }


        const result =
            db.prepare(`
                INSERT INTO exams
                (
                    examName,
                    courseId,
                    examDate,
                    maxMark,
                    description
                )
                VALUES (?, ?, ?, ?, ?)
            `).run(

                examName,
                courseId,
                examDate,
                maxMark,
                description

            );


        const exam =
            db.prepare(`
                SELECT
                    e.*,
                    c.courseCode,
                    c.courseName
                FROM exams e
                LEFT JOIN courses c
                    ON e.courseId = c.id
                WHERE e.id = ?
            `).get(
                result.lastInsertRowid
            );


        res.status(201).json({

            success: true,

            message:
                "Exam added successfully",

            exam

        });

    } catch (error) {

        console.error(
            "ADD EXAM ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to add exam"

        });

    }

});


/* UPDATE EXAM */

app.put("/api/exams/:id", (req, res) => {

    try {

        const examId =
            Number(req.params.id);


        const examName =
            cleanText(
                req.body.examName
            );

        const courseId =
            req.body.courseId
                ? Number(req.body.courseId)
                : null;

        const examDate =
            cleanText(
                req.body.examDate
            );

        const maxMark =
            numberValue(
                req.body.maxMark || 100
            );

        const description =
            cleanText(
                req.body.description
            );


        if (!examName) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Exam name is required"

                });

        }


        const result =
            db.prepare(`
                UPDATE exams
                SET
                    examName = ?,
                    courseId = ?,
                    examDate = ?,
                    maxMark = ?,
                    description = ?
                WHERE id = ?
            `).run(

                examName,
                courseId,
                examDate,
                maxMark,
                description,
                examId

            );


        if (!result.changes) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Exam not found"

                });

        }


        res.json({

            success: true,

            message:
                "Exam updated successfully"

        });

    } catch (error) {

        console.error(
            "UPDATE EXAM ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to update exam"

        });

    }

});


/* DELETE EXAM */

app.delete("/api/exams/:id", (req, res) => {

    try {

        const examId =
            Number(req.params.id);


        const result =
            db.prepare(`
                DELETE FROM exams
                WHERE id = ?
            `).run(examId);


        if (!result.changes) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Exam not found"

                });

        }


        res.json({

            success: true,

            message:
                "Exam deleted successfully"

        });

    } catch (error) {

        console.error(
            "DELETE EXAM ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to delete exam"

        });

    }

});


/* ADD / UPDATE EXAM MARK */

app.post(
    "/api/exams/:examId/students/:studentId",
    (req, res) => {

        try {

            const examId =
                Number(
                    req.params.examId
                );

            const studentId =
                cleanText(
                    req.params.studentId
                );

            const mark =
                numberValue(
                    req.body.mark
                );


            const exam =
                db.prepare(`
                    SELECT *
                    FROM exams
                    WHERE id = ?
                `).get(
                    examId
                );


            if (!exam) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Exam not found"

                    });

            }


            const student =
                db.prepare(`
                    SELECT id
                    FROM students
                    WHERE id = ?
                `).get(
                    studentId
                );


            if (!student) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Student not found"

                    });

            }


            const result =
                mark >=
                (
                    numberValue(
                        exam.maxMark
                    ) * 0.40
                )
                    ? "Pass"
                    : "Fail";


            const existing =
                db.prepare(`
                    SELECT id
                    FROM exam_marks
                    WHERE examId = ?
                    AND studentId = ?
                `).get(
                    examId,
                    studentId
                );


            if (existing) {

                db.prepare(`
                    UPDATE exam_marks
                    SET
                        mark = ?,
                        result = ?
                    WHERE examId = ?
                    AND studentId = ?
                `).run(

                    mark,
                    result,
                    examId,
                    studentId

                );

            } else {

                db.prepare(`
                    INSERT INTO exam_marks
                    (
                        examId,
                        studentId,
                        mark,
                        result
                    )
                    VALUES (?, ?, ?, ?)
                `).run(

                    examId,
                    studentId,
                    mark,
                    result

                );

            }


            res.json({

                success: true,

                message:
                    "Exam mark saved successfully",

                result

            });

        } catch (error) {

            console.error(
                "EXAM MARK ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to save exam mark"

            });

        }

    }
);


/* GET STUDENT EXAMS */

app.get(
    "/api/students/:studentId/exams",
    (req, res) => {

        try {

            const studentId =
                cleanText(
                    req.params.studentId
                );


            const exams =
                db.prepare(`
                    SELECT
                        e.id,
                        e.examName,
                        e.examDate,
                        e.maxMark,
                        e.description,
                        c.courseCode,
                        c.courseName,
                        COALESCE(em.mark, 0) AS mark,
                        COALESCE(em.result, 'Pending') AS result
                    FROM exams e
                    LEFT JOIN courses c
                        ON e.courseId = c.id
                    LEFT JOIN exam_marks em
                        ON e.id = em.examId
                        AND em.studentId = ?
                    ORDER BY
                        CASE
                            WHEN e.examDate IS NULL
                            OR e.examDate = ''
                            THEN 1
                            ELSE 0
                        END,
                        e.examDate ASC,
                        e.id DESC
                `).all(studentId);


            const result =
                exams.map(item => ({

                    ...item,

                    percentage:
                        item.maxMark > 0
                            ? Math.round(
                                (
                                    item.mark /
                                    item.maxMark
                                ) * 100
                            )
                            : 0

                }));


            res.json({

                success: true,

                exams:
                    result

            });

        } catch (error) {

            console.error(
                "GET STUDENT EXAMS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to load student exams"

            });

        }

    }
);


/* =====================================================
   STUDENT COMPLETE ACADEMIC DATA
===================================================== */

app.get(
    "/api/students/:studentId/academic-data",
    (req, res) => {

        try {

            const studentId =
                cleanText(
                    req.params.studentId
                );


            const student =
                db.prepare(`
                    SELECT *
                    FROM students
                    WHERE id = ?
                `).get(studentId);


            if (!student) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Student not found"

                    });

            }


            const courses =
                db.prepare(`
                    SELECT
                        c.id,
                        c.courseCode,
                        c.courseName,
                        c.faculty,
                        c.semester
                    FROM courses c
                    INNER JOIN student_courses sc
                        ON c.id = sc.courseId
                    WHERE sc.studentId = ?
                    ORDER BY c.courseName
                `).all(studentId);


            const assignments =
                db.prepare(`
                    SELECT
                        a.id,
                        a.title,
                        a.dueDate,
                        a.maxMark,
                        c.courseCode,
                        c.courseName,
                        COALESCE(am.mark, 0) AS mark,
                        COALESCE(am.status, 'Pending') AS status
                    FROM assignments a
                    LEFT JOIN courses c
                        ON a.courseId = c.id
                    LEFT JOIN assignment_marks am
                        ON a.id = am.assignmentId
                        AND am.studentId = ?
                    ORDER BY a.dueDate ASC
                `).all(studentId);


            const exams =
                db.prepare(`
                    SELECT
                        e.id,
                        e.examName,
                        e.examDate,
                        e.maxMark,
                        c.courseCode,
                        c.courseName,
                        COALESCE(em.mark, 0) AS mark,
                        COALESCE(em.result, 'Pending') AS result
                    FROM exams e
                    LEFT JOIN courses c
                        ON e.courseId = c.id
                    LEFT JOIN exam_marks em
                        ON e.id = em.examId
                        AND em.studentId = ?
                    ORDER BY e.examDate ASC
                `).all(studentId);


            res.json({

                success: true,

                student: {

                    ...student,

                    overall:
                        calculateOverall(
                            student
                        ),

                    status:
                        getAcademicStatus(
                            student
                        )

                },

                courses,

                assignments,

                exams

            });

        } catch (error) {

            console.error(
                "ACADEMIC DATA ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to load academic data"

            });

        }

    }
);


/* =====================================================
   AI ACADEMIC ANALYSIS
===================================================== */

app.get(
    "/api/students/:id/ai-analysis",
    (req, res) => {

        try {

            const student =
                db.prepare(`
                    SELECT *
                    FROM students
                    WHERE id = ?
                `).get(
                    req.params.id
                );


            if (!student) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Student not found"

                    });

            }


            const attendance =
                percentage(
                    student.attendance
                );

            const assignment =
                percentage(
                    student.assignment
                );

            const exam =
                percentage(
                    student.exam
                );

            const overall =
                calculateOverall(
                    student
                );


            const weakAreas = [];


            if (
                attendance < 75
            ) {

                weakAreas.push(
                    "Attendance"
                );

            }


            if (
                assignment < 40
            ) {

                weakAreas.push(
                    "Assignments"
                );

            }


            if (
                exam < 40
            ) {

                weakAreas.push(
                    "Examination"
                );

            }


            let risk =
                "Low";


            if (
                attendance < 60 ||
                overall < 40
            ) {

                risk =
                    "High";

            }
            else if (
                attendance < 75 ||
                overall < 60
            ) {

                risk =
                    "Medium";

            }


            const recommendations = [];


            if (
                attendance < 75
            ) {

                recommendations.push(
                    "Improve class attendance."
                );

            }


            if (
                assignment < 60
            ) {

                recommendations.push(
                    "Complete assignments regularly."
                );

            }


            if (
                exam < 60
            ) {

                recommendations.push(
                    "Increase examination preparation."
                );

            }


            if (
                recommendations.length === 0
            ) {

                recommendations.push(
                    "Continue the current learning routine."
                );

            }


            res.json({

                success: true,

                studentId:
                    student.id,

                overall,

                attendance,

                assignment,

                exam,

                riskLevel:
                    risk,

                weakAreas,

                recommendations

            });

        } catch (error) {

            console.error(
                "AI ANALYSIS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to generate academic analysis"

            });

        }

    }
);


/* =====================================================
   ERROR HANDLER
===================================================== */

app.use(
    (error, req, res, next) => {

        console.error(
            "SERVER ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Internal server error"

        });

    }
);


/* =====================================================
   START SERVER
===================================================== */

const server =
    app.listen(
        PORT,
        () => {

            console.log(
                `Backend server running at http://localhost:${PORT}`
            );

        }
    );


/* =====================================================
   SHUTDOWN
===================================================== */

process.on(
    "SIGINT",
    () => {

        console.log(
            "\nClosing database..."
        );

        db.close();

        server.close(
            () => {
                process.exit(0);
            }
        );

    }
);