import { useId } from "react";

// A quiet room shell. Everything you can move belongs to the furniture catalogue.
export default function RoomBackdrop({ theme = "sunroom", preview = false }) {
  const prefix = useId().replace(/:/g, "");
  const colors = {
    sunroom: { wall: "#f3e4d2", shade: "#e2cad2", floor: "#e1bc91", sky: "#c8dce4", light: "#fff8d6", hill: "#c2caa9", wood: "#c8a078" },
    moonroom: { wall: "#ded6e6", shade: "#bcb2cd", floor: "#c5aeb1", sky: "#878eaf", light: "#e5e0f1", hill: "#9aabac", wood: "#b4a0aa" },
    greenhouse: { wall: "#e9e8d5", shade: "#c7d1bb", floor: "#d2c19d", sky: "#d4e5dd", light: "#fff8db", hill: "#a8c1a5", wood: "#b5ab86" },
  }[theme] || {};
  return (
    <svg className={`room-backdrop ${preview ? "room-preview" : ""}`} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${prefix}-wall`} x2="1" y2="1">
          <stop stopColor={colors.wall} /><stop offset="1" stopColor={colors.shade} />
        </linearGradient>
        <linearGradient id={`${prefix}-floor`} x2="0" y2="1">
          <stop stopColor={colors.floor} /><stop offset="1" stopColor={colors.wall} />
        </linearGradient>
        <radialGradient id={`${prefix}-sun`} cx="1" cy=".35" r=".95">
          <stop stopColor={colors.light} stopOpacity=".65" /><stop offset="1" stopColor={colors.light} stopOpacity="0" />
        </radialGradient>
        <filter id={`${prefix}-paper`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="linear" slope=".035" /></feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
        <clipPath id={`${prefix}-glass`}><path d="M1190 555V264a135 135 0 0 1 270 0v291Z" /></clipPath>
      </defs>
      <g filter={`url(#${prefix}-paper)`}>
        <path fill={`url(#${prefix}-wall)`} d="M0 0h1600v667H0z" />
        <path fill={`url(#${prefix}-sun)`} d="M0 0h1600v1000H0z" />
        <path fill={colors.wood} opacity=".18" d="m0 0 55 28h1490l55-28Z" />
        <path fill={`url(#${prefix}-floor)`} d="M0 662h1600v338H0z" />
        <g stroke={colors.wood} fill="none" strokeWidth="2" opacity=".32">
          {[685, 724, 779, 852, 946].map(y => <path key={y} d={`M0 ${y}h1600`} />)}
          {[-1200, -600, 0, 600, 1200, 1800, 2400, 3000].map(x => <path key={x} d={`M${800 + (x - 800) * .22} 662  ${x} 1000`} />)}
        </g>
        <path d="M0 649h1600v15H0z" fill={colors.wood} opacity=".6" />
        <path d="M0 651h1600" stroke={colors.light} strokeWidth="5" opacity=".55" />
        <path d="m1190 556 270-1-472 252H505Z" fill={colors.light} opacity=".19" />
        <path d="M1173 571V262a152 152 0 0 1 304 0v309Z" fill={colors.wood} opacity=".24" transform="translate(-8 8)" />
        <path d="M1173 570V264a152 152 0 0 1 304 0v306Z" fill={colors.wood} />
        <g clipPath={`url(#${prefix}-glass)`}>
          <path d="M1185 120h300v440h-300z" fill={colors.sky} />
          {theme === "moonroom" ? <><circle cx="1401" cy="228" r="33" fill="#f8edcd" /><circle cx="1416" cy="214" r="30" fill={colors.sky} /><path d="m1239 244 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" fill="#f6eadb" /></> : <circle cx="1393" cy="231" r="48" fill="#ffefd0" opacity=".8" />}
          <path d="M1150 493q119-116 221-25t135-42v163h-356Z" fill={colors.hill} />
          <path d="M1160 542q103-59 194-35t169-6v86h-363Z" fill={colors.hill} opacity=".6" />
          <path d="M1248 142q-43 153-20 413h-28q-22-271 33-413Z" fill="#fffef0" opacity=".22" />
        </g>
        <path d="M1190 555V264a135 135 0 0 1 270 0v291ZM1325 130v425M1190 332h270M1190 448h270" stroke={colors.light} strokeWidth="12" fill="none" />
        <path d="M1325 130v425M1190 332h270M1190 448h270" stroke={colors.wood} strokeWidth="2" fill="none" opacity=".35" />
        <path d="M1158 567h334v13h-334z" fill={colors.wood} /><path d="M1158 566h334" stroke={colors.light} strokeWidth="6" />
        <path d="M1150 139q32 31 29 95t-13 131q-20 111-25 205h-46q24-134 28-231t-6-200Z" fill="#fff7e8" opacity=".57" />
        <path d="M1480 139q-8 116 2 203t38 228h-49q-32-173-27-244t3-187Z" fill="#fff7e8" opacity=".45" />
      </g>
    </svg>
  );
}

function LeafSprig({ x = 0, y = 0, scale = 1 }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} stroke="#8fa087" strokeWidth="3" strokeLinecap="round" fill="#afc0a1">
    <path d="M0 67Q-2 19 6-26" fill="none" /><path d="M1 24C-34 23-45-1-32-13-11-17-1 5 1 24Z" /><path d="M3 2C30 2 42-22 28-32 7-27 3-11 3 2Z" /><path d="M0 48C27 48 42 29 29 18 9 18 3 30 0 48Z" /><path d="M3-11C-14-18-20-36-7-44 8-39 12-26 3-11Z" />
  </g>;
}

export function FurnitureArt({ id, className = "", ...props }) {
  const width = id === "couch" ? 360 : id === "rug" ? 360 : 220;
  const height = id === "rug" ? 150 : id === "bookshelf" ? 300 : 220;
  let drawing;
  if (id === "couch") drawing = <>
    <ellipse cx="179" cy="203" rx="164" ry="12" fill="#8c7285" opacity=".12" />
    <path d="m46 177-6 28h16l9-28m230 0 9 28h15l-6-29" fill="#b69b81" />
    <path d="M35 122V65q0-34 36-34h219q33 0 33 33v62Z" fill="#d3a1a4" stroke="#b78993" strokeWidth="2.5" />
    <path d="M64 115V64q0-12 18-12h84q14 0 14 15v48m6 0V68q0-16 16-16h81q17 0 17 15v49" fill="#e4b6b4" stroke="#cca0a3" strokeWidth="2" />
    <path d="M31 125q139-16 294 0v52q0 15-16 15H48q-17 0-17-15Z" fill="#d5a4a7" stroke="#b78993" strokeWidth="2.5" />
    <path d="M46 126q61-18 125-7 8 4 8 20v14H47Zm139-5q80-15 126 5v28H185Z" fill="#eac2bd" stroke="#cca0a3" strokeWidth="2" />
    <path d="M16 111q0-22 21-22t22 22v57q0 12-12 12H29q-13 0-13-12Zm285 0q0-22 21-22t22 22v57q0 12-12 12h-18q-13 0-13-12Z" fill="#e2b3b0" stroke="#b78993" strokeWidth="2.5" />
    <path d="m81 77 40-7q8 0 10 8l5 35-51 7-9-32q-2-8 5-11Z" fill="#c9bdd5" stroke="#b5a6c3" strokeWidth="2" /><path d="m242 70 36 8q8 2 7 11l-8 29-51-9 6-30q1-9 10-9Z" fill="#ede0b9" stroke="#d4c6a6" strokeWidth="2" />
    <path d="M55 163h245" stroke="#b78993" strokeWidth="2" opacity=".45" />
  </>;
  else if (id === "rug") drawing = <>
    <ellipse cx="180" cy="82" rx="171" ry="62" fill="#a996b6" opacity=".15" />
    <ellipse cx="180" cy="74" rx="170" ry="62" fill="#d8ccdf" stroke="#b5a3c3" strokeWidth="2" />
    {[0, 1, 2, 3, 4].map(n => <ellipse key={n} cx="180" cy="74" rx={153 - n * 23} ry={53 - n * 8} fill="none" stroke={n % 2 ? "#eae1ec" : "#c4b5cf"} strokeWidth="5" strokeDasharray="2 5" />)}
    <path d="M13 63 3 59m10 14H1m14 9L4 86m345-23 10-4m-10 14h11m-14 9 11 4" stroke="#c1aecb" strokeWidth="2" />
  </>;
  else if (id === "bookshelf") drawing = <>
    <path d="M30 279V45q0-31 33-31h96q32 0 32 31v234Z" fill="#d1b999" stroke="#b59980" strokeWidth="3" />
    <path d="M43 265V48q0-21 23-21h90q22 0 22 21v217Z" fill="#c8ad94" />
    {[82, 162, 243].map(y => <g key={y}>
      <path d={`M39 ${y}h144v10H39z`} fill="#e5ccb0" stroke="#bba18b" strokeWidth="1.5" />
      {y !== 162 && [0,1,2,3,4].map((n) => <rect key={n} x={51 + n * 16} y={y - 43 - (n % 2) * 5} width="13" height={43 + (n % 2) * 5} rx="2" fill={["#b8bec2", "#d7b1b3", "#c8c5a1", "#e3c8ab", "#bab0cb"][n]} />)}
    </g>)}
    <path d="M57 143v-26q0-12 14-12t14 12v26q0 17-14 17t-14-17Z" fill="#e5d9ca" /><path d="M54 135h34m-34 9h34" stroke="#b6adc4" strokeWidth="3" opacity=".6" />
    <path d="M106 128h53v33h-53z" fill="#e6ceac" stroke="#b39b80" strokeWidth="2" /><path d="M112 155v-21h41v21Z" fill="#d4d9c5" /><path d="m112 155 14-13 12 10 8-9 7 12Z" fill="#b9c0aa" />
    <path d="M33 275h156v12H33zM39 287v9m143-9v9" stroke="#b39980" strokeWidth="6" fill="#dfc5a7" />
  </>;
  else if (id === "window-plants") drawing = <>
    <LeafSprig x={56} y={86} scale={.66} /><LeafSprig x={114} y={75} scale={.95} /><LeafSprig x={176} y={96} scale={.6} />
    <path d="m32 126 7 46h34l7-46Z" fill="#ddbcaa" stroke="#bf9f93" strokeWidth="2" /><path d="m85 135 8 54h43l8-54Z" fill="#e0d4b9" stroke="#bdaf96" strokeWidth="2" /><path d="m151 135 6 38h36l6-38Z" fill="#c9bed4" stroke="#b1a0bc" strokeWidth="2" />
    <path d="M26 188h180v9H26z" fill="#d7bba0" /><path d="M34 197v9m163-9v9" stroke="#bb9f89" strokeWidth="5" />
  </>;
  else if (id === "table" || id === "side-table") drawing = <>
    <ellipse cx="110" cy="201" rx="79" ry="10" fill="#8c7285" opacity=".12" />
    <path d="m56 110-11 88h13l15-88m75 0 14 88h13l-10-88M104 117l-2 77h13l3-77" fill="#c4a58e" stroke="#b29581" strokeWidth="2" />
    <ellipse cx="110" cy="106" rx="88" ry="30" fill="#c9ab91" stroke="#b99b84" strokeWidth="2" /><ellipse cx="110" cy="98" rx="88" ry="30" fill="#e7cfb3" stroke="#c4a58e" strokeWidth="2" />
    <path d="M45 93q61-29 134 0M52 110q51 15 116 0" stroke="#d1b69b" strokeWidth="1.7" fill="none" opacity=".6" />
  </>;
  else if (id === "plant") drawing = <>
    <LeafSprig x={111} y={87} scale={1.25} /><path d="m71 151 12 57h57l12-57Z" fill="#dec4ad" stroke="#bda491" strokeWidth="2.5" /><ellipse cx="111" cy="152" rx="41" ry="9" fill="#c4ad9a" /><path d="M81 172h59m-53 13h46m-44 12h43" stroke="#e8d5c0" strokeWidth="3" />
  </>;
  else if (id === "cushion") drawing = <>
    <path d="M29 157q-9-36 4-55 17-15 70-14 58-5 81 12 14 28 4 57-60 29-159 0Z" fill="#cdbed8" stroke="#b3a0c0" strokeWidth="3" /><path d="M39 150q59 20 139 0M41 109q59-15 129-1" fill="none" stroke="#e0d6e7" strokeWidth="3" /><circle cx="110" cy="127" r="5" fill="#b9a6c6" />
  </>;
  else drawing = <>
    <path d="m35 149 126-17 21 24-126 18Z" fill="#b9adc7" stroke="#a195af" strokeWidth="2" /><path d="m44 153 111-15 12 14-111 16Z" fill="#f3e8d7" /><path d="m38 133 124 5-2 20-124-5Z" fill="#d9b7ad" stroke="#bca196" strokeWidth="2" /><path d="m48 138 105 4v9l-105-4Z" fill="#f6ebd9" /><path d="m49 111 120 11-7 16-120-11Z" fill="#b7c3ae" stroke="#9caa95" strokeWidth="2" />
  </>;
  return <span aria-hidden="true" className={`furniture-art furniture-art-${id} ${className}`} {...props}><svg viewBox={`0 0 ${width} ${height}`} fill="none" strokeLinejoin="round" strokeLinecap="round">{drawing}</svg></span>;
}
