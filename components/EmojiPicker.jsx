"use client";
// components/EmojiPicker.jsx

import { useState, useRef, useEffect } from "react";
import styles from "./EmojiPicker.module.css";

const EMOJI_CATEGORIES = {
  "😀 Smileys": ["😀","😂","🤣","😊","😍","🥰","😘","😎","🤩","😜","🤔","😢","😭","😡","🥺","😴","🤯","🥳","😏","🙄","😬","🤗","🫡","🫠","😤","🤮"],
  "👋 People": ["👋","🤝","👍","👎","❤️","🔥","⭐","💯","🎉","🙏","💪","✌️","🤞","🫶","👀","💀","🫂","🤌","👏","🫳"],
  "🐶 Animals": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐸","🐵","🦄","🐔","🐧","🦋","🐝","🦎","🐠"],
  "🍕 Food": ["🍕","🍔","🌮","🍜","🍣","🍦","🎂","🍩","☕","🧋","🍺","🥤","🍿","🧁","🥐","🍎","🍓","🍑","🥑","🌽"],
  "⚽ Sports": ["⚽","🏀","🏈","⚾","🎾","🏐","🎮","🕹️","🎯","🎪","🏆","🥇","🎭","🎨","🎬","🎤","🎧","🎸","🎹","🎺"],
  "🌍 Travel": ["🌍","🌊","🏔️","🌋","🏖️","🌅","🌆","🗺️","✈️","🚀","🛸","🚗","🚂","⛵","🏠","🏰","🗼","🎡","🌈","⛅"],
};

export default function EmojiPicker({ onSelect, onClose, anchorRef }) {
  const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [pos, setPos] = useState({ bottom: 50, right: 16 });
  const ref = useRef(null);

  useEffect(() => {
    // Calculate position to stay on screen
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const pickerH = 280;
      const pickerW = 300;
      const top = rect.top - pickerH - 8;
      const left = Math.min(rect.left, window.innerWidth - pickerW - 16);
      setPos({ top: Math.max(8, top), left: Math.max(8, left) });
    } else {
      // Fallback: position above bottom right
      setPos({
        bottom: 60,
        right: 16,
      });
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={styles.picker} ref={ref} style={pos}>
      <div className={styles.categories}>
        {Object.keys(EMOJI_CATEGORIES).map(cat => (
          <button
            key={cat}
            className={`${styles.catBtn} ${activeCategory === cat ? styles.catActive : ""}`}
            onClick={() => setActiveCategory(cat)}
            title={cat}
          >
            {cat.split(" ")[0]}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {EMOJI_CATEGORIES[activeCategory].map(emoji => (
          <button key={emoji} className={styles.emojiBtn} onClick={() => onSelect(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}