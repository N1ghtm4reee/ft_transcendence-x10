import Miku from "Miku";

interface NavigationProps {
	activeSection: string;
	setActiveSection: (section: string) => void;
}

export default function Navigation({
	activeSection,
	setActiveSection,
}: NavigationProps) {
	const sections = [
		{ id: "overview", label: "Overview", icon: "" },
		{ id: "tournaments", label: "Tournaments", icon: "" },
		{ id: "chats", label: "Messages", icon: "" },
		{ id: "friends", label: "Friends", icon: "" },
		{ id: "profile", label: "Profile", icon: "" },
	];

	return (
		<nav className="relative z-10 px-6 py-4 border-b border-gray-700/50">
			<div className="max-w-7xl mx-auto">
				<div className="flex space-x-8">
					{sections.map((section) => (
						<button
							type="button"
							key={section.id}
							onClick={() => setActiveSection(section.id)}
							className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all ${
								activeSection === section.id
									? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
									: "text-gray-400 hover:text-white hover:bg-gray-800/50"
							}`}
						>
							<span>{section.icon}</span>
							<span>{section.label}</span>
						</button>
					))}
				</div>
			</div>
		</nav>
	);
}
