import Miku, { useEffect, useState } from "Miku";

interface AnimatedBackgroundProps {
	intervalMs?: number;
}

export default function AnimatedBackground({
	intervalMs,
}: AnimatedBackgroundProps) {
	const [ballPosition, setBallPosition] = useState({ x: 20, y: 80 });
	const ms = intervalMs ?? 3500;

	useEffect(() => {
		const ballInterval = setInterval(() => {
			setBallPosition(() => ({
				x: Math.random() * 80 + 10,
				y: Math.random() * 60 + 10,
			}));
		}, ms);

		return () => clearInterval(ballInterval);
	}, [ms]);

	return (
		<div className="absolute inset-0 overflow-hidden">
			<div className="absolute top-20 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
			<div className="absolute top-40 right-20 w-1 h-1 bg-cyan-300 rounded-full animate-ping"></div>
			<div className="absolute bottom-32 left-1/4 w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>

			{/* Animated Ping Pong Ball */}
			<div
				className="absolute w-4 h-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full shadow-lg transition-all duration-4000 ease-in-out"
				style={{
					left: `${ballPosition.x}%`,
					top: `${ballPosition.y}%`,
					transform: "translate(-50%, -50%)",
				}}
			></div>
		</div>
	);
}
