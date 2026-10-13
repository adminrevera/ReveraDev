"use client";

import { useId } from "react";

export type LumiMood = "base" | "studieuse" | "contente" | "fatiguee";

type LumiProps = {
  mood?: LumiMood;
  /** largeur en px (la hauteur suit : 400 × 440) */
  size?: number;
  animated?: boolean;
  className?: string;
  title?: string;
};

const STAR = "M0 -16 L5 -5 L16 0 L5 5 L0 16 L-5 5 L-16 0 L-5 -5 Z";

export default function Lumi({
  mood = "base",
  size = 240,
  animated = true,
  className = "",
  title = "Lumi, la luciole",
}: LumiProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gid = (name: string) => `${name}-${uid}`;

  const tired = mood === "fatiguee";
  const happy = mood === "contente";
  const study = mood === "studieuse";

  const abdomen = tired
    ? ["#B9B4D8", "#8A86B8", "#5B5E96"]
    : happy
      ? ["#FFF8DC", "#FFD66E", "#F59E2E"]
      : ["#FFF4CC", "#FFCF63", "#F2992B"];
  const glowOpacity = tired ? 0.14 : happy ? 0.7 : 0.5;
  const glowR = tired ? 170 : happy ? 210 : 190;
  const wingA = tired ? 0.3 : 0.55;
  const wingB = tired ? 0.1 : 0.18;
  const wingStroke = tired ? 0.35 : 0.6;
  const seg = tired ? "#3F4377" : "#E08A1E";
  const segOpacity = tired ? 0.6 : 0.35;
  const head = tired ? ["#F2F3FF", "#C3CAF0"] : ["#FFFFFF", "#CBD2F6"];
  const bodyColor = tired ? "#B4BBE6" : "#C4CBF5";
  const armColor = tired ? "#A7B0E2" : "#B8C0F0";
  const antennaColor = tired ? "#C3CAF0" : "#CBD2F6";
  const bulbColor = tired ? "#7C80AE" : "#FFD27A";

  const headY = tired ? 172 : 168;
  const cheekY = study ? 210 : happy ? 208 : tired ? 210 : 206;
  const cheekOpacity = tired ? 0.4 : happy ? 0.7 : 0.6;

  const antL = tired
    ? "M168 100 C150 72 122 72 104 92"
    : happy
      ? "M168 96 C160 58 136 38 106 34"
      : "M168 96 C160 60 136 42 106 40";
  const antR = tired
    ? "M232 100 C250 72 278 72 296 92"
    : happy
      ? "M232 96 C240 58 264 38 294 34"
      : "M232 96 C240 60 264 42 294 40";
  const bulbL = tired ? { x: 100, y: 96, r: 11 } : happy ? { x: 102, y: 34, r: 12 } : { x: 102, y: 40, r: 11 };
  const bulbR = { ...bulbL, x: 400 - bulbL.x };

  const armL = happy
    ? "M168 252 C140 244 122 220 118 196"
    : study
      ? "M170 256 C148 244 144 223 151 204"
      : "M170 256 C152 262 144 276 148 292";
  const armR = happy ? "M232 252 C260 244 278 220 282 196" : "M230 256 C248 262 256 276 252 292";
  const handL = happy ? { x: 118, y: 192, r: 9 } : study ? { x: 151, y: 202, r: 8 } : { x: 148, y: 294, r: 8 };
  const handR = { ...handL, x: 400 - handL.x };

  return (
    <div
      className={`lumi lumi-${mood} ${animated ? "lumi-animated" : ""} ${className}`}
      style={{ width: size, height: (size * 440) / 400 }}
    >
      <svg viewBox="0 0 400 440" width="100%" height="100%" role="img" aria-label={title} overflow="visible">
        <defs>
          <radialGradient id={gid("glow")} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#FFD27A" stopOpacity={glowOpacity} />
            <stop offset="1" stopColor="#FFD27A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={gid("belly")} cx="50%" cy="62%" r="62%">
            <stop offset="0" stopColor={abdomen[0]} />
            <stop offset=".45" stopColor={abdomen[1]} />
            <stop offset="1" stopColor={abdomen[2]} />
          </radialGradient>
          <radialGradient id={gid("head")} cx="40%" cy="30%" r="80%">
            <stop offset="0" stopColor={head[0]} />
            <stop offset="1" stopColor={head[1]} />
          </radialGradient>
          <linearGradient id={gid("wing")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#DDE2FF" stopOpacity={wingA} />
            <stop offset="1" stopColor="#9AA8FF" stopOpacity={wingB} />
          </linearGradient>
        </defs>

        {/* lueur */}
        <circle className="lumi-halo" cx="200" cy="320" r={glowR} fill={`url(#${gid("glow")})`} />

        {/* ailes */}
        <g className="lumi-wing-l">
          <path d="M176 236 C96 222 40 164 54 112 C68 66 144 98 184 176 Z" fill={`url(#${gid("wing")})`} stroke="#DDE2FF" strokeOpacity={wingStroke} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M172 226 C120 196 84 160 66 118" stroke="#DDE2FF" strokeOpacity=".35" strokeWidth="2" fill="none" />
          <path d="M178 214 C140 190 110 150 100 120" stroke="#DDE2FF" strokeOpacity=".35" strokeWidth="2" fill="none" />
        </g>
        <g className="lumi-wing-r">
          <path d="M224 236 C304 222 360 164 346 112 C332 66 256 98 216 176 Z" fill={`url(#${gid("wing")})`} stroke="#DDE2FF" strokeOpacity={wingStroke} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M228 226 C280 196 316 160 334 118" stroke="#DDE2FF" strokeOpacity=".35" strokeWidth="2" fill="none" />
          <path d="M222 214 C260 190 290 150 300 120" stroke="#DDE2FF" strokeOpacity=".35" strokeWidth="2" fill="none" />
        </g>

        {/* ventre lumineux */}
        <g className="lumi-belly">
          <path d="M200 244 C148 244 122 296 132 342 C142 388 176 412 200 412 C224 412 258 388 268 342 C278 296 252 244 200 244 Z" fill={`url(#${gid("belly")})`} />
          <path d="M138 318 Q200 338 262 318" stroke={seg} strokeOpacity={segOpacity} strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M133 350 Q200 372 267 350" stroke={seg} strokeOpacity={segOpacity} strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M148 380 Q200 400 252 380" stroke={seg} strokeOpacity={segOpacity} strokeWidth="5" strokeLinecap="round" fill="none" />
          {!tired && <ellipse cx="176" cy="340" rx="9" ry="22" transform="rotate(14 176 340)" fill="#FFFFFF" fillOpacity=".55" />}
        </g>

        {/* torse et bras */}
        <ellipse cx="200" cy="250" rx="42" ry="24" fill={bodyColor} />
        <g className="lumi-arm-l">
          <path d={armL} stroke={armColor} strokeWidth="10" strokeLinecap="round" fill="none" />
          <circle cx={handL.x} cy={handL.y} r={handL.r} fill={armColor} />
        </g>
        <g className="lumi-arm-r">
          <path d={armR} stroke={armColor} strokeWidth="10" strokeLinecap="round" fill="none" />
          <circle cx={handR.x} cy={handR.y} r={handR.r} fill={armColor} />
        </g>

        {/* antennes */}
        <g className="lumi-ant-l">
          <path d={antL} stroke={antennaColor} strokeWidth="7" strokeLinecap="round" fill="none" />
          {!tired && <circle className="lumi-bulb" cx={bulbL.x} cy={bulbL.y} r={bulbL.r * 2} fill="#FFD27A" fillOpacity=".35" />}
          <circle cx={bulbL.x} cy={bulbL.y} r={bulbL.r} fill={bulbColor} />
        </g>
        <g className="lumi-ant-r">
          <path d={antR} stroke={antennaColor} strokeWidth="7" strokeLinecap="round" fill="none" />
          {!tired && <circle className="lumi-bulb" cx={bulbR.x} cy={bulbR.y} r={bulbR.r * 2} fill="#FFD27A" fillOpacity=".35" />}
          <circle cx={bulbR.x} cy={bulbR.y} r={bulbR.r} fill={bulbColor} />
        </g>

        {/* tête */}
        <circle cx="200" cy={headY} r="84" fill={`url(#${gid("head")})`} />
        {!tired && !study && (
          <path d="M130 118 A84 84 0 0 1 176 88" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth="5" strokeLinecap="round" fill="none" />
        )}

        {/* yeux */}
        {happy ? (
          <g>
            <path d="M142 182 Q164 152 186 182" stroke="#171B45" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M214 182 Q236 152 258 182" stroke="#171B45" strokeWidth="8" strokeLinecap="round" fill="none" />
          </g>
        ) : tired ? (
          <g>
            <path d="M144 184 Q164 202 184 184" stroke="#171B45" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="M216 184 Q236 202 256 184" stroke="#171B45" strokeWidth="7" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          <g className="lumi-eyes" transform={`translate(0 ${study ? 4 : 0})`}>
            <g className="lumi-blink">
              <ellipse cx="164" cy="176" rx="17" ry="22" fill="#171B45" />
              <ellipse cx="236" cy="176" rx="17" ry="22" fill="#171B45" />
              <ellipse cx="164" cy="186" rx="11" ry="10" fill="#3A44A0" />
              <ellipse cx="236" cy="186" rx="11" ry="10" fill="#3A44A0" />
              <circle cx="171" cy="167" r="7" fill="#FFFFFF" />
              <circle cx="243" cy="167" r="7" fill="#FFFFFF" />
              <circle cx="158" cy="188" r="3.2" fill="#FFFFFF" />
              <circle cx="230" cy="188" r="3.2" fill="#FFFFFF" />
            </g>
          </g>
        )}

        {/* joues et bouche */}
        <ellipse cx="124" cy={cheekY} rx={happy ? 16 : 15} ry="9" fill="#FF9FB3" fillOpacity={cheekOpacity} />
        <ellipse cx="276" cy={cheekY} rx={happy ? 16 : 15} ry="9" fill="#FF9FB3" fillOpacity={cheekOpacity} />
        {happy && (
          <g>
            <path d="M178 204 Q200 244 222 204 Z" fill="#171B45" />
            <ellipse cx="200" cy="220" rx="10" ry="6" fill="#FF8FA3" />
          </g>
        )}
        {mood === "base" && (
          <g>
            <path d="M184 204 Q200 232 216 204 Z" fill="#171B45" />
            <ellipse cx="200" cy="215" rx="8" ry="4.5" fill="#FF8FA3" />
          </g>
        )}
        {study && <path d="M186 212 Q200 226 214 212" stroke="#171B45" strokeWidth="5" strokeLinecap="round" fill="none" />}
        {tired && <path d="M188 218 Q200 224 212 218" stroke="#171B45" strokeWidth="5" strokeLinecap="round" fill="none" />}

        {/* mortier d'étudiant */}
        {study && (
          <g className="lumi-cap">
            <path d="M160 100 V132 Q200 152 240 132 V100 Z" fill="#242A55" />
            <path d="M114 100 L200 64 L286 100 L200 136 Z" fill="#1A1F3D" stroke="#3A44A0" strokeWidth="3" strokeLinejoin="round" />
            <g className="lumi-tassel">
              <path d="M268 106 L278 150" stroke="#FFD27A" strokeWidth="4" strokeLinecap="round" />
              <circle cx="279" cy="154" r="7" fill="#FFD27A" />
            </g>
          </g>
        )}

        {study && (
          <g className="lumi-study-sparkles" fill="#FFD27A" aria-hidden="true">
            <path d={STAR} transform="translate(75 145) scale(.42)" />
            <path d={STAR} transform="translate(325 220) scale(.32)" />
            <circle cx="308" cy="106" r="3.5" />
          </g>
        )}

        {/* étincelles de joie */}
        {happy && (
          <g>
            <g transform="translate(54 70)"><path className="lumi-star" style={{ animationDelay: "0s" }} d={STAR} fill="#FFD27A" /></g>
            <g transform="translate(350 70) scale(.8)"><path className="lumi-star" style={{ animationDelay: ".5s" }} d={STAR} fill="#FFD27A" /></g>
            <g transform="translate(60 250) scale(.6)"><path className="lumi-star" style={{ animationDelay: "1s" }} d={STAR} fill="#9AA8FF" /></g>
            <g transform="translate(346 250) scale(.6)"><path className="lumi-star" style={{ animationDelay: "1.4s" }} d={STAR} fill="#9AA8FF" /></g>
          </g>
        )}

        {/* ronflements */}
        {tired && (
          <g fontFamily="var(--font-geist-mono), monospace" fontWeight="500" fill="#A3AAD1">
            <text className="lumi-z" x="296" y="150" fontSize="40" style={{ animationDelay: "0s" }}>z</text>
            <text className="lumi-z" x="330" y="112" fontSize="28" style={{ animationDelay: "1.2s" }}>z</text>
          </g>
        )}
      </svg>
    </div>
  );
}
