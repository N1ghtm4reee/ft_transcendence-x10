import Miku from "Miku";
import type { Tab } from "./types";

interface TabNavigationProps {
	activeTab: string;
	onTabChange: (tabId: string) => void;
	tabs: Tab[];
}

export default function TabNavigation({
	activeTab,
	onTabChange,
	tabs,
}: TabNavigationProps) {
	return (
		<div className="flex space-x-2 mb-8 overflow-x-auto">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					onClick={() => onTabChange(tab.id)}
					className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
						activeTab === tab.id
							? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
							: "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50"
					}`}
				>
					<span>{tab.icon}</span>
					<span>{tab.label}</span>
				</button>
			))}
		</div>
	);
}
