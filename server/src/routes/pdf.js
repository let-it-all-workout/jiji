const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../config/db');
const { calculateGPA, deduplicateByCourse, getClassification } = require('../utils/gpa');

const router = express.Router();

// GET /api/pdf/result - Generate PDF result slip
router.get('/result', (req, res) => {
  try {
    const { reg, session, level, semester } = req.query;

    if (!reg || !session || !level || !semester) {
      return res.status(400).json({ error: 'reg, session, level, and semester are required' });
    }

    const student = db.prepare('SELECT * FROM students WHERE UPPER(reg_number) = UPPER(?)').get(reg.trim());
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const results = db.prepare(`
      SELECT r.score, r.grade, r.remark,
             c.course_code, c.course_name, c.credit_units
      FROM results r
      JOIN courses c ON r.course_id = c.id
      WHERE r.student_id = ? AND r.academic_session = ? AND c.level = ? AND c.semester = ?
      ORDER BY c.course_code
    `).all(student.id, session, parseInt(level), parseInt(semester));

    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found' });
    }

    const gpa = calculateGPA(results);

    const allResults = db.prepare(`
      SELECT r.id, r.score, r.course_id, c.credit_units FROM results r
      JOIN courses c ON r.course_id = c.id WHERE r.student_id = ?
      ORDER BY r.id ASC
    `).all(student.id);
    const dedupedResults = deduplicateByCourse(allResults);
    const cgpa = calculateGPA(dedupedResults);

    const settings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
    const totalCredits = results.reduce((sum, r) => sum + r.credit_units, 0);

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=result_${reg}_${level}L_S${semester}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(settings.school_name || 'My School', { align: 'center' });
    if (settings.school_motto) {
      doc.fontSize(10).font('Helvetica-Oblique').text(settings.school_motto, { align: 'center' });
    }
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').text('STUDENT RESULT SLIP', { align: 'center' });
    doc.moveDown(0.3);

    // Horizontal line
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Student Info
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${student.full_name}`, 50);
    doc.text(`Reg Number: ${student.reg_number}`, 50);
    doc.text(`Department: ${student.department}`, 50);
    doc.text(`Academic Session: ${session}`, 50);
    doc.text(`Level: ${level}        Semester: ${semester === '1' ? '1st' : '2nd'}`, 50);
    doc.moveDown(0.5);

    // Table Header
    const tableTop = doc.y;
    const colWidths = { sn: 30, code: 80, name: 170, units: 50, score: 50, grade: 45, remark: 70 };
    let x = 50;

    doc.font('Helvetica-Bold').fontSize(10);
    doc.rect(50, tableTop - 2, 495, 18).fill('#1a365d');
    doc.fillColor('#ffffff');
    doc.text('S/N', x, tableTop, { width: colWidths.sn, align: 'center' }); x += colWidths.sn;
    doc.text('Code', x, tableTop, { width: colWidths.code, align: 'left' }); x += colWidths.code;
    doc.text('Course Name', x, tableTop, { width: colWidths.name, align: 'left' }); x += colWidths.name;
    doc.text('Units', x, tableTop, { width: colWidths.units, align: 'center' }); x += colWidths.units;
    doc.text('Score', x, tableTop, { width: colWidths.score, align: 'center' }); x += colWidths.score;
    doc.text('Grade', x, tableTop, { width: colWidths.grade, align: 'center' }); x += colWidths.grade;
    doc.text('Remark', x, tableTop, { width: colWidths.remark, align: 'center' });

    doc.fillColor('#000000');
    doc.font('Helvetica').fontSize(9);

    let y = tableTop + 20;
    results.forEach((r, i) => {
      const rowColor = i % 2 === 0 ? '#f7fafc' : '#ffffff';
      doc.rect(50, y - 2, 495, 16).fill(rowColor);
      doc.fillColor('#000000');

      x = 50;
      doc.text(String(i + 1), x, y, { width: colWidths.sn, align: 'center' }); x += colWidths.sn;
      doc.text(r.course_code, x, y, { width: colWidths.code, align: 'left' }); x += colWidths.code;
      doc.text(r.course_name, x, y, { width: colWidths.name, align: 'left' }); x += colWidths.name;
      doc.text(String(r.credit_units), x, y, { width: colWidths.units, align: 'center' }); x += colWidths.units;
      doc.text(String(r.score), x, y, { width: colWidths.score, align: 'center' }); x += colWidths.score;
      doc.text(r.grade, x, y, { width: colWidths.grade, align: 'center' }); x += colWidths.grade;
      doc.text(r.remark, x, y, { width: colWidths.remark, align: 'center' });
      y += 16;
    });

    // Summary
    y += 10;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`Total Credit Units: ${totalCredits}`, 50, y);
    doc.text(`Semester GPA: ${gpa.toFixed(2)}`, 250, y);
    y += 18;
    doc.text(`Cumulative GPA (CGPA): ${cgpa.toFixed(2)}`, 50, y);
    doc.text(`Classification: ${getClassification(cgpa)}`, 250, y);

    // Footer
    y += 40;
    doc.font('Helvetica-Oblique').fontSize(8)
      .text('This result is subject to Senate approval.', 50, y, { align: 'center' });
    doc.text(`Generated on ${new Date().toLocaleDateString('en-NG')}`, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
