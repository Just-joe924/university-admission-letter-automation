export const generateLetterReference = (student) => {
  return `ADM-${student.admission_number}-${Date.now()}`;
};