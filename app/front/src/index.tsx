import Miku, { useEffect, workLoop } from "Miku";
import { Router, redirect } from "Miku/Router";
import DashboardPage from "./pages/dashboard/index.tsx";
import GamePage from "./pages/game/index.tsx";
import HomePage from "./pages/home/index.tsx";
import { NotificationContainer } from "./pages/notification.tsx";
import UserHomePage from "./pages/profile/index.tsx";
import SignInPage from "./pages/sign_in/index.tsx";
import { getAllConversations } from "./services/api/chat";
import { API_URL } from "./services/api/config";
import { stateManager } from "./store/StateManager.ts";

const aa = document.body.querySelector("#app");
const ProtectedRoutes = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
	if (!isLoggedIn) return null;
	return (
		<>
			<Router path="/dashboard" Component={DashboardPage} />
			<Router path="/app_home" Component={UserHomePage} />
			<Router
				path="/profile/:userid"
				Component={UserHomePage}
				isLoggedIn={isLoggedIn}
			/>
			<Router path="/game/:gameId" Component={GamePage} />
			<Router
				path="/profile/"
				Component={UserHomePage}
				isLoggedIn={isLoggedIn}
			/>
		</>
	);
};
const Routing = () => {
	const [isLoggedIn, setIsLoggedIn] = Miku.useState(false);
	const [userDataLoaded, setUserDataLoaded] = Miku.useState(false);

	useEffect(() => {
		const res = fetch(API_URL + "/api/auth/verify", {
			credentials: "include",
		});
		res.then((response) => {
			if (response.status === 200) {
				setIsLoggedIn(true);
				if (
					!["dashboard", "game", "profile"].includes(
						window.location.pathname.split("/")[1],
					)
				) {
					redirect("/dashboard");
				}
			} else {
				setIsLoggedIn(false);
				if (
					!["sign_in", "sign_up", ""].includes(
						window.location.pathname.split("/")[1],
					)
				) {
					redirect("/sign_in");
				}
			}
		}).catch((error) => {
			console.error("Error verifying authentication:", error);
			setIsLoggedIn(false);
			if (
				!["sign_in", "sign_up", ""].includes(
					window.location.pathname.split("/")[1],
				)
			) {
				redirect("/sign_in");
			}
		});
	}, [isLoggedIn, window.location.href]);

	useEffect(() => {
		if (isLoggedIn && !userDataLoaded) {
			const loadUserData = async () => {
				try {
					const [userResponse, achievementsResponse, onlineCountResponse] =
						await Promise.all([
							fetch(API_URL + "/api/user-management/me", {
								credentials: "include",
							}),
							fetch(API_URL + "/api/user-management/allachievements", {
								credentials: "include",
							}),
							fetch(`${API_URL}/api/notifications/users/online`, {
								credentials: "include",
							}),
						]);

					if (
						userResponse.status === 200 &&
						achievementsResponse.status === 200 &&
						onlineCountResponse.status === 200
					) {
						const userData = await userResponse.json();
						const achievementsData = await achievementsResponse.json();
						const onlineCountData = await onlineCountResponse.json();

						await stateManager.initializeFromUser(
							userData,
							achievementsData.achievements || [],
							onlineCountData.totalOnline + 1,
						);

						await getAllConversations();

						stateManager.setState("auth", { setIsLoggedIn, setUserDataLoaded });
						setUserDataLoaded(true);
					}
				} catch (error) {
					console.error("Failed to load user data:", error);
				}
			};

			loadUserData();
		}
	}, [isLoggedIn, userDataLoaded]);
	return (
		<div>
			{!isLoggedIn ? (
				<>
					<Router path="/" Component={HomePage} />
					<Router
						path="/sign_in"
						setIsLoggedIn={setIsLoggedIn}
						Component={SignInPage}
					/>
				</>
			) : (
				<ProtectedRoutes isLoggedIn={isLoggedIn} />
			)}
			<NotificationContainer></NotificationContainer>
		</div>
	);
};

if (aa) Miku.render(<Routing />, aa);

requestIdleCallback(workLoop);
