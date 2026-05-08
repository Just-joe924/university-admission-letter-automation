import {puppeteer} from "puppeteer";
import fs from "fs";
import path from "path";


export const generateAdmissionLetterPDF = async (student) => {
    const templatePath = path.resolve("src/template/admission-letter.html");

    let html = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders in the HTML template with actual student data
    html = html
        .replace("{{full_name}}", student.name)
        .replace("{{application_number}}", student.applicationNumber)
        .replace("{{admission_number}}", student.admissionNumber)
        .replace("{{department}}", student.department)
        .replace("{{course_of_study}}", student.course)
        .replace("{{mode_of_entry}}", student.modeOfEntry);

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(html);
    
    const pdfBuffer = await page.pdf({ 
        format: "A4", 
        printBackground: true, 
    });
    await browser.close();

    return pdfBuffer;
};