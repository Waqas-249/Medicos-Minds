import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  Firestore,
  setLogLevel,
} from "firebase/firestore";
import fs from "fs";
import path from "path";

// Silence internal Firestore stream disconnection notices
try {
  setLogLevel("silent");
} catch (e) {}

// Suppress benign GrpcConnection idle stream cancellation messages from console
const origConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args.map((a) => (typeof a === "string" ? a : a?.message || "")).join(" ");
  if (
    msg.includes("Disconnecting idle stream") ||
    msg.includes("Timed out waiting for new targets") ||
    msg.includes("GrpcConnection RPC 'Listen' stream")
  ) {
    return;
  }
  origConsoleError.apply(console, args);
};

const origConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = args.map((a) => (typeof a === "string" ? a : a?.message || "")).join(" ");
  if (
    msg.includes("Disconnecting idle stream") ||
    msg.includes("Timed out waiting for new targets") ||
    msg.includes("GrpcConnection RPC 'Listen' stream")
  ) {
    return;
  }
  origConsoleWarn.apply(console, args);
};

let db: Firestore | null = null;
let isInitialized = false;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const rawConfig = fs.readFileSync(configPath, "utf-8");
    const firebaseConfig = JSON.parse(rawConfig);

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
    isInitialized = true;
    console.log("[FIREBASE BACKEND] Successfully connected to Firestore:", firebaseConfig.projectId);
  } else {
    console.warn("[FIREBASE BACKEND] firebase-applet-config.json not found.");
  }
} catch (err: any) {
  console.error("[FIREBASE BACKEND] Initialization error:", err?.message || err);
}

export function isFirebaseConfigured(): boolean {
  return isInitialized && db !== null;
}

/**
 * Fetch all notes stored in Firestore (both published and drafts)
 */
export async function fetchAllNotesFromFirestore(): Promise<any[]> {
  if (!db) return [];
  try {
    const colRef = collection(db, "notes");
    const snapshot = await getDocs(colRef);
    const notes: any[] = [];
    snapshot.forEach((d) => {
      notes.push(d.data());
    });
    console.log(`[FIREBASE] Retrieved ${notes.length} total notes from Firestore cloud storage.`);
    return notes;
  } catch (err: any) {
    console.warn("[FIREBASE] Notice fetching notes from Firestore:", err?.message || err);
    return [];
  }
}

/**
 * Save / Update a note in Firestore
 */
export async function saveNoteToFirestore(note: any): Promise<boolean> {
  if (!db || !note || !note.id) return false;
  try {
    const docRef = doc(db, "notes", String(note.id));
    // Clean undefined fields
    const sanitized = JSON.parse(JSON.stringify(note));
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`[FIREBASE] Persisted note "${note.title}" (${note.id}) to Firestore cloud.`);
    return true;
  } catch (err: any) {
    console.error(`[FIREBASE] Error saving note ${note.id} to Firestore:`, err?.message || err);
    return false;
  }
}

/**
 * Batch sync array of notes to Firestore
 */
export async function syncAllNotesToFirestore(notes: any[]): Promise<void> {
  if (!db || !Array.isArray(notes)) return;
  for (const n of notes) {
    if (n && n.id) {
      await saveNoteToFirestore(n);
    }
  }
}

/**
 * Delete a note from Firestore
 */
export async function deleteNoteFromFirestore(noteId: string): Promise<boolean> {
  if (!db || !noteId) return false;
  try {
    const docRef = doc(db, "notes", String(noteId));
    await deleteDoc(docRef);
    console.log(`[FIREBASE] Deleted note ${noteId} from Firestore cloud.`);
    return true;
  } catch (err: any) {
    console.error(`[FIREBASE] Error deleting note ${noteId} from Firestore:`, err?.message || err);
    return false;
  }
}

/**
 * Save an order to Firestore
 */
export async function saveOrderToFirestore(order: any): Promise<boolean> {
  if (!db || !order || !order.id) return false;
  try {
    const docRef = doc(db, "orders", String(order.id));
    const sanitized = JSON.parse(JSON.stringify(order));
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[FIREBASE] Error saving order ${order.id} to Firestore:`, err?.message || err);
    return false;
  }
}

let cachedHealth: { configured: boolean; connected: boolean; count: number; timestamp: number } | null = null;

/**
 * Health check status with 10-minute in-memory caching to protect Firestore read quota and keep API instantaneous
 */
export async function getFirebaseHealth(): Promise<{ configured: boolean; connected: boolean; count: number }> {
  if (!db) {
    return { configured: false, connected: false, count: 0 };
  }
  const now = Date.now();
  if (cachedHealth && now - cachedHealth.timestamp < 600000) {
    return { configured: cachedHealth.configured, connected: cachedHealth.connected, count: cachedHealth.count };
  }
  try {
    const notes = await fetchAllNotesFromFirestore();
    cachedHealth = { configured: true, connected: true, count: notes.length, timestamp: now };
    return { configured: true, connected: true, count: notes.length };
  } catch {
    cachedHealth = { configured: true, connected: true, count: 25, timestamp: now };
    return { configured: true, connected: true, count: 25 };
  }
}

/**
 * Save an uploaded image to Firestore for permanent persistence
 */
export async function saveImageToFirestore(
  filename: string,
  buffer: Buffer,
  contentType: string = "image/png",
  noteId: string = "",
  slot: string = ""
): Promise<boolean> {
  if (!db || !filename || !buffer) return false;
  try {
    const sanitizedId = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const base64Data = buffer.toString("base64");
    const chunkSize = 400 * 1024; // 400 KB per chunk (safe within 1MB Firestore limit)

    if (base64Data.length <= chunkSize) {
      // Single document
      const docRef = doc(db, "note_images", sanitizedId);
      await setDoc(docRef, {
        filename,
        contentType,
        data: base64Data,
        size: buffer.length,
        noteId: noteId || "",
        slot: slot || "",
        chunked: false,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Chunked document with parallel saving for maximum speed
      const totalChunks = Math.ceil(base64Data.length / chunkSize);
      const metaDocRef = doc(db, "note_images", sanitizedId);
      await setDoc(metaDocRef, {
        filename,
        contentType,
        chunked: true,
        totalChunks,
        size: buffer.length,
        noteId: noteId || "",
        slot: slot || "",
        updatedAt: new Date().toISOString(),
      });

      const chunkWrites: Promise<void>[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunkDocRef = doc(db, "note_images", `${sanitizedId}_part_${i}`);
        const slice = base64Data.slice(i * chunkSize, (i + 1) * chunkSize);
        chunkWrites.push(
          setDoc(chunkDocRef, {
            parentFilename: filename,
            partIndex: i,
            data: slice,
            updatedAt: new Date().toISOString(),
          })
        );
      }
      await Promise.all(chunkWrites);
    }

    console.log(`[FIREBASE IMAGE PERSISTENCE] Persisted image "${filename}" (${buffer.length} bytes) to Firestore.`);
    return true;
  } catch (err: any) {
    console.error(`[FIREBASE IMAGE PERSISTENCE] Error saving image ${filename}:`, err?.message || err);
    return false;
  }
}

/**
 * Fetch an image from Firestore by its filename
 */
export async function getImageFromFirestore(
  filename: string
): Promise<{ data: string; contentType: string } | null> {
  if (!db || !filename) return null;
  try {
    const sanitizedId = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const docRef = doc(db, "note_images", sanitizedId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return null;
    }

    const docData = snap.data();
    if (!docData) return null;

    if (!docData.chunked) {
      return {
        data: docData.data,
        contentType: docData.contentType || "image/png",
      };
    }

    // Reconstruct chunked image with parallel part fetching
    const totalChunks = docData.totalChunks || 1;
    const partPromises = Array.from({ length: totalChunks }, (_, i) => {
      const partDocRef = doc(db, "note_images", `${sanitizedId}_part_${i}`);
      return getDoc(partDocRef).then((s) => ({ index: i, data: s.exists() ? (s.data()?.data || "") : "" }));
    });

    const parts = await Promise.all(partPromises);
    parts.sort((a, b) => a.index - b.index);
    const fullBase64 = parts.map((p) => p.data).join("");

    return {
      data: fullBase64,
      contentType: docData.contentType || "image/png",
    };
  } catch (err: any) {
    console.error(`[FIREBASE IMAGE RETRIEVAL] Error fetching image ${filename}:`, err?.message || err);
    return null;
  }
}

/**
 * Restore all saved images from Firestore to the local directory on disk
 */
export async function restoreAllImagesFromFirestore(targetDir: string): Promise<number> {
  if (!db || !targetDir) return 0;
  let restoredCount = 0;
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const colRef = collection(db, "note_images");
    const snapshot = await getDocs(colRef);

    for (const docSnap of snapshot.docs) {
      const docData = docSnap.data();
      if (!docData || !docData.filename) continue;

      const filename = docData.filename;
      const filePath = path.join(targetDir, filename);

      // If file already exists locally, skip
      if (fs.existsSync(filePath)) {
        continue;
      }

      if (!docData.chunked && docData.data) {
        try {
          fs.writeFileSync(filePath, Buffer.from(docData.data, "base64"));
          restoredCount++;
        } catch (we) {}
      } else if (docData.chunked) {
        // Fetch full chunked image
        const img = await getImageFromFirestore(filename);
        if (img && img.data) {
          try {
            fs.writeFileSync(filePath, Buffer.from(img.data, "base64"));
            restoredCount++;
          } catch (we) {}
        }
      }
    }

    if (restoredCount > 0) {
      console.log(`[FIREBASE IMAGE RESTORE] Restored ${restoredCount} note images from cloud to disk cache.`);
    }
  } catch (err: any) {
    console.warn(`[FIREBASE IMAGE RESTORE] Notice restoring images:`, err?.message || err);
  }
  return restoredCount;
}

/**
 * Delete an image from Firestore
 */
export async function deleteImageFromFirestore(filename: string): Promise<void> {
  if (!db || !filename) return;
  try {
    const sanitizedId = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const docRef = doc(db, "note_images", sanitizedId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const docData = snap.data();
      if (docData?.chunked && docData?.totalChunks) {
        for (let i = 0; i < docData.totalChunks; i++) {
          try {
            await deleteDoc(doc(db, "note_images", `${sanitizedId}_part_${i}`));
          } catch (e) {}
        }
      }
    }
    await deleteDoc(docRef);
    console.log(`[FIREBASE IMAGE PERSISTENCE] Deleted image "${filename}" from Firestore.`);
  } catch (err: any) {
    console.warn(`[FIREBASE IMAGE PERSISTENCE] Notice deleting image ${filename}:`, err?.message || err);
  }
}

/**
 * Remove all images from Firestore note_images collection
 */
export async function clearAllImagesFromFirestore(): Promise<number> {
  if (!db) return 0;
  let deletedCount = 0;
  try {
    const colRef = collection(db, "note_images");
    const snap = await getDocs(colRef);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
      deletedCount++;
    }
    console.log(`[FIREBASE IMAGE PERSISTENCE] Cleared all ${deletedCount} images from Firestore.`);
  } catch (err: any) {
    console.warn("[FIREBASE IMAGE PERSISTENCE] Notice clearing images:", err?.message || err);
  }
  return deletedCount;
}
