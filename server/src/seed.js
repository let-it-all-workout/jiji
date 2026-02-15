const bcrypt = require('bcryptjs');
const db = require('./config/db');
const { getGrade, getRemark } = require('./utils/gpa');

console.log('Seeding database...');

// Clear existing data
db.exec(`
  DELETE FROM disputes;
  DELETE FROM results;
  DELETE FROM courses;
  DELETE FROM students;
  DELETE FROM users;
  DELETE FROM departments;
`);

// Create departments
const deptNames = ['Computer Science', 'General', 'Mathematics', 'Physics', 'Electrical Engineering'];
const insertDept = db.prepare('INSERT INTO departments (name) VALUES (?)');
for (const d of deptNames) {
  insertDept.run(d);
}
console.log('Departments created');

// Create admin user
const adminHash = bcrypt.hashSync('admin123', 10);
db.prepare(`
  INSERT INTO users (full_name, email, password_hash, role, department)
  VALUES (?, ?, ?, ?, ?)
`).run('Admin User', 'admin@school.edu', adminHash, 'admin', 'Computer Science');

// Create HOD
const hodHash = bcrypt.hashSync('hod123', 10);
db.prepare(`
  INSERT INTO users (full_name, email, password_hash, role, department)
  VALUES (?, ?, ?, ?, ?)
`).run('Dr. Ngozi Obi', 'ngozi@school.edu', hodHash, 'hod', 'Computer Science');

// Create Registrar
const registrarHash = bcrypt.hashSync('registrar123', 10);
db.prepare(`
  INSERT INTO users (full_name, email, password_hash, role, department)
  VALUES (?, ?, ?, ?, ?)
`).run('Mrs. Chioma Nwosu', 'chioma@school.edu', registrarHash, 'registrar', '');

// Create lecturers
const lecturerHash = bcrypt.hashSync('lecturer123', 10);
db.prepare(`
  INSERT INTO users (full_name, email, password_hash, role, department)
  VALUES (?, ?, ?, ?, ?)
`).run('Dr. James Okafor', 'james@school.edu', lecturerHash, 'lecturer', 'Computer Science');

const lecturer2Hash = bcrypt.hashSync('lecturer123', 10);
db.prepare(`
  INSERT INTO users (full_name, email, password_hash, role, department)
  VALUES (?, ?, ?, ?, ?)
`).run('Prof. Ada Eze', 'ada@school.edu', lecturer2Hash, 'lecturer', 'Computer Science');

console.log('Users created');

// Create students
const students = [
  { reg: '2022/CSC/010', name: 'Chukwuma Eze', dept: 'Computer Science' },
  { reg: '2022/CSC/011', name: 'Amina Ibrahim', dept: 'Computer Science' },
  { reg: '2022/CSC/012', name: 'Oluwaseun Adeyemi', dept: 'Computer Science' },
  { reg: '2022/CSC/013', name: 'Fatimah Yusuf', dept: 'Computer Science' },
  { reg: '2022/CSC/014', name: 'Emeka Nwankwo', dept: 'Computer Science' },
];

const insertStudent = db.prepare(
  'INSERT INTO students (reg_number, full_name, department) VALUES (?, ?, ?)'
);
for (const s of students) {
  insertStudent.run(s.reg, s.name, s.dept);
}
console.log('Students created');

// Create courses - 100 Level
// dept = "General" for GST/shared courses taken by all departments
const courses = [
  // GST courses (General Studies - shared across all departments)
  { code: 'GST101', name: 'Use of English I', units: 2, dept: 'General', level: 100, sem: 1 },
  { code: 'GST102', name: 'Use of English II', units: 2, dept: 'General', level: 100, sem: 2 },
  { code: 'GST103', name: 'Nigerian Peoples and Culture', units: 2, dept: 'General', level: 100, sem: 1 },
  { code: 'GST104', name: 'History and Philosophy of Science', units: 2, dept: 'General', level: 100, sem: 2 },
  { code: 'GST201', name: 'Philosophy and Logic', units: 2, dept: 'General', level: 200, sem: 1 },
  { code: 'GST202', name: 'Peace and Conflict Resolution', units: 2, dept: 'General', level: 200, sem: 2 },
  // Computer Science department courses
  { code: 'CSC101', name: 'Introduction to Computer Science', units: 3, dept: 'Computer Science', level: 100, sem: 1 },
  { code: 'CSC103', name: 'Introduction to Programming', units: 3, dept: 'Computer Science', level: 100, sem: 1 },
  { code: 'MTH101', name: 'Elementary Mathematics I', units: 3, dept: 'General', level: 100, sem: 1 },
  { code: 'PHY101', name: 'General Physics I', units: 3, dept: 'General', level: 100, sem: 1 },
  { code: 'CSC102', name: 'Problem Solving & Algorithms', units: 3, dept: 'Computer Science', level: 100, sem: 2 },
  { code: 'CSC104', name: 'Programming in C', units: 3, dept: 'Computer Science', level: 100, sem: 2 },
  { code: 'MTH102', name: 'Elementary Mathematics II', units: 3, dept: 'General', level: 100, sem: 2 },
  { code: 'PHY102', name: 'General Physics II', units: 3, dept: 'General', level: 100, sem: 2 },
  // 200 Level
  { code: 'CSC201', name: 'Data Structures', units: 3, dept: 'Computer Science', level: 200, sem: 1 },
  { code: 'CSC203', name: 'Discrete Mathematics', units: 3, dept: 'Computer Science', level: 200, sem: 1 },
  { code: 'CSC205', name: 'Operating Systems', units: 3, dept: 'Computer Science', level: 200, sem: 1 },
  { code: 'MTH201', name: 'Mathematical Methods I', units: 3, dept: 'General', level: 200, sem: 1 },
];

const insertCourse = db.prepare(
  'INSERT INTO courses (course_code, course_name, credit_units, department, level, semester) VALUES (?, ?, ?, ?, ?, ?)'
);
for (const c of courses) {
  insertCourse.run(c.code, c.name, c.units, c.dept, c.level, c.sem);
}
console.log('Courses created');

// Create sample results for 100L, 1st semester, 2024/2025
const allStudents = db.prepare('SELECT * FROM students').all();
const sem1Courses = db.prepare('SELECT * FROM courses WHERE level = 100 AND semester = 1').all();
const sem2Courses = db.prepare('SELECT * FROM courses WHERE level = 100 AND semester = 2').all();
const lecturer = db.prepare('SELECT id FROM users WHERE role = ?').get('lecturer');

const insertResult = db.prepare(`
  INSERT INTO results (student_id, course_id, academic_session, uploaded_by, score, grade, remark)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Generate random score for a student (each student has a base performance level)
const studentBase = [70, 78, 45, 88, 52]; // base scores per student

function randomScore(studentIndex) {
  const base = studentBase[studentIndex % studentBase.length];
  // Random variation of +/- 15 from base, clamped to 0-100
  return Math.max(0, Math.min(100, base + Math.floor(Math.random() * 30) - 15));
}

const insertResults = db.transaction(() => {
  // 1st semester results
  allStudents.forEach((student, si) => {
    sem1Courses.forEach((course) => {
      const score = randomScore(si);
      insertResult.run(student.id, course.id, '2024/2025', lecturer.id, score, getGrade(score), getRemark(score));
    });
  });
  // 2nd semester results
  allStudents.forEach((student, si) => {
    sem2Courses.forEach((course) => {
      const score = randomScore(si);
      insertResult.run(student.id, course.id, '2024/2025', lecturer.id, score, getGrade(score), getRemark(score));
    });
  });
});

insertResults();
console.log('Results created');

// Update school settings
db.prepare(`
  UPDATE school_settings SET
    school_name = 'Legacy University Okija',
    school_logo_url = '/logo.jpeg',
    school_motto = '',
    primary_color = '#1a365d'
  WHERE id = 1
`).run();

console.log('School settings updated');
console.log('\nSeed complete!');
console.log('\nTest accounts:');
console.log('  Admin:     admin@school.edu / admin123');
console.log('  HOD:       ngozi@school.edu / hod123');
console.log('  Registrar: chioma@school.edu / registrar123');
console.log('  Lecturer:  james@school.edu / lecturer123');
console.log('\nTest student reg numbers:');
students.forEach(s => console.log(`  ${s.reg} - ${s.name}`));
