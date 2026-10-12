import fs from "fs";
import path from "path";
import { saveImageToFirestore } from "../server/firebase";

interface Note {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  preview_images?: string[];
}

const NOTES_FILE = path.join(process.cwd(), "data", "notes.json");
const COVERS_DIR = path.join(process.cwd(), "uploads", "covers");

if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

// Subject color palettes and icon styles
const SUBJECT_THEMES: { [key: string]: { bg1: string; bg2: string; accent: string; badge: string; category: string } } = {
  "Obstetrics and gynaecology": { bg1: "#1E293B", bg2: "#0F172A", accent: "#E11D48", badge: "#FDA4AF", category: "CLINICAL SPECIALTY" },
  "Sport pt on field management": { bg1: "#064E3B", bg2: "#022C22", accent: "#10B981", badge: "#A7F3D0", category: "SPORTS MEDICINE & REHAB" },
  "Rehabilitation": { bg1: "#1E3A5F", bg2: "#0F1E36", accent: "#38BDF8", badge: "#BAE6FD", category: "PHYSIOTHERAPY & REHAB" },
  "Paediatrics": { bg1: "#7C2D12", bg2: "#431407", accent: "#F97316", badge: "#FED7AA", category: "PEDIATRIC MEDICINE" },
  "PT in neurological condition": { bg1: "#311042", bg2: "#190823", accent: "#A855F7", badge: "#E9D5FF", category: "NEUROLOGY & PHYSIOTHERAPY" },
  "Patient assessment in neurological condition": { bg1: "#2E1065", bg2: "#170836", accent: "#8B5CF6", badge: "#DDD6FE", category: "CLINICAL NEUROLOGY" },
  "General surgery": { bg1: "#881337", bg2: "#4C0519", accent: "#F43F5E", badge: "#FECDD3", category: "SURGICAL SCIENCE" },
  "Neurology": { bg1: "#3B0764", bg2: "#1D0333", accent: "#C084FC", badge: "#F3E8FF", category: "NEUROSCIENCE" },
  "PT in cardio pulmonary conditions": { bg1: "#7F1D1D", bg2: "#450A0A", accent: "#EF4444", badge: "#FECACA", category: "CARDIOPULMONARY MEDICINE" },
  "PT in orthopaedic conditions": { bg1: "#134E4A", bg2: "#042F2E", accent: "#14B8A6", badge: "#99F6E4", category: "ORTHOPAEDIC PHYSIOTHERAPY" },
  "Orthotics and prosthetics": { bg1: "#1E293B", bg2: "#0F172A", accent: "#0EA5E9", badge: "#BAE6FD", category: "BIOMECHANICAL ENGINEERING" },
  "Research methodology & Biostatistics": { bg1: "#1E1B4B", bg2: "#0F0D2E", accent: "#6366F1", badge: "#C7D2FE", category: "MEDICAL RESEARCH & STATS" },
  "General medicine": { bg1: "#14532D", bg2: "#052E16", accent: "#22C55E", badge: "#BBF7D0", category: "INTERNAL MEDICINE" },
  "Orthopaedics": { bg1: "#0F2E4A", bg2: "#061A2B", accent: "#0284C7", badge: "#BAE6FD", category: "MUSCULOSKELETAL SYSTEM" },
  "Biomechanics": { bg1: "#18181B", bg2: "#09090B", accent: "#EAB308", badge: "#FEF08A", category: "KINESIOLOGY & BIOMECHANICS" },
  "Electrotherapy": { bg1: "#172554", bg2: "#081336", accent: "#3B82F6", badge: "#BFDBFE", category: "MODALITY PHYSIOTHERAPY" },
  "Exercise therapy": { bg1: "#064E3B", bg2: "#022C22", accent: "#10B981", badge: "#A7F3D0", category: "KINESIOTHERAPY & EXERCISE" },
  "Pharmacology": { bg1: "#701A75", bg2: "#4A044E", accent: "#D946EF", badge: "#F5D0FE", category: "CLINICAL PHARMACOLOGY" },
  "Pathology and microbiology": { bg1: "#831843", bg2: "#500724", accent: "#EC4899", badge: "#FBCFE8", category: "DIAGNOSTIC PATHOLOGY" },
  "Clinical psychology and Sociology": { bg1: "#2E1065", bg2: "#180638", accent: "#9333EA", badge: "#E9D5FF", category: "BEHAVIORAL SCIENCES" },
  "Biochemistry": { bg1: "#0C4A6E", bg2: "#03273D", accent: "#06B6D4", badge: "#A5F3FC", category: "MOLECULAR MEDICINE" },
  "Human physiology": { bg1: "#881337", bg2: "#4C0519", accent: "#F43F5E", badge: "#FECDD3", category: "HUMAN SYSTEMS & ORGANS" },
  "Human anatomy": { bg1: "#1E293B", bg2: "#0F172A", accent: "#38BDF8", badge: "#BAE6FD", category: "ANATOMICAL SCIENCES" },
};

function getTheme(title: string) {
  for (const [key, theme] of Object.entries(SUBJECT_THEMES)) {
    if (title.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(title.toLowerCase())) {
      return theme;
    }
  }
  return { bg1: "#1E293B", bg2: "#0F172A", accent: "#10B981", badge: "#A7F3D0", category: "MEDICAL STUDY NOTES" };
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case "\"": return "&quot;";
    }
    return c;
  });
}

function generateCoverSvg(title: string): string {
  const theme = getTheme(title);
  const cleanTitle = escapeXml(title);
  const category = escapeXml(theme.category);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg1}"/>
      <stop offset="100%" stop-color="${theme.bg2}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="50%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <linearGradient id="accentG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.accent}"/>
      <stop offset="100%" stop-color="${theme.badge}"/>
    </linearGradient>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="800" height="1100" fill="url(#bg)"/>
  <rect width="800" height="1100" fill="url(#grid)"/>

  <!-- Left Spine Accent -->
  <rect x="0" y="0" width="18" height="1100" fill="url(#gold)"/>
  <rect x="18" y="0" width="6" height="1100" fill="rgba(0,0,0,0.3)"/>

  <!-- Top Academic Header Banner -->
  <rect x="50" y="45" width="700" height="42" rx="21" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <text x="75" y="72" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="${theme.badge}" letter-spacing="2">MEDICOS MINDS</text>
  <circle cx="210" cy="66" r="3" fill="rgba(255,255,255,0.4)"/>
  <text x="225" y="72" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#94A3B8" letter-spacing="1.5">HIGH-YIELD REVISION GUIDE</text>
  <text x="680" y="72" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" fill="#FBBF24" letter-spacing="1">MBBS • BPT</text>

  <!-- Category Pill -->
  <g transform="translate(60, 130)">
    <rect width="260" height="32" rx="16" fill="${theme.accent}" opacity="0.2"/>
    <rect width="260" height="32" rx="16" fill="none" stroke="${theme.accent}" stroke-width="1.5"/>
    <text x="130" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="${theme.badge}" text-anchor="middle" letter-spacing="2">${category}</text>
  </g>

  <!-- Title Section -->
  <g transform="translate(60, 220)">
    <rect x="0" y="0" width="680" height="230" rx="20" fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    
    <!-- Accent Line -->
    <rect x="30" y="30" width="5" height="100" rx="2.5" fill="url(#gold)"/>
    
    <!-- Main Subject Title (Large, Clear) -->
    <text x="50" y="65" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="900" fill="#FFFFFF" letter-spacing="-0.5">
      ${cleanTitle}
    </text>
    
    <text x="50" y="105" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="${theme.badge}" letter-spacing="1">
      DIGITAL HANDWRITTEN NOTES
    </text>

    <text x="50" y="145" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#CBD5E1">
      Concepts Make Evidence • Evidence Builds Confidence 📚
    </text>
    
    <!-- Badges Row -->
    <g transform="translate(50, 175)">
      <rect x="0" y="0" width="130" height="26" rx="13" fill="rgba(16,185,129,0.2)" stroke="#10B981" stroke-width="1"/>
      <text x="65" y="17" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" fill="#34D399" text-anchor="middle" letter-spacing="1">EXAM ORIENTED</text>
      
      <rect x="140" y="0" width="130" height="26" rx="13" fill="rgba(245,158,11,0.2)" stroke="#F59E0B" stroke-width="1"/>
      <text x="205" y="17" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" fill="#FBBF24" text-anchor="middle" letter-spacing="1">WITH DIAGRAMS</text>

      <rect x="280" y="0" width="130" height="26" rx="13" fill="rgba(56,189,248,0.2)" stroke="#38BDF8" stroke-width="1"/>
      <text x="345" y="17" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" fill="#7DD3FC" text-anchor="middle" letter-spacing="1">PREVIOUS EXAMS</text>
    </g>
  </g>

  <!-- Visual Feature Box (Center Medical Emblem / Showcase) -->
  <g transform="translate(60, 480)">
    <rect width="680" height="420" rx="24" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    
    <!-- Geometric Medical Graphic -->
    <circle cx="340" cy="180" r="110" fill="none" stroke="${theme.accent}" stroke-width="2" opacity="0.3" stroke-dasharray="8 6"/>
    <circle cx="340" cy="180" r="80" fill="rgba(255,255,255,0.03)" stroke="${theme.badge}" stroke-width="1.5" opacity="0.5"/>
    <circle cx="340" cy="180" r="50" fill="${theme.accent}" opacity="0.2"/>
    
    <!-- Cross / Caduceus Minimal Symbol -->
    <rect x="333" y="135" width="14" height="90" rx="7" fill="url(#gold)"/>
    <rect x="295" y="173" width="90" height="14" rx="7" fill="url(#gold)"/>

    <!-- Key Bullet Points Inside Showcase -->
    <g transform="translate(80, 310)">
      <circle cx="10" cy="10" r="4" fill="${theme.accent}"/>
      <text x="26" y="15" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0">High-yield exam topics &amp; repeated university questions</text>
      
      <circle cx="10" cy="40" r="4" fill="${theme.accent}"/>
      <text x="26" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0">Clear handwritten diagrams, clinical flowcharts &amp; mnemonics</text>
      
      <circle cx="10" cy="70" r="4" fill="${theme.accent}"/>
      <text x="26" y="75" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0">Perfect for MBBS • BHMS • B.Sc Nursing • BDS • BPT Students</text>
    </g>
  </g>

  <!-- Bottom Authority Bar -->
  <g transform="translate(60, 930)">
    <rect width="680" height="110" rx="20" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    
    <text x="40" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" letter-spacing="1">
      MEDICOS_MINDS
    </text>
    <text x="40" y="78" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#94A3B8">
      Official Study Material • @restore_healthphysio
    </text>

    <!-- Verified Badge -->
    <g transform="translate(510, 30)">
      <rect width="130" height="50" rx="25" fill="rgba(16,185,129,0.15)" stroke="#10B981" stroke-width="1.5"/>
      <circle cx="28" cy="25" r="10" fill="#10B981"/>
      <path d="M 23 25 L 27 29 L 34 21" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="46" y="29" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="#34D399" letter-spacing="1">VERIFIED</text>
    </g>
  </g>
</svg>`;
}

function generatePreviewSvg(title: string, pageNum: number): string {
  const theme = getTheme(title);
  const cleanTitle = escapeXml(title);
  const sampleTopics = pageNum === 1
    ? [
        "1. Classification, Clinical Anatomy & Key Principles",
        "2. Step-by-Step Diagnostic & Assessment Protocol",
        "3. High-Yield Exam Diagram: Flowchart & Pathway",
        "4. Important University Repeated Questions with Answers",
      ]
    : [
        "5. Evidence-Based Clinical Management & Interventions",
        "6. High-Yield Differential Diagnosis Table & Mnemonics",
        "7. Golden Clinical Pearls & MCQ Fast Recall Points",
        "8. Summary Notes for Last-Minute Rapid Revision",
      ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100">
  <defs>
    <linearGradient id="pbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>
    <pattern id="notebookGrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Page Background -->
  <rect width="800" height="1100" fill="url(#pbg)"/>
  <rect width="800" height="1100" fill="url(#notebookGrid)"/>

  <!-- Left Margin Rule -->
  <line x1="60" y1="0" x2="60" y2="1100" stroke="rgba(244,63,94,0.3)" stroke-width="2"/>

  <!-- Header Banner -->
  <g transform="translate(80, 45)">
    <rect width="660" height="70" rx="14" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="24" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="${theme.badge}" letter-spacing="2">MEDICOS MINDS STUDY GUIDE</text>
    <text x="24" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF">${cleanTitle}</text>
    <rect x="530" y="18" width="105" height="34" rx="17" fill="${theme.accent}" opacity="0.25"/>
    <text x="582" y="40" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="${theme.badge}" text-anchor="middle">PREVIEW ${pageNum}/2</text>
  </g>

  <!-- Section 1: Concept Overview Box -->
  <g transform="translate(80, 140)">
    <rect width="660" height="200" rx="16" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <rect x="0" y="0" width="8" height="200" rx="4" fill="${theme.accent}"/>
    
    <text x="24" y="36" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="800" fill="#F8FAFC">
      CHAPTER STUDY TOPICS • CORE CONCEPTS
    </text>
    
    ${sampleTopics.map((topic, i) => `
      <g transform="translate(24, ${65 + i * 32})">
        <circle cx="6" cy="6" r="4" fill="${theme.accent}"/>
        <text x="22" y="10" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#E2E8F0">${escapeXml(topic)}</text>
      </g>
    `).join("")}
  </g>

  <!-- Section 2: Clinical Flowchart / Diagram Box -->
  <g transform="translate(80, 365)">
    <rect width="660" height="300" rx="16" fill="rgba(255,255,255,0.02)" stroke="${theme.accent}" stroke-width="1.5" stroke-dasharray="6 4"/>
    
    <text x="330" y="40" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="${theme.badge}" text-anchor="middle" letter-spacing="1">
      HIGH-YIELD CLINICAL ALGORITHM &amp; DIAGRAM
    </text>

    <!-- Node 1 -->
    <rect x="230" y="70" width="200" height="46" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
    <text x="330" y="98" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF" text-anchor="middle">Initial Clinical Presentation</text>
    <line x1="330" y1="116" x2="330" y2="145" stroke="#94A3B8" stroke-width="2" marker-end="url(#arrow)"/>

    <!-- Branch Nodes -->
    <rect x="70" y="145" width="230" height="46" rx="10" fill="rgba(16,185,129,0.15)" stroke="#10B981" stroke-width="1"/>
    <text x="185" y="173" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#34D399" text-anchor="middle">Conservative Rehabilitation</text>

    <rect x="360" y="145" width="230" height="46" rx="10" fill="rgba(244,63,94,0.15)" stroke="#F43F5E" stroke-width="1"/>
    <text x="475" y="173" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#FDA4AF" text-anchor="middle">Advanced Clinical Intervention</text>

    <line x1="185" y1="191" x2="185" y2="220" stroke="#10B981" stroke-width="2"/>
    <line x1="475" y1="191" x2="475" y2="220" stroke="#F43F5E" stroke-width="2"/>

    <!-- Outcome Box -->
    <rect x="180" y="220" width="300" height="50" rx="12" fill="rgba(245,158,11,0.15)" stroke="#F59E0B" stroke-width="1.5"/>
    <text x="330" y="250" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" fill="#FBBF24" text-anchor="middle">Optimal Recovery &amp; Functional Outcome</text>
  </g>

  <!-- Section 3: High-Yield Exam Pearls Box -->
  <g transform="translate(80, 690)">
    <rect width="660" height="230" rx="16" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="24" y="36" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="#FBBF24" letter-spacing="1">
      ⚡ EXAM RAPID RECALL &amp; CLINICAL PEARLS
    </text>

    <g transform="translate(24, 60)">
      <text x="0" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#6EE7B7">Key Point A:</text>
      <text x="95" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#CBD5E1">Frequently asked long-answer question in university practicals &amp; theory.</text>
      
      <text x="0" y="46" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#6EE7B7">Key Point B:</text>
      <text x="95" y="46" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#CBD5E1">Essential contraindications and red-flag symptoms highlighted clearly.</text>

      <text x="0" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#6EE7B7">Key Point C:</text>
      <text x="95" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#CBD5E1">Step-by-step clinical protocol format simplifies fast exam revision.</text>

      <text x="0" y="106" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#6EE7B7">Key Point D:</text>
      <text x="95" y="106" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#CBD5E1">AIIMS, RRB &amp; State Recruitment exam MCQ points incorporated.</text>
    </g>
  </g>

  <!-- Footer Watermark -->
  <g transform="translate(80, 945)">
    <rect width="660" height="90" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <text x="330" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#94A3B8" text-anchor="middle">
      Sample Inside Page • Medicos Minds Digital Study Guide
    </text>
    <text x="330" y="66" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#64748B" text-anchor="middle">
      Unlock Complete Full-Resolution PDF Notes After Instant Purchase
    </text>
  </g>
</svg>`;
}

async function main() {
  console.log("=== Generating and Persisting Note Images ===");
  if (!fs.existsSync(NOTES_FILE)) {
    console.error("notes.json not found!");
    process.exit(1);
  }

  const raw = fs.readFileSync(NOTES_FILE, "utf-8");
  const notes: Note[] = JSON.parse(raw);
  console.log(`Found ${notes.length} notes in notes.json`);

  let generatedCount = 0;
  let persistedCount = 0;

  for (const note of notes) {
    // 1. Cover Image
    if (note.cover_image && note.cover_image.startsWith("/api/covers/")) {
      const filename = note.cover_image.replace("/api/covers/", "");
      const filePath = path.join(COVERS_DIR, filename);
      const svg = generateCoverSvg(note.title);
      const buffer = Buffer.from(svg, "utf-8");
      fs.writeFileSync(filePath, buffer);
      generatedCount++;

      const success = await saveImageToFirestore(filename, buffer, "image/svg+xml", note.id, "cover");
      if (success) persistedCount++;
    }

    // 2. Previews
    if (Array.isArray(note.preview_images)) {
      for (let idx = 0; idx < note.preview_images.length; idx++) {
        const pUrl = note.preview_images[idx];
        if (pUrl && pUrl.startsWith("/api/covers/")) {
          const filename = pUrl.replace("/api/covers/", "");
          const filePath = path.join(COVERS_DIR, filename);
          const svg = generatePreviewSvg(note.title, idx + 1);
          const buffer = Buffer.from(svg, "utf-8");
          fs.writeFileSync(filePath, buffer);
          generatedCount++;

          const success = await saveImageToFirestore(filename, buffer, "image/svg+xml", note.id, `preview_${idx + 1}`);
          if (success) persistedCount++;
        }
      }
    }
  }

  console.log(`Generated ${generatedCount} images locally on disk.`);
  console.log(`Persisted ${persistedCount} images to Firestore cloud storage.`);
}

main().catch(console.error);
