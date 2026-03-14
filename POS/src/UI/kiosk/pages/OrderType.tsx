import { useNavigate } from "react-router-dom";

export default function OrderType() {
  const navigate = useNavigate();

  function choose(type: "dine-in" | "takeaway") {
    navigate("/kiosk/menu", { state: { orderType: type } });
  }

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center gap-10 select-none"
      style={{ backgroundColor: "#F1F1EC" }}
    >
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-full border-2 border-gray-900 text-gray-900 font-bold text-sm hover:bg-gray-200 transition-colors"
      >
        ← Back
      </button>
      <h1
        className="text-6xl mb-4"
        style={{ fontFamily: "'Pacifico', cursive", color: "#1C1C1C" }}
      >
        Delicious
      </h1>

      <p className="text-3xl font-extrabold text-gray-800">How would you like your order?</p>

      <div className="flex gap-8 mt-4">
        {/* Dine In */}
        <button
          onClick={() => choose("dine-in")}
          className="flex flex-col items-center gap-5 w-64 h-64 rounded-3xl bg-white shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 justify-center border-2 border-transparent hover:border-[#B5E533]"
        >
          <span className="text-6xl">🍽️</span>
          <span className="text-2xl font-extrabold text-gray-800">Dine In</span>
          <span className="text-sm text-gray-400">Eat at the restaurant</span>
        </button>

        {/* Take Away */}
        <button
          onClick={() => choose("takeaway")}
          className="flex flex-col items-center gap-5 w-64 h-64 rounded-3xl bg-white shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 justify-center border-2 border-transparent hover:border-[#B5E533]"
        >
          <span className="text-6xl">🥡</span>
          <span className="text-2xl font-extrabold text-gray-800">Take Away</span>
          <span className="text-sm text-gray-400">Pack it to go</span>
        </button>
      </div>
    </div>
  );
}
