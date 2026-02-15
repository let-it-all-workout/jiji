/**
 * Grade scale (Nigerian university standard - 5-point scale)
 * A  = 70-100 => 5.0
 * B  = 60-69  => 4.0
 * C  = 50-59  => 3.0
 * D  = 45-49  => 2.0
 * E  = 40-44  => 1.0
 * F  = 0-39   => 0.0
 */

function getGrade(score) {
  if (score >= 70) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 45) return 'D';
  if (score >= 40) return 'E';
  return 'F';
}

function getGradePoint(score) {
  if (score >= 70) return 5.0;
  if (score >= 60) return 4.0;
  if (score >= 50) return 3.0;
  if (score >= 45) return 2.0;
  if (score >= 40) return 1.0;
  return 0.0;
}

function getRemark(score) {
  return score >= 40 ? 'Pass' : 'Fail';
}

/**
 * Calculate GPA from an array of results
 * Each result should have: { score, credit_units }
 * GPA = sum(credit_units * grade_point) / sum(credit_units)
 */
function calculateGPA(results) {
  if (!results || results.length === 0) return 0;

  let totalWeightedPoints = 0;
  let totalCreditUnits = 0;

  for (const r of results) {
    const gradePoint = getGradePoint(r.score);
    totalWeightedPoints += gradePoint * r.credit_units;
    totalCreditUnits += r.credit_units;
  }

  if (totalCreditUnits === 0) return 0;
  return Math.round((totalWeightedPoints / totalCreditUnits) * 100) / 100;
}

/**
 * Deduplicate results by course — keep only the latest result per course_id.
 * Used for CGPA to avoid double-counting retaken courses.
 * Each result should have: { course_id, score, credit_units, id (or created_at) }
 */
function deduplicateByCourse(results) {
  if (!results || results.length === 0) return [];
  const courseMap = new Map();
  for (const r of results) {
    const key = r.course_id;
    const existing = courseMap.get(key);
    // Keep the result with the higher id (latest entry)
    if (!existing || r.id > existing.id) {
      courseMap.set(key, r);
    }
  }
  return Array.from(courseMap.values());
}

/**
 * Get class of degree based on CGPA
 */
function getClassification(cgpa) {
  if (cgpa >= 4.5) return 'First Class';
  if (cgpa >= 3.5) return 'Second Class Upper';
  if (cgpa >= 2.5) return 'Second Class Lower';
  if (cgpa >= 1.5) return 'Third Class';
  if (cgpa >= 1.0) return 'Pass';
  return 'Fail';
}

module.exports = {
  getGrade,
  getGradePoint,
  getRemark,
  calculateGPA,
  deduplicateByCourse,
  getClassification,
};
