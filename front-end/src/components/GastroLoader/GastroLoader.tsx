import { useEffect, useState } from "react";
import "./GastroLoader.css";

export interface GastroLoaderProps {
  /** Frases que van rotando debajo de la campana. Pasá [] para ocultar el texto. */
  messages?: string[];
  /** Milisegundos entre frase y frase */
  interval?: number;
  /** Tamaño de la campana en px */
  size?: number;
  /** Si es true, ocupa toda la pantalla con fondo (ideal para carga de página) */
  fullscreen?: boolean;
  className?: string;
}

const DEFAULT_MESSAGES = [
  "Poniendo la mesa…",
  "Calentando la cocina…",
  "Preparando los pedidos…",
  "Casi listo…",
];

export default function GastroLoader({
  messages = DEFAULT_MESSAGES,
  interval = 2200,
  size = 120,
  fullscreen = false,
  className = "",
}: GastroLoaderProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [messages, interval]);

  const text = messages.length > 0 ? messages[index % messages.length] : "";

  return (
    <div
      className={`gl ${fullscreen ? "gl--fullscreen" : ""} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <svg
        className="gl__svg"
        width={size}
        height={size}
        viewBox="0 0 200 200"
        aria-hidden="true"
        focusable="false"
      >
        {/* Fondo */}
        <rect className="gl__card" x="0" y="0" width="200" height="200" rx="48" />

        {/* Vapor */}
        <g className="gl__steam">
          <path className="gl__steam-line gl__steam-line--1" d="M76 62 C70 54 82 48 76 40 C70 32 82 26 76 18" />
          <path className="gl__steam-line gl__steam-line--2" d="M100 56 C94 48 106 42 100 34 C94 26 106 20 100 12" />
          <path className="gl__steam-line gl__steam-line--3" d="M124 62 C118 54 130 48 124 40 C118 32 130 26 124 18" />
        </g>

        {/* Tapa (se levanta) */}
        <g className="gl__lid">
          <circle className="gl__cream" cx="100" cy="84" r="6" />
          <rect className="gl__cream" x="97" y="86" width="6" height="6" />
          <path className="gl__cream" d="M48 140 A52 52 0 0 1 152 140 Z" />
          <path className="gl__shine" d="M62 128 A40 40 0 0 1 82 104" />
        </g>

        {/* Plato */}
        <rect className="gl__cream" x="36" y="145" width="128" height="8" rx="4" />
      </svg>

      {text && (
        <p className="gl__text" key={index}>
          {text}
        </p>
      )}
    </div>
  );
}
