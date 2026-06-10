"use client";
// app/admin/page.jsx — Owner only panel

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, getDocs, query, orderBy, limit,
  where, Timestamp, doc, setDoc, deleteDoc, getDoc
} from "firebase/firestore";
import Navbar from "@/components/Navbar";
import styles from "./admin.module.css";

const OWNER_UID = "Gj0LKhJoonOJGHYyi8SwOqocZX42";

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("nugget");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("stats");

  // Ban form state
  const [banUid, setBanUid] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banMessage, setBanMessage] = useState("");
  const [banDuration, setBanDuration] = useState("permanent");
  const [banCustomDays, setBanCustomDays] = useState("");
  const [banning, setBanning] = useState(false);
  const [banMsg, setBanMsg] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u || u.uid !== OWNER_UID) { router.push("/"); return; }
      setCurrentUser(u);

      const usersSnap = await getDocs(collection(db, "users"));
      const userDocs = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

      const postsSnap = await getDocs(collection(db, "posts"));
      const allPosts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const now = new Date();
      const todayStart = new Timestamp(Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000), 0);
      const weekStart = new Timestamp(Math.floor(new Date(now - 7 * 24 * 60 * 60 * 1000).getTime() / 1000), 0);

      setStats({
        totalUsers: userDocs.length,
        totalPosts: allPosts.length,
        postsToday: allPosts.filter(p => p.createdAt?.seconds >= todayStart.seconds).length,
        postsThisWeek: allPosts.filter(p => p.createdAt?.seconds >= weekStart.seconds).length,
        verifiedUsers: userDocs.filter(u => u.verified).length,
        totalLikes: allPosts.reduce((acc, p) => acc + (p.likes?.length || 0), 0),
        bannedUsers: userDocs.filter(u => u.banned).length,
      });

      setAllUsers(userDocs.sort((a, b) => (a.username || "").localeCompare(b.username || "")));
      setRecentPosts([...allPosts].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 20));
      setLoading(false);
    });
  }, []);

  const handleBan = async () => {
    if (!banUid || !banReason || banning) return;
    setBanning(true);
    setBanMsg("");
    try {
      let banUntil = null;
      if (banDuration !== "permanent") {
        const days = banDuration === "custom" ? parseInt(banCustomDays) : parseInt(banDuration);
        if (!days || isNaN(days)) { setBanMsg("Enter valid number of days"); setBanning(false); return; }
        banUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      await setDoc(doc(db, "bans", banUid), {
        uid: banUid,
        reason: banReason,
        message: banMessage || "You have been banned from Hypr.",
        bannedAt: new Date().toISOString(),
        banUntil,
        permanent: banDuration === "permanent",
      });

      // Also mark user doc as banned
      await setDoc(doc(db, "users", banUid), { banned: true, banReason }, { merge: true });

      setBanMsg("User banned successfully!");
      setBanUid("");
      setBanReason("");
      setBanMessage("");
      setBanDuration("permanent");
      setBanCustomDays("");

      // Refresh users
      const usersSnap = await getDocs(collection(db, "users"));
      setAllUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })).sort((a, b) => (a.username || "").localeCompare(b.username || "")));
    } catch (err) {
      console.error("Ban failed:", err);
      setBanMsg("Something went wrong");
    } finally {
      setBanning(false);
    }
  };

  const handleUnban = async (uid) => {
    try {
      await deleteDoc(doc(db, "bans", uid));
      await setDoc(doc(db, "users", uid), { banned: false, banReason: "" }, { merge: true });
      const usersSnap = await getDocs(collection(db, "users"));
      setAllUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })).sort((a, b) => (a.username || "").localeCompare(b.username || "")));
    } catch (err) {
      console.error("Unban failed:", err);
    }
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <>
      <Navbar user={currentUser} username={username} onLogout={() => signOut(auth)} onUsernameChange={setUsername} />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Admin Panel</h1>
            <span className={styles.ownerBadge}>Owner</span>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            {["stats", "users", "bans", "posts"].map(tab => (
              <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`} onClick={() => setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Stats tab */}
          {activeTab === "stats" && stats && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}><p className={styles.statLabel}>Total Users</p><p className={styles.statValue}>{stats.totalUsers}</p></div>
              <div className={styles.statCard}><p className={styles.statLabel}>Total Posts</p><p className={styles.statValue}>{stats.totalPosts}</p></div>
              <div className={styles.statCard}><p className={styles.statLabel}>Posts Today</p><p className={styles.statValue}>{stats.postsToday}</p></div>
              <div className={styles.statCard}><p className={styles.statLabel}>Posts This Week</p><p className={styles.statValue}>{stats.postsThisWeek}</p></div>
              <div className={styles.statCard}><p className={styles.statLabel}>Verified Users</p><p className={styles.statValue}>{stats.verifiedUsers}</p></div>
              <div className={styles.statCard}><p className={styles.statLabel}>Total Likes</p><p className={styles.statValue}>{stats.totalLikes}</p></div>
              <div className={styles.statCard}><p className={styles.statLabel}>Banned Users</p><p className={`${styles.statValue} ${stats.bannedUsers > 0 ? styles.statDanger : ""}`}>{stats.bannedUsers}</p></div>
            </div>
          )}

          {/* Users tab */}
          {activeTab === "users" && (
            <div className={styles.table}>
              <div className={`${styles.tableHeader} ${styles.usersHeader}`}>
                <span>User</span><span>Username</span><span>Verified</span><span>Banned</span><span>Actions</span>
              </div>
              {allUsers.map((u) => (
                <div key={u.uid} className={`${styles.tableRow} ${styles.usersRow}`}>
                  <div className={styles.userCell}>
                    {u.photoURL ? <img src={u.photoURL} alt={u.username} className={styles.userAvatar} /> : <div className={styles.userAvatarFallback}>{u.username?.[0]?.toUpperCase() ?? "?"}</div>}
                    <a href={`/profile/${u.uid}`} className={styles.userLink} target="_blank" rel="noreferrer">{u.uid.slice(0, 8)}…</a>
                  </div>
                  <span className={styles.cell}>@{u.username || "—"}</span>
                  <span className={styles.cell}>{u.verified ? "✓" : "—"}</span>
                  <span className={`${styles.cell} ${u.banned ? styles.danger : ""}`}>{u.banned ? "Banned" : "—"}</span>
                  <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={() => { setBanUid(u.uid); setActiveTab("bans"); }}>Ban</button>
                    {u.banned && <button className={`${styles.actionBtn} ${styles.unbanBtn}`} onClick={() => handleUnban(u.uid)}>Unban</button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bans tab */}
          {activeTab === "bans" && (
            <div className={styles.banSection}>
              <div className={styles.banForm}>
                <h2 className={styles.sectionTitle}>Ban a User</h2>

                <label className={styles.fieldLabel}>User UID</label>
                <select className={styles.select} value={banUid} onChange={(e) => setBanUid(e.target.value)}>
                  <option value="">Select a user…</option>
                  {allUsers.filter(u => u.uid !== OWNER_UID).map(u => (
                    <option key={u.uid} value={u.uid}>@{u.username || u.uid.slice(0, 12)} {u.banned ? "(already banned)" : ""}</option>
                  ))}
                </select>

                <label className={styles.fieldLabel}>Duration</label>
                <select className={styles.select} value={banDuration} onChange={(e) => setBanDuration(e.target.value)}>
                  <option value="permanent">Permanent</option>
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="custom">Custom…</option>
                </select>

                {banDuration === "custom" && (
                  <>
                    <label className={styles.fieldLabel}>Custom days</label>
                    <input className={styles.input} type="number" min="1" placeholder="Number of days" value={banCustomDays} onChange={(e) => setBanCustomDays(e.target.value)} />
                  </>
                )}

                <label className={styles.fieldLabel}>Reason (internal)</label>
                <input className={styles.input} type="text" placeholder="e.g. Spam, harassment…" value={banReason} onChange={(e) => setBanReason(e.target.value)} />

                <label className={styles.fieldLabel}>Message shown to user</label>
                <textarea className={styles.textarea} rows={3} placeholder="e.g. You have been banned for violating our community guidelines." value={banMessage} onChange={(e) => setBanMessage(e.target.value)} />

                {banMsg && <p className={`${styles.banFeedback} ${banMsg.includes("successfully") ? styles.success : styles.error}`}>{banMsg}</p>}

                <button className={styles.banBtn} onClick={handleBan} disabled={!banUid || !banReason || banning}>
                  {banning ? "Banning…" : "Issue Ban"}
                </button>
              </div>

              <div className={styles.bannedList}>
                <h2 className={styles.sectionTitle}>Currently Banned</h2>
                {allUsers.filter(u => u.banned).length === 0 ? (
                  <p className={styles.empty}>No banned users.</p>
                ) : (
                  allUsers.filter(u => u.banned).map(u => (
                    <div key={u.uid} className={styles.bannedCard}>
                      <div className={styles.userCell}>
                        {u.photoURL ? <img src={u.photoURL} alt={u.username} className={styles.userAvatar} /> : <div className={styles.userAvatarFallback}>{u.username?.[0]?.toUpperCase() ?? "?"}</div>}
                        <div>
                          <p className={styles.cell}>@{u.username || "unknown"}</p>
                          <p className={styles.cellMuted}>{u.banReason}</p>
                        </div>
                      </div>
                      <button className={`${styles.actionBtn} ${styles.unbanBtn}`} onClick={() => handleUnban(u.uid)}>Unban</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Posts tab */}
          {activeTab === "posts" && (
            <div className={styles.table}>
              <div className={`${styles.tableHeader} ${styles.postsHeader}`}>
                <span>Author</span><span>Content</span><span>Likes</span>
              </div>
              {recentPosts.map((p) => (
                <div key={p.id} className={`${styles.tableRow} ${styles.postsRow}`}>
                  <span className={styles.cell}>@{p.authorName || "—"}</span>
                  <a href={`/post/${p.id}`} className={styles.postContent} target="_blank" rel="noreferrer">
                    {p.content ? p.content.slice(0, 80) + (p.content.length > 80 ? "…" : "") : p.imageUrl ? "[image/gif]" : "—"}
                  </a>
                  <span className={styles.cell}>{p.likes?.length || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}