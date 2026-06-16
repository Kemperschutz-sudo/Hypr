"use client";
// app/settings/page.jsx

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import styles from "./settings.module.css";

const CLOUD_NAME = "drxpnwzsm";
const UPLOAD_PRESET = "hypr_uploads";

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [bio, setBio] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [savedDarkMode, setSavedDarkMode] = useState(true);
  const [showOnline, setShowOnline] = useState(true);
  const [savedShowOnline, setSavedShowOnline] = useState(true);
  const [customPhoto, setCustomPhoto] = useState(null);
  const [savedPhoto, setSavedPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const photoRef = useRef(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/"); return; }
      setCurrentUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.username) { setUsername(data.username); setUsernameInput(data.username); }
        if (data.bio) { setBio(data.bio); setBioInput(data.bio); }
        if (data.photoURL) { setCustomPhoto(data.photoURL); setSavedPhoto(data.photoURL); }
        if (data.darkMode !== undefined) {
          setDarkMode(data.darkMode);
          setSavedDarkMode(data.darkMode);
          document.documentElement.setAttribute("data-theme", data.darkMode ? "dark" : "light");
        }
        if (data.showOnline !== undefined) { setShowOnline(data.showOnline); setSavedShowOnline(data.showOnline); }
      }
      setLoading(false);
    });
  }, []);

  const currentPhoto = customPhoto || currentUser?.photoURL;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      setCustomPhoto(data.secure_url);
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleToggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  };

  const handleSave = async () => {
    if (!currentUser || saving) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const trimmed = usernameInput.trim().toLowerCase().replace(/\s+/g, "_");
      if (trimmed !== username) {
        if (trimmed.length < 3) { setSaveMsg("Username must be at least 3 characters"); setSaving(false); return; }
        if (!/^[a-z0-9_]+$/.test(trimmed)) { setSaveMsg("Only letters, numbers, and underscores"); setSaving(false); return; }
        const taken = await getDoc(doc(db, "usernames", trimmed));
        if (taken.exists() && taken.data().uid !== currentUser.uid) { setSaveMsg("Username already taken"); setSaving(false); return; }
        await setDoc(doc(db, "usernames", trimmed), { uid: currentUser.uid });
        setUsername(trimmed);
      }
      await setDoc(doc(db, "users", currentUser.uid), {
        username: trimmed || username,
        darkMode,
        showOnline,
        online: showOnline,
        bio: bioInput.trim(),
        lastSeen: serverTimestamp(),
        ...(customPhoto ? { photoURL: customPhoto } : {}),
      }, { merge: true });
      setBio(bioInput.trim());
      setSavedPhoto(customPhoto);
      setSavedDarkMode(darkMode);
      setSavedShowOnline(showOnline);
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveMsg("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    usernameInput.trim().toLowerCase().replace(/\s+/g, "_") !== username ||
    bioInput.trim() !== bio ||
    customPhoto !== savedPhoto ||
    darkMode !== savedDarkMode ||
    showOnline !== savedShowOnline;

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <>
      <Navbar user={currentUser} username={username} onLogout={() => signOut(auth)} onUsernameChange={setUsername} />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <button className={styles.backBtn} onClick={() => router.back()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
            <h1 className={styles.title}>Settings</h1>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Profile Picture</h2>
            <div className={styles.photoSection}>
              <div className={styles.photoPreview}>
                {currentPhoto ? (
                  <img src={currentPhoto} alt="Profile" className={styles.photoImg} />
                ) : (
                  <div className={styles.photoFallback}>{(usernameInput || username)?.[0]?.toUpperCase() ?? "?"}</div>
                )}
                {uploadingPhoto && <div className={styles.photoOverlay}><div className={styles.photoSpinner} /></div>}
              </div>
              <div className={styles.photoActions}>
                <button className={`btn btn-primary ${styles.uploadBtn}`} onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}>
                  {uploadingPhoto ? "Uploading…" : "Upload new photo"}
                </button>
                {customPhoto && (
                  <button className={`btn btn-ghost ${styles.removeBtn}`} onClick={() => setCustomPhoto(null)}>Remove photo</button>
                )}
                <p className={styles.photoHint}>JPG, PNG or GIF. Recommended 400×400px.</p>
              </div>
              <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
            </div>
          </section>

          <div className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Username</h2>
            <p className={styles.sectionDesc}>This is how people find and mention you.</p>
            <div className={styles.inputGroup}>
              <span className={styles.inputPrefix}>@</span>
              <input className={styles.input} type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} maxLength={30} placeholder="username" />
            </div>
          </section>

          <div className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Bio</h2>
            <p className={styles.sectionDesc}>Tell people a little about yourself. Max 160 characters.</p>
            <textarea
              className={styles.bioInput}
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder="Write a short bio…"
            />
            <p className={styles.bioCount}>{bioInput.length}/160</p>
          </section>

          <div className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Appearance</h2>
            <div className={styles.toggleRow}>
              <div>
                <p className={styles.toggleLabel}>{darkMode ? "Dark mode" : "Light mode"}</p>
                <p className={styles.toggleDesc}>Choose your preferred color scheme</p>
              </div>
              <button className={`${styles.toggle} ${darkMode ? styles.toggleOn : styles.toggleOff}`} onClick={handleToggleDarkMode}>
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </section>

          <div className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Privacy</h2>
            <div className={styles.toggleRow}>
              <div>
                <p className={styles.toggleLabel}>Online status</p>
                <p className={styles.toggleDesc}>Show others when you're active on Hypr</p>
              </div>
              <button className={`${styles.toggle} ${showOnline ? styles.toggleOn : styles.toggleOff}`} onClick={() => setShowOnline(!showOnline)}>
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </section>

          <div className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Account</h2>
            <button className={`btn ${styles.signOutBtn}`} onClick={() => signOut(auth).then(() => router.push("/"))}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </section>

          <div className={styles.saveBar}>
            {saveMsg && <span className={`${styles.saveMsg} ${saveMsg === "Saved!" ? styles.saveMsgSuccess : styles.saveMsgError}`}>{saveMsg}</span>}
            <button
              className={`btn btn-primary ${styles.saveBtn} ${!hasChanges && !saving ? styles.saveBtnIdle : ""}`}
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? "Saving…" : hasChanges ? "Save changes" : "No changes made"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}