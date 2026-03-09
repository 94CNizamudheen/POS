export default function DisconnectedWatermark() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Repeating diagonal "KIOSK DISCONNECTED" text — pure background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent 0px,
            transparent 60px,
            rgba(239,68,68,0.06) 60px,
            rgba(239,68,68,0.06) 61px
          )`,
        }}
      />
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="watermark-pattern"
            x="0"
            y="0"
            width="260"
            height="120"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-30)"
          >
            <text
              x="10"
              y="50"
              fontSize="13"
              fontWeight="700"
              letterSpacing="3"
              fill="rgba(239,68,68,0.12)"
              fontFamily="system-ui, sans-serif"
            >
              KIOSK DISCONNECTED
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#watermark-pattern)" />
      </svg>
    </div>
  );
}
