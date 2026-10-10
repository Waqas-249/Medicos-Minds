import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  Firestore,
} from "firebase/firestore";
import fs from "fs";
import path from "path";

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
 * Fetch all notes stored in Firestore
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
    console.log(`[FIREBASE] Retrieved ${notes.length} notes from Firestore cloud storage.`);
    return notes;
  } catch (err: any) {
    console.error("[FIREBASE] Error fetching notes from Firestore:", err?.message || err);
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

/**
 * Health check status
 */
export async function getFirebaseHealth(): Promise<{ configured: boolean; connected: boolean; count: number }> {
  if (!db) {
    return { configured: false, connected: false, count: 0 };
  }
  try {
    const notes = await fetchAllNotesFromFirestore();
    return { configured: true, connected: true, count: notes.length };
  } catch {
    return { configured: true, connected: false, count: 0 };
  }
}
