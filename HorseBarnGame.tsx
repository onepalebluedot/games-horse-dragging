import React, { useState, useRef, useEffect } from "react";
import horseImg from "./horse.png";

interface Horse {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  inBarn: boolean;
}

// Horse image file is colocated with this component.
const HORSE_IMG = horseImg;

// If the image can't be found/loaded, fall back to a simple inline SVG “?” so it never shows a broken icon.
const FALLBACK_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="14" fill="#f1f5f9"/>
      <rect x="10" y="10" width="108" height="108" rx="12" fill="#ffffff" stroke="#334155" stroke-width="3"/>
      <text x="64" y="82" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="64" text-anchor="middle" fill="#0f172a">?</text>
    </svg>`
  );

const HORSE_SIZE = 110; // display size in pixels
const HORSE_COUNT = 4;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const getBounds = (rect: DOMRect) => {
  return {
    maxX: Math.max(rect.width - HORSE_SIZE, 0),
    maxY: Math.max(rect.height - HORSE_SIZE, 0),
  };
};

const randomVelocity = () => {
  // Small random step in either direction
  const speed = 0.6 + Math.random() * 0.6; // pixels per tick
  const dir = Math.random() < 0.5 ? -1 : 1;
  return speed * dir;
};

const createInitialHorses = (): Horse[] => {
  const horses: Horse[] = [];
  for (let i = 0; i < HORSE_COUNT; i++) {
    horses.push({
      id: i + 1,
      x: 40 + i * 60,
      y: 260 + (i % 2) * 60,
      vx: randomVelocity(),
      vy: randomVelocity(),
      inBarn: false,
    });
  }
  return horses;
};

const HorseBarnGame: React.FC = () => {
  const [horses, setHorses] = useState<Horse[]>(() => createInitialHorses());
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasWon, setHasWon] = useState(false);

  const areaRef = useRef<HTMLDivElement | null>(null);
  const barnRef = useRef<HTMLDivElement | null>(null);

  // Win state
  useEffect(() => {
    if (horses.length && horses.every((h) => h.inBarn)) {
      setHasWon(true);
    } else {
      setHasWon(false);
    }
  }, [horses]);

  const resetGame = () => {
    setHorses(createInitialHorses());
    setDragId(null);
    setHasWon(false);
  };

  // Simple wandering motion for horses that are not in the barn and not being dragged
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const tickMs = 16; // ~60fps

    const interval = window.setInterval(() => {
      const rect = area.getBoundingClientRect();
      const { maxX, maxY } = getBounds(rect);

      setHorses((prev) =>
        prev.map((h) => {
          if (h.inBarn || h.id === dragId) return h;

          let newX = h.x + h.vx;
          let newY = h.y + h.vy;
          let newVx = h.vx;
          let newVy = h.vy;

          if (newX <= 0 || newX >= maxX) {
            newVx = -newVx;
          }
          if (newY <= 0 || newY >= maxY) {
            newVy = -newVy;
          }

          newX = clamp(newX, 0, maxX);
          newY = clamp(newY, 0, maxY);

          return {
            ...h,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
          };
        })
      );
    }, tickMs);

    return () => window.clearInterval(interval);
  }, [dragId]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const clampHorsesToArea = () => {
      const rect = area.getBoundingClientRect();
      const { maxX, maxY } = getBounds(rect);
      setHorses((prev) =>
        prev.map((h) => ({
          ...h,
          x: clamp(h.x, 0, maxX),
          y: clamp(h.y, 0, maxY),
        }))
      );
    };

    clampHorsesToArea();
    window.addEventListener("resize", clampHorsesToArea);
    return () => window.removeEventListener("resize", clampHorsesToArea);
  }, []);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    id: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const area = areaRef.current;
    if (!area) return;

    const rect = area.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const horse = horses.find((h) => h.id === id);
    if (!horse || horse.inBarn) return;

    setDragId(id);
    setDragOffset({ x: pointerX - horse.x, y: pointerY - horse.y });

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore if unsupported
    }
  };

  const isInsideBarn = (x: number, y: number) => {
    const area = areaRef.current;
    const barn = barnRef.current;
    if (!area || !barn) return false;

    const areaRect = area.getBoundingClientRect();
    const barnRect = barn.getBoundingClientRect();

    const barnLeft = barnRect.left - areaRect.left;
    const barnTop = barnRect.top - areaRect.top;
    const barnRight = barnLeft + barnRect.width;
    const barnBottom = barnTop + barnRect.height;

    const centerX = x + HORSE_SIZE / 2;
    const centerY = y + HORSE_SIZE / 2;

    return (
      centerX > barnLeft &&
      centerX < barnRight &&
      centerY > barnTop &&
      centerY < barnBottom
    );
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragId === null) return;

    const area = areaRef.current;
    if (!area) return;

    const rect = area.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    setHorses((prev) => {
      const { maxX, maxY } = getBounds(rect);

      return prev.map((h) => {
        if (h.id !== dragId || h.inBarn) return h;
        const newX = clamp(pointerX - dragOffset.x, 0, maxX);
        const newY = clamp(pointerY - dragOffset.y, 0, maxY);
        return { ...h, x: newX, y: newY };
      });
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragId === null) return;

    setHorses((prev) =>
      prev.map((h) => {
        if (h.id !== dragId || h.inBarn) return h;
        const inside = isInsideBarn(h.x, h.y);
        if (!inside) return h;

        const barn = barnRef.current;
        const area = areaRef.current;
        if (!barn || !area) {
          return { ...h, inBarn: true };
        }

        const areaRect = area.getBoundingClientRect();
        const barnRect = barn.getBoundingClientRect();

        const barnLeft = barnRect.left - areaRect.left;
        const barnTop = barnRect.top - areaRect.top;

        const padding = 16;
        const snapX = barnLeft + padding + Math.random() * 30;
        const snapY = barnTop + padding + Math.random() * 80;

        return {
          ...h,
          x: snapX,
          y: snapY,
          vx: 0,
          vy: 0,
          inBarn: true,
        };
      })
    );

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore if unsupported
    }

    setDragId(null);
  };

  return (
    <div className="w-full flex justify-center py-4">
      <div
        ref={areaRef}
        className="relative w-full max-w-4xl h-[520px] rounded-xl shadow border border-slate-400 bg-slate-200 touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Ground */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-green-700" />

        {/* Barn: simple 2D shape on the right */}
        <div
          ref={barnRef}
          className="absolute right-6 bottom-40 w-40 h-40 flex flex-col items-center"
        >
          {/* Roof */}
          <div className="w-full flex justify-center">
            <div className="w-0 h-0 border-l-[80px] border-r-[80px] border-b-[40px] border-l-transparent border-r-transparent border-b-red-900" />
          </div>
          {/* Body */}
          <div className="w-full h-full bg-red-800 border-2 border-red-900 flex items-end justify-center pb-2 relative">
            {/* Door */}
            <div className="w-20 h-24 bg-black/80 border border-yellow-100" />
            {/* X braces */}
            <div className="absolute inset-x-6 bottom-8 top-10 pointer-events-none">
              <div className="absolute inset-0 border border-yellow-200/60" />
              <div className="absolute inset-0 rotate-45 border-t border-yellow-200/70" />
              <div className="absolute inset-0 -rotate-45 border-t border-yellow-200/70" />
            </div>
          </div>
        </div>

        {/* Instruction bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded text-xs sm:text-sm font-medium">
          Drag each horse into the barn.
        </div>

        {/* Horses */}
        {horses.map((horse) => (
          <div
            key={horse.id}
            onPointerDown={(e) => handlePointerDown(e, horse.id)}
            className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing"
            style={{
              left: horse.x,
              top: horse.y,
              width: HORSE_SIZE,
              height: HORSE_SIZE,
            }}
          >
            <div className="w-full h-full rounded-md flex items-center justify-center border border-slate-700 bg-slate-100">
              <img
                src={HORSE_IMG}
                alt={`Horse ${horse.id}`}
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false}
                onError={(e) => {
                  // Prevent infinite loop if fallback also fails for some reason
                  const img = e.currentTarget;
                  if (img.src !== FALLBACK_IMG) img.src = FALLBACK_IMG;
                }}
              />
            </div>
            <span className="mt-1 text-[10px] text-slate-800 font-semibold">
              Horse {horse.id}
            </span>
          </div>
        ))}

        {/* Win overlay */}
        {hasWon && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center px-4">
            <div className="bg-white rounded-xl px-6 py-6 shadow max-w-sm w-full">
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                All horses are back in the barn.
              </h2>
              <p className="text-sm text-slate-700 mb-4">
                You did it.
              </p>
              <button
                onClick={resetGame}
                className="mt-1 w-full py-2 rounded bg-slate-900 text-white text-sm font-semibold"
              >
                Play again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HorseBarnGame;
