import cashierImg from "@assets/cashier-assist.jpg";

export function Watermark() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
      <img
        src={cashierImg}
        alt=""
        draggable={false}
        className="select-none"
        style={{
          width: "clamp(180px, 35%, 320px)",
          opacity: 0.6,
          filter: "grayscale(30%)",
          transform: "rotate(-10deg)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </div>
  );
}
