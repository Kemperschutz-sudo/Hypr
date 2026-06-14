"use client";
// components/EmojiPicker.jsx

import { useState, useRef, useEffect } from "react";
import styles from "./EmojiPicker.module.css";

const CATEGORY_ICONS = {
  "Smileys": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  "People": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  "Animals": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" />
      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
    </svg>
  ),
  "Food": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  ),
  "Sports": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  "Travel": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a.5.5 0 0 0-.3.8l1.7 1.7c.4.4.9.6 1.5.6l2.4.1 3-3 1.5 4.5-3 3 .1 2.4c0 .6.2 1.1.6 1.5l1.7 1.7a.5.5 0 0 0 .8-.3z" />
    </svg>
  ),
  "Objects": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </svg>
  ),
  "Symbols": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
};

const EMOJI_CATEGORIES = {
  "Smileys": [
    ["😀","Grinning Face"],["😁","Beaming Face"],["😂","Face with Tears of Joy"],["🤣","Rolling on the Floor Laughing"],
    ["😊","Smiling Face"],["😍","Heart Eyes"],["🥰","Smiling Face with Hearts"],["😘","Face Blowing a Kiss"],
    ["😎","Cool Face"],["🤩","Star-Struck"],["😜","Winking Face with Tongue"],["🤔","Thinking Face"],
    ["😢","Crying Face"],["😭","Loudly Crying Face"],["😡","Angry Face"],["🥺","Pleading Face"],
    ["😴","Sleeping Face"],["🤯","Exploding Head"],["🥳","Partying Face"],["😏","Smirking Face"],
    ["🙄","Face Rolling Eyes"],["😬","Grimacing Face"],["🤗","Hugging Face"],["🫡","Saluting Face"],
    ["🫠","Melting Face"],["😤","Steam from Nose"],["🤮","Nauseated Face"],["😵","Dizzy Face"],
    ["🤑","Money-Mouth Face"],["😇","Smiling with Halo"],["🥴","Woozy Face"],["😈","Smiling Devil"],
    ["👻","Ghost"],["💀","Skull"],["🤡","Clown Face"],["👽","Alien"],["🤖","Robot"],["😺","Grinning Cat"],["🫩","Face with Bags Under Eyes"],
  ],
  "People": [
    ["👋","Waving Hand"],["🤝","Handshake"],["👍","Thumbs Up"],["👎","Thumbs Down"],
    ["❤️","Red Heart"],["🔥","Fire"],["⭐","Star"],["💯","Hundred Points"],
    ["🎉","Party Popper"],["🙏","Folded Hands"],["💪","Flexed Biceps"],["✌️","Victory Hand"],
    ["🤞","Crossed Fingers"],["🫶","Heart Hands"],["👀","Eyes"],["🫂","People Hugging"],
    ["🤌","Pinched Fingers"],["👏","Clapping Hands"],["🫳","Palm Down"],["🖐️","Hand with Fingers Splayed"],
    ["✋","Raised Hand"],["🤙","Call Me Hand"],["👌","OK Hand"],["🤏","Pinching Hand"],
    ["☝️","Index Finger Up"],["👇","Backhand Index Down"],["👈","Backhand Index Left"],["👉","Backhand Index Right"],
    ["🤜","Right-Facing Fist"],["🤛","Left-Facing Fist"],["👊","Oncoming Fist"],["✊","Raised Fist"],
    ["🙌","Raising Hands"],["🤲","Palms Up Together"],["💅","Nail Polish"],["🦶","Foot"],
  ],
  "Animals": [
    ["🐶","Dog"],["🐱","Cat"],["🐭","Mouse"],["🐹","Hamster"],
    ["🐰","Rabbit"],["🦊","Fox"],["🐻","Bear"],["🐼","Panda"],
    ["🐨","Koala"],["🐯","Tiger"],["🦁","Lion"],["🐸","Frog"],
    ["🐵","Monkey"],["🦄","Unicorn"],["🐔","Chicken"],["🐧","Penguin"],
    ["🦋","Butterfly"],["🐝","Honeybee"],["🦎","Lizard"],["🐠","Tropical Fish"],
    ["🐬","Dolphin"],["🐳","Whale"],["🦈","Shark"],["🐙","Octopus"],
    ["🦀","Crab"],["🐊","Crocodile"],["🦓","Zebra"],["🦒","Giraffe"],
    ["🐘","Elephant"],["🦏","Rhinoceros"],["🦛","Hippopotamus"],["🐆","Leopard"],
    ["🦅","Eagle"],["🦉","Owl"],["🦚","Peacock"],["🐍","Snake"],
  ],
  "Food": [
    ["🍕","Pizza"],["🍔","Hamburger"],["🌮","Taco"],["🍜","Noodles"],
    ["🍣","Sushi"],["🍦","Soft Ice Cream"],["🎂","Birthday Cake"],["🍩","Doughnut"],
    ["☕","Hot Beverage"],["🧋","Bubble Tea"],["🍺","Beer Mug"],["🥤","Cup with Straw"],
    ["🍿","Popcorn"],["🧁","Cupcake"],["🥐","Croissant"],["🍎","Red Apple"],
    ["🍓","Strawberry"],["🍑","Peach"],["🥑","Avocado"],["🌽","Ear of Corn"],
    ["🍗","Poultry Leg"],["🥩","Cut of Meat"],["🍳","Cooking"],["🥞","Pancakes"],
    ["🧀","Cheese"],["🌯","Burrito"],["🥗","Green Salad"],["🍱","Bento Box"],
    ["🍛","Curry Rice"],["🍝","Spaghetti"],["🥓","Bacon"],["🍟","French Fries"],
    ["🍰","Shortcake"],["🍫","Chocolate Bar"],["🍬","Candy"],["🍭","Lollipop"],
  ],
  "Sports": [
    ["⚽","Soccer Ball"],["🏀","Basketball"],["🏈","American Football"],["⚾","Baseball"],
    ["🎾","Tennis"],["🏐","Volleyball"],["🎮","Video Game"],["🕹️","Joystick"],
    ["🎯","Bullseye"],["🏆","Trophy"],["🥇","Gold Medal"],["🎭","Performing Arts"],
    ["🎨","Artist Palette"],["🎬","Clapper Board"],["🎤","Microphone"],["🎧","Headphone"],
    ["🎸","Guitar"],["🎹","Musical Keyboard"],["🎺","Trumpet"],["🥁","Drum"],
    ["🏄","Person Surfing"],["🏊","Person Swimming"],["🚴","Person Biking"],["🤸","Person Cartwheeling"],
    ["⛷️","Skier"],["🏋️","Person Lifting Weights"],["🥊","Boxing Glove"],["🏹","Bow and Arrow"],
    ["🎿","Skis"],["🛹","Skateboard"],["🏓","Ping Pong"],["🏸","Badminton"],
  ],
  "Travel": [
    ["🌍","Earth Globe"],["🌊","Water Wave"],["🏔️","Snow-Capped Mountain"],["🌋","Volcano"],
    ["🏖️","Beach"],["🌅","Sunrise"],["🌆","Cityscape at Dusk"],["🗺️","World Map"],
    ["✈️","Airplane"],["🚀","Rocket"],["🛸","Flying Saucer"],["🚗","Automobile"],
    ["🚂","Locomotive"],["⛵","Sailboat"],["🏠","House"],["🏰","Castle"],
    ["🗼","Tokyo Tower"],["🎡","Ferris Wheel"],["🌈","Rainbow"],["⛅","Sun Behind Cloud"],
    ["🌙","Crescent Moon"],["☀️","Sun"],["⚡","Lightning"],["❄️","Snowflake"],
    ["🌊","Ocean Wave"],["🏕️","Camping"],["🗽","Statue of Liberty"],["🗿","Moai"],
    ["🚁","Helicopter"],["🛥️","Motor Boat"],["🚢","Ship"],["🚂","Train"],
  ],
  "Objects": [
    ["💻","Laptop"],["📱","Mobile Phone"],["⌨️","Keyboard"],["🖥️","Desktop Computer"],
    ["🎁","Gift"],["📷","Camera"],["🔑","Key"],["💡","Light Bulb"],
    ["📚","Books"],["✏️","Pencil"],["📝","Memo"],["🗂️","Card Index Dividers"],
    ["🔔","Bell"],["📢","Loudspeaker"],["💰","Money Bag"],["💳","Credit Card"],
    ["🔒","Locked"],["🔓","Unlocked"],["🛡️","Shield"],["⚙️","Gear"],
    ["🧲","Magnet"],["💊","Pill"],["🩺","Stethoscope"],["🔭","Telescope"],
    ["🧪","Test Tube"],["🔬","Microscope"],["📡","Satellite Antenna"],["🛒","Shopping Cart"],
    ["🧹","Broom"],["🧴","Lotion Bottle"],["🪞","Mirror"],["🛋️","Couch"],
  ],
  "Symbols": [
    ["❤️","Red Heart"],["🧡","Orange Heart"],["💛","Yellow Heart"],["💚","Green Heart"],
    ["💙","Blue Heart"],["💜","Purple Heart"],["🖤","Black Heart"],["🤍","White Heart"],
    ["💔","Broken Heart"],["❣️","Heart Exclamation"],["💕","Two Hearts"],["💞","Revolving Hearts"],
    ["⭐","Star"],["🌟","Glowing Star"],["✨","Sparkles"],["💫","Dizzy"],
    ["🔥","Fire"],["💥","Collision"],["❄️","Snowflake"],["🌈","Rainbow"],
    ["☮️","Peace Symbol"],["✝️","Cross"],["☯️","Yin Yang"],["♾️","Infinity"],
    ["✅","Check Mark"],["❌","Cross Mark"],["⚠️","Warning"],["🚫","Prohibited"],
    ["💯","Hundred Points"],["🆕","New"],["🆒","Cool"],["🆓","Free"],
    ["🎵","Musical Note"],["🎶","Musical Notes"],["🔊","Speaker High Volume"],["🔇","Muted Speaker"],
  ],
};

export default function EmojiPicker({ onSelect, onClose, anchorRef }) {
  const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [pos, setPos] = useState({ bottom: 50, right: 16 });
  const [tooltip, setTooltip] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const pickerH = 300;
      const pickerW = 300;
      const top = rect.top - pickerH - 8;
      const left = Math.min(rect.left, window.innerWidth - pickerW - 16);
      setPos({ top: Math.max(8, top), left: Math.max(8, left) });
    } else {
      setPos({ bottom: 60, right: 16 });
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
            {CATEGORY_ICONS[cat]}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {EMOJI_CATEGORIES[activeCategory].map(([emoji, name]) => (
          <button
            key={emoji}
            className={styles.emojiBtn}
            onClick={() => onSelect(emoji)}
            onMouseEnter={() => setTooltip(name)}
            onMouseLeave={() => setTooltip(null)}
            title={name}
          >
            {emoji}
          </button>
        ))}
      </div>
      {tooltip && <div className={styles.tooltip}>{tooltip}</div>}
    </div>
  );
}