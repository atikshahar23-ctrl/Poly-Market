import { useState } from "react";

interface StockIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

export function StockIcon({ symbol, size = 20, className }: StockIconProps) {
  const [failed, setFailed] = useState(false);
  const src = `https://eodhd.com/img/logos/US/${encodeURIComponent(symbol)}.png`;

  if (failed) {
    return (
      <div
        className={`rounded-full bg-secondary/60 flex items-center justify-center font-mono font-bold text-[8px] ${className}`}
        style={{ width: size, height: size }}
      >
        {symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={symbol}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

interface StockIconSetProps {
  symbol: string;
  size?: number;
}

export function StockIconSet({ symbol, size = 24 }: StockIconSetProps) {
  const [failed, setFailed] = useState(false);
  const src = `https://eodhd.com/img/logos/US/${encodeURIComponent(symbol)}.png`;

  if (failed) {
    return (
      <div
        className="rounded-full bg-secondary/60 flex items-center justify-center font-mono font-bold text-[8px]"
        style={{ width: size, height: size }}
      >
        {symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={symbol}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
