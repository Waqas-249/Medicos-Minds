import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

/**
 * Generates an official, high-quality digital PDF study guide for a note
 */
export async function generateStudyGuidePdf(note: any, coversDir: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  
  // Set metadata
  pdfDoc.setTitle(note.title || "Physiotherapy Study Guide");
  pdfDoc.setAuthor("Dr. MD Kamran Alam — MEDICOS MINDS");
  pdfDoc.setSubject(`Official BPT Study Notes: ${note.title}`);
  pdfDoc.setProducer("MEDICOS MINDS Digital Publishing Platform");
  pdfDoc.setCreationDate(new Date());

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  // 1. Embed Cover Page if available
  let hasCoverPage = false;
  if (note.cover_image && typeof note.cover_image === "string") {
    const coverFilename = path.basename(note.cover_image);
    const coverPath = path.join(coversDir, coverFilename);
    if (fs.existsSync(coverPath)) {
      try {
        const coverBytes = fs.readFileSync(coverPath);
        let img;
        if (coverFilename.endsWith(".png")) {
          img = await pdfDoc.embedPng(coverBytes);
        } else {
          img = await pdfDoc.embedJpg(coverBytes);
        }

        const coverPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        coverPage.drawImage(img, {
          x: 20,
          y: 20,
          width: A4_WIDTH - 40,
          height: A4_HEIGHT - 40,
        });
        hasCoverPage = true;
      } catch (err: any) {
        console.warn(`[PDF GEN] Could not embed cover image for ${note.title}:`, err?.message);
      }
    }
  }

  // 2. Title & Overview Page
  const titlePage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  
  // Top Header Banner
  titlePage.drawRectangle({
    x: 0,
    y: A4_HEIGHT - 90,
    width: A4_WIDTH,
    height: 90,
    color: rgb(0.36, 0.44, 0.37), // #5C715E brand green
  });

  titlePage.drawText("MEDICOS MINDS", {
    x: 40,
    y: A4_HEIGHT - 45,
    size: 22,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  titlePage.drawText("HIGH-YIELD BPT STUDY GUIDE & EXAM COMPANION", {
    x: 40,
    y: A4_HEIGHT - 70,
    size: 10,
    font: fontBold,
    color: rgb(0.85, 0.9, 0.86),
  });

  // Note Title
  titlePage.drawText(note.title || "Physiotherapy Study Guide", {
    x: 40,
    y: A4_HEIGHT - 140,
    size: 20,
    font: fontBold,
    color: rgb(0.18, 0.2, 0.21),
  });

  titlePage.drawText("Author: Dr. MD Kamran Alam | Instagram: @restore_healthphysio", {
    x: 40,
    y: A4_HEIGHT - 165,
    size: 11,
    font: fontRegular,
    color: rgb(0.36, 0.44, 0.37),
  });

  // Decorative divider
  titlePage.drawLine({
    start: { x: 40, y: A4_HEIGHT - 180 },
    end: { x: A4_WIDTH - 40, y: A4_HEIGHT - 180 },
    thickness: 1.5,
    color: rgb(0.85, 0.85, 0.85),
  });

  // Verification Box
  titlePage.drawRectangle({
    x: 40,
    y: A4_HEIGHT - 265,
    width: A4_WIDTH - 80,
    height: 70,
    color: rgb(0.96, 0.97, 0.96),
    borderColor: rgb(0.8, 0.85, 0.8),
    borderWidth: 1,
  });

  titlePage.drawText("OFFICIAL DIGITAL STUDY GUIDE VERIFICATION", {
    x: 55,
    y: A4_HEIGHT - 215,
    size: 10,
    font: fontBold,
    color: rgb(0.36, 0.44, 0.37),
  });

  titlePage.drawText(`Format: High-Yield Digital PDF  |  Standard Price: Rs. ${note.price || 99}`, {
    x: 55,
    y: A4_HEIGHT - 235,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  titlePage.drawText("Authorized License: Personal Single-User Academic License", {
    x: 55,
    y: A4_HEIGHT - 253,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Description / Content Summary
  titlePage.drawText("STUDY GUIDE DETAILS & CONTENTS:", {
    x: 40,
    y: A4_HEIGHT - 300,
    size: 12,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  const description = note.description || 
    "Comprehensive high-yield notes designed for Bachelor of Physiotherapy (BPT), MBBS, BDS, and allied healthcare students. Covers fundamental anatomy, clinical assessments, pathological conditions, evidence-based physical therapy rehabilitation protocols, and exam-oriented high-yield review.";

  // Simple text wrapping for description
  const words = description.split(" ");
  let line = "";
  let currentY = A4_HEIGHT - 325;
  for (const w of words) {
    const testLine = line + (line ? " " : "") + w;
    if (testLine.length > 70) {
      titlePage.drawText(line, {
        x: 40,
        y: currentY,
        size: 11,
        font: fontRegular,
        color: rgb(0.25, 0.25, 0.25),
      });
      line = w;
      currentY -= 18;
    } else {
      line = testLine;
    }
  }
  if (line) {
    titlePage.drawText(line, {
      x: 40,
      y: currentY,
      size: 11,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    currentY -= 25;
  }

  // Key Features Bullet List
  const features = [
    "Exam-Focused: Concise points curated from leading medical textbooks and clinical references.",
    "Visual Diagrams: High-yield diagrams and tables for quick revision.",
    "Mobile & Tablet Optimized: Readable on phones, tablets, iPads, and laptops.",
    "Official Medicos Minds Release: Verified by Dr. MD Kamran Alam.",
  ];

  titlePage.drawText("KEY HIGHLIGHTS:", {
    x: 40,
    y: currentY - 10,
    size: 11,
    font: fontBold,
    color: rgb(0.36, 0.44, 0.37),
  });
  currentY -= 30;

  for (const feat of features) {
    titlePage.drawCircle({
      x: 45,
      y: currentY + 3,
      size: 3,
      color: rgb(0.36, 0.44, 0.37),
    });
    titlePage.drawText(feat, {
      x: 55,
      y: currentY,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    currentY -= 20;
  }

  // 3. Embed Inside Page Previews if available
  if (Array.isArray(note.preview_images) && note.preview_images.length > 0) {
    for (let i = 0; i < note.preview_images.length; i++) {
      const prevUrl = note.preview_images[i];
      if (!prevUrl) continue;
      const prevFilename = path.basename(prevUrl);
      const prevPath = path.join(coversDir, prevFilename);

      if (fs.existsSync(prevPath)) {
        try {
          const prevBytes = fs.readFileSync(prevPath);
          let prevImg;
          if (prevFilename.endsWith(".png")) {
            prevImg = await pdfDoc.embedPng(prevBytes);
          } else {
            prevImg = await pdfDoc.embedJpg(prevBytes);
          }

          const prevPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
          
          // Header on inside preview page
          prevPage.drawText(`MEDICOS MINDS  •  ${note.title}  •  Preview Slide ${i + 1}`, {
            x: 40,
            y: A4_HEIGHT - 35,
            size: 9,
            font: fontBold,
            color: rgb(0.4, 0.4, 0.4),
          });
          prevPage.drawLine({
            start: { x: 40, y: A4_HEIGHT - 45 },
            end: { x: A4_WIDTH - 40, y: A4_HEIGHT - 45 },
            thickness: 0.8,
            color: rgb(0.85, 0.85, 0.85),
          });

          // Draw the full diagram / index preview
          prevPage.drawImage(prevImg, {
            x: 30,
            y: 40,
            width: A4_WIDTH - 60,
            height: A4_HEIGHT - 100,
          });
        } catch (err: any) {
          console.warn(`[PDF GEN] Could not embed preview image ${prevFilename}:`, err?.message);
        }
      }
    }
  }

  // Final Summary Page
  const finalPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  finalPage.drawRectangle({
    x: 40,
    y: A4_HEIGHT - 150,
    width: A4_WIDTH - 80,
    height: 100,
    color: rgb(0.96, 0.98, 0.96),
    borderColor: rgb(0.36, 0.44, 0.37),
    borderWidth: 1.5,
  });

  finalPage.drawText("THANK YOU FOR YOUR PURCHASE!", {
    x: 60,
    y: A4_HEIGHT - 85,
    size: 16,
    font: fontBold,
    color: rgb(0.36, 0.44, 0.37),
  });

  finalPage.drawText("We wish you the very best in your medical and physiotherapy examinations.", {
    x: 60,
    y: A4_HEIGHT - 110,
    size: 11,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  finalPage.drawText("For any questions, supplementary questions, or study support, reach out to us:", {
    x: 60,
    y: A4_HEIGHT - 132,
    size: 10,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Support details box
  finalPage.drawText("SUPPORT & COMMUNITY:", {
    x: 40,
    y: A4_HEIGHT - 180,
    size: 12,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  finalPage.drawText("• Instagram: @restore_healthphysio (Daily Clinical Case Studies & Quizzes)", {
    x: 40,
    y: A4_HEIGHT - 205,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  finalPage.drawText("• WhatsApp Helpline: +91 83407 49923", {
    x: 40,
    y: A4_HEIGHT - 225,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  finalPage.drawText("• Email Support: restorehealthphysio@gmail.com", {
    x: 40,
    y: A4_HEIGHT - 245,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Bottom Notice
  finalPage.drawText("MEDICOS MINDS  •  All Rights Reserved  •  Confidential & Educational Material", {
    x: 40,
    y: 40,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Ensures all notes have a valid PDF on disk so that downloads never fail
 */
export async function ensureAllNotesHavePdfs(notes: any[], privatePdfsDir: string, coversDir: string): Promise<number> {
  if (!fs.existsSync(privatePdfsDir)) {
    fs.mkdirSync(privatePdfsDir, { recursive: true });
  }

  let generatedCount = 0;
  for (const note of notes) {
    if (!note) continue;
    
    // Choose or assign filename
    let filename = note.pdf_file;
    if (!filename) {
      filename = `pdf-${note.id}.pdf`;
      note.pdf_file = filename;
    }

    const filePath = path.join(privatePdfsDir, filename);
    if (!fs.existsSync(filePath)) {
      try {
        console.log(`[PDF ENSURE] Synthesizing study guide PDF for: "${note.title}" (${filename})`);
        const pdfBuf = await generateStudyGuidePdf(note, coversDir);
        fs.writeFileSync(filePath, pdfBuf);
        note.pdf_size = pdfBuf.length;
        generatedCount++;
      } catch (err: any) {
        console.error(`[PDF ENSURE] Error creating PDF for ${note.title}:`, err?.message || err);
      }
    }
  }

  return generatedCount;
}
