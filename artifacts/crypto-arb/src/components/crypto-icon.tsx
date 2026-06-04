import { useState } from "react";

interface CryptoIconProps {
  asset: string;
  size?: number;
  className?: string;
}

export function CryptoIcon({ asset, size = 20, className }: CryptoIconProps) {
  const [failed, setFailed] = useState(false);
  const src = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${asset.toLowerCase()}.png`;

  if (failed) {
    return (
      <div
        className={`rounded-full bg-secondary/60 flex items-center justify-center font-mono font-bold text-[8px] ${className}`}
        style={{ width: size, height: size }}
      >
        {asset.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={asset}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

interface CryptoIconSetProps {
  asset: string;
  size?: number;
}

export function CryptoIconSet({ asset, size = 24 }: CryptoIconSetProps) {
  const [failed, setFailed] = useState(false);
  const src = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${asset.toLowerCase()}.png`;

  if (failed) {
    return (
      <div
        className="rounded-full bg-secondary/60 flex items-center justify-center font-mono font-bold text-[8px]"
        style={{ width: size, height: size }}
      >
        {asset.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={asset}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
