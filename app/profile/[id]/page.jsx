"use client";
// app/profile/[id]/page.jsx

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, query, where, orderBy, onSnapshot,
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Post from "@/components/Post";
import { sendNotification } from "@/lib/notifications";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const { id } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists() && snap.data().username) setUsername(snap.data().username);
      }
    });
  }, []);

  // Fetch posts
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "posts"), where("authorId", "==", id), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [id]);

  // Real-time profile data from users collection
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "users", id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfileData((prev) => ({
          name: data.username || prev?.name || "Unknown user",
          photo: data.photoURL || prev?.photo || null,
          bio: data.bio || "",
          verified: data.verified || false,
        }));
        setFollowers(data.followers ?? []);
        setFollowing(data.following ?? []);
      } else if (currentUser?.uid === id) {
        setProfileData({ name: currentUser.displayName, photo: currentUser.photoURL, bio: "", verified: false });
      }
    });
    return unsub;
  }, [id, currentUser]);

  const isOwn = currentUser?.uid === id;
  const isFollowing = currentUser ? followers.includes(currentUser.uid) : false;

  const handleFollow = async () => {
    if (!currentUser || followLoading) return;
    setFollowLoading(true);
    try {
      const profileRef = doc(db, "users", id);
      const myRef = doc(db, "users", currentUser.uid);
      await setDoc(profileRef, { followers: [], following: [] }, { merge: true });
      await setDoc(myRef, { followers: [], following: [] }, { merge: true });
      if (isFollowing) {
        await updateDoc(profileRef, { followers: arrayRemove(currentUser.uid) });
        await updateDoc(myRef, { following: arrayRemove(id) });
      } else {
        await updateDoc(profileRef, { followers: arrayUnion(currentUser.uid) });
        await updateDoc(myRef, { following: arrayUnion(id) });
        sendNotification({ toUid: id, fromUid: currentUser.uid, type: "follow" });
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <>
      {currentUser && <Navbar user={currentUser} username={username} onLogout={() => signOut(auth)} onUsernameChange={setUsername} />}
      <main className={styles.main}>
        <div className="container">
          <div className={styles.profileCard}>
            <div className={styles.profileTop}>
              {profileData?.photo ? (
                <img src={profileData.photo} alt={profileData?.name ?? "User"} className={styles.avatar} />
              ) : (
                <div className={styles.avatarFallback}>{profileData?.name?.[0]?.toUpperCase() ?? "?"}</div>
              )}
              <div className={styles.profileInfo}>
                <h1 className={styles.name}>
                  {profileData?.name ?? "Unknown user"}
                  {profileData?.verified && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={styles.verifiedBadge}>
                      <circle cx="12" cy="12" r="12" fill="#6366f1" />
                      <path d="M7 13l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </h1>
                {profileData?.bio && <p className={styles.bio}>{profileData.bio}</p>}
                <div className={styles.stats}>
                  <span><strong>{posts.length}</strong> post{posts.length !== 1 ? "s" : ""}</span>
                  <span><strong>{followers.length}</strong> follower{followers.length !== 1 ? "s" : ""}</span>
                  <span><strong>{following.length}</strong> following</span>
                </div>
              </div>
              {!isOwn && currentUser && (
                <button className={`btn ${isFollowing ? styles.unfollowBtn : styles.followBtn}`} onClick={handleFollow} disabled={followLoading}>
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
              {isOwn && <span className={styles.badge}>Your profile</span>}
            </div>
          </div>

          <div className={styles.posts}>
            {posts.length === 0 ? (
              <p className={styles.empty}>No posts yet.</p>
            ) : (
              posts.map((post) => currentUser ? <Post key={post.id} post={post} currentUser={currentUser} /> : null)
            )}
          </div>
        </div>
      </main>
    </>
  );
}