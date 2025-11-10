import Miku, { useState } from "Miku";
import { Link } from "Miku/Router";
import AnimatedBackground from "../../components/AnimatedBackground";

export default function HomePage() {
	const [activeFeature, setActiveFeature] = useState(0);

	const features = [
		{
			title: "Real-time Multiplayer",
			description: "Play against opponents worldwide with zero lag",
			icon: "",
		},
		{
			title: "Tournament Mode",
			description: "Compete in ranked tournaments and climb the leaderboard",
			icon: "",
		},
	];

	return (
		<div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
			<img
				src="./overlay.png"
				className="absolute  right-[-300px] bottom-[-600px] w-fit h-fit object-cover z-0 pointer-events-none"
				style={{ scale: "1.4", filter: "drop-shadow(0 0 10px #0ff)" }}
				alt="Overlay"
			/>
			{/* Animated Background Elements */}
			<AnimatedBackground />

			{/* Header */}
			<header className="relative z-10 px-6 py-8">
				<nav className="flex items-center justify-between max-w-7xl mx-auto">
					<div className="flex items-center space-x-2">
						<div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
							<span className="text-white font-bold text-sm"></span>
						</div>
						<span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
							Miku
						</span>
					</div>

					<div className="hidden md:flex items-center space-x-8">
						<Link
							to="/sign_in"
							className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2 rounded-full font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105"
						>
							Sign Up
						</Link>
					</div>
				</nav>
			</header>
			{/* Hero Section */}
			<main className="relative z-10 px-6">
				<div className="max-w-7xl mx-auto">
					<div className={`text-center py-20 transition-all duration-1000`}>
						<h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
							<span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-600 bg-clip-text text-transparent">
								MIKU PONG
							</span>
							<br />
							<span className="text-white">REVOLUTION</span>
						</h1>

						<p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
							Experience the most realistic ping pong simulation ever created.
							Challenge players worldwide in real-time multiplayer matches.
						</p>

						<div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
							<Link
								to="/sign_in"
								className="bg-gradient-to-r from-cyan-500 to-blue-500 px-12 py-4 rounded-full text-xl font-bold hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-2xl"
							>
								Play Now
							</Link>
						</div>
					</div>

					{/* Features Section */}
					<div className="py-20">
						<h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
							<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
								Game Features
							</span>
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							{features.map((feature, index) => (
								<div
									key={index}
									className={`p-8 rounded-2xl transition-all duration-500 cursor-pointer ${
										activeFeature === index
											? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 transform scale-105"
											: "bg-gray-800/50 border-2 border-gray-700 hover:border-gray-600"
									}`}
									onClick={() => setActiveFeature(index)}
								>
									<div className="text-4xl mb-4">{feature.icon}</div>
									<h3 className="text-2xl font-bold mb-4 text-white">
										{feature.title}
									</h3>
									<p className="text-gray-300 leading-relaxed">
										{feature.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
