import Miku, { useEffect, useRef, useState } from "Miku";
import { redirect } from "Miku/Router";
import AnimatedBackground from "../../components/AnimatedBackground";
import { API_URL } from "../../services/api/config";

export default function AuthPage({ setIsLoggedIn }: any) {
	const [isVisible, setIsVisible] = useState(false);
	const [isSignUp, setIsSignUp] = useState(false);
	const [formData, setFormData] = useState({
		email: "",
		password: "",
		confirmPassword: "",
		name: "",
	});
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState({
		email: "",
		password: "",
		confirmPassword: "",
		name: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [oauthLoading, setOauthLoading] = useState({
		google: false,
	});

	useEffect(() => {
		setIsVisible(true);

		const handleMessage = (event: MessageEvent) => {
			if (event.origin !== window.location.origin && event.origin !== API_URL) {
				console.log("Message rejected due to origin mismatch");
				return;
			}

			console.log("Processing message:", event.data);

			switch (event.data.type) {
				case "GOOGLE_AUTH_SUCCESS":
					console.log("Google auth success received");
					setOauthLoading((prev) => ({ ...prev, google: false }));
					setToast({ message: "Google sign-in successful!", type: "success" });
					setTimeout(() => {
						setIsLoggedIn(true);
						redirect("/dashboard");
					}, 1000);
					break;

				case "GOOGLE_AUTH_2FA_REQUIRED":
					console.log("Google auth 2FA required");
					setOauthLoading((prev) => ({ ...prev, google: false }));
					setToast({ message: "2FA verification required", type: "info" });
					break;

				case "GOOGLE_AUTH_ERROR":
					console.log("Google auth error received");
					setOauthLoading((prev) => ({ ...prev, google: false }));
					setToast({
						message: event.data.error || "Google sign-in failed",
						type: "error",
					});
					break;

				default:
					console.log("Unknown message type:", event.data.type);
					break;
			}
		};

		window.addEventListener("message", handleMessage);

		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	const handleInputChange = (e: { target: { name: any; value: any } }) => {
		const { name, value } = e.target as {
			name: keyof typeof formData;
			value: string;
		};
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));

		if (errors[name]) {
			setErrors((prev) => ({
				...prev,
				[name]: "",
			}));
		}
	};

	const [toast, setToast] = useState({ message: "", type: "" });
	const toastTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		if (toast.message) {
			if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
			toastTimeoutRef.current = setTimeout(
				() => setToast({ message: "", type: "" }),
				3000,
			);
		}
	}, [toast]);

	const validateForm = () => {
		const newErrors = {
			email: "",
			password: "",
			confirmPassword: "",
			name: "",
		};

		if (!formData.email) {
			newErrors.email = "Email is required";
		} else if (!/\S+@\S+\.\S+/.test(formData.email)) {
			newErrors.email = "Please enter a valid email";
		}

		if (!formData.password) {
			newErrors.password = "Password is required";
		} else if (formData.password.length < 6) {
			newErrors.password = "Password must be at least 6 characters";
		}

		if (isSignUp) {
			if (!formData.name) {
				newErrors.name = "Name is required";
			}

			if (!formData.confirmPassword) {
				newErrors.confirmPassword = "Please confirm your password";
			} else if (formData.password !== formData.confirmPassword) {
				newErrors.confirmPassword = "Passwords don't match";
			}
		}

		setErrors(newErrors);
		return (
			!newErrors.email &&
			!newErrors.password &&
			(!isSignUp || (!newErrors.confirmPassword && !newErrors.name))
		);
	};

	const handleSubmit = async () => {
		if (!validateForm()) return;
		setIsLoading(true);

		try {
			const url = isSignUp
				? API_URL + "/api/auth/signup"
				: API_URL + "/api/auth/login";
			const payload = isSignUp
				? {
						email: formData.email,
						password: formData.password,
						name: formData.name,
					}
				: {
						email: formData.email,
						password: formData.password,
					};

			const res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				setToast({
					message: isSignUp ? "Sign up successful" : "Login successful",
					type: "success",
				});
				setTimeout(() => {
					setIsLoggedIn(true);
					redirect("/dashboard");
				}, 1000);
			} else {
				const errorData = await res.json();
				setToast({
					message: errorData.message || "Authentication failed",
					type: "error",
				});
			}
		} catch (_err) {
			setToast({ message: "Network error", type: "error" });
		}

		setTimeout(() => {
			setIsLoading(false);
		}, 1000);
	};

	const handleGoogleLogin = () => {
		setOauthLoading((prev) => ({ ...prev, google: true }));

		console.log("Opening Google OAuth popup...");

		const popup = window.open(
			API_URL + "/api/auth/google",
			"google-oauth",
			"width=500,height=600,scrollbars=yes,resizable=yes",
		);

		if (!popup) {
			console.log("Popup was blocked");
			setOauthLoading((prev) => ({ ...prev, google: false }));
			setToast({
				message: "Popup blocked. Please allow popups for this site.",
				type: "error",
			});
			return;
		}

		console.log("Popup opened successfully");
	};

	const toggleAuthMode = () => {
	       setIsSignUp(!isSignUp);
	       setFormData((prev) => ({
		       email: prev.email,
		       password: prev.password,
		       confirmPassword: "",
		       name: "",
	       }));
	       setErrors({
		       email: "",
		       password: "",
		       confirmPassword: "",
		       name: "",
	       });
	};

	const formFields = [];

	formFields.push(
		<div key="name-field" style={{ display: isSignUp ? "block" : "none" }}>
			<label
				htmlFor="name"
				className="block text-sm font-medium text-gray-300 mb-2"
			>
				Full Name
			</label>
			<input
				type="text"
				id="name"
				name="name"
				value={formData.name}
				onChange={handleInputChange}
				className={`w-full px-4 py-3 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
					errors.name
						? "border-red-500 focus:ring-red-500"
						: "border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
				}`}
				placeholder="Enter your full name"
			/>
			{errors.name && (
				<p className="text-red-400 text-sm mt-1">{errors.name}</p>
			)}
		</div>,
	);

	formFields.push(
		<div key="email-field">
			<label
				htmlFor="email"
				className="block text-sm font-medium text-gray-300 mb-2"
			>
				Email Address
			</label>
			<input
				type="email"
				id="email"
				name="email"
				value={formData.email}
				onChange={handleInputChange}
				className={`w-full px-4 py-3 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
					errors.email
						? "border-red-500 focus:ring-red-500"
						: "border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
				}`}
				placeholder="Enter your email"
			/>
			{errors.email && (
				<p className="text-red-400 text-sm mt-1">{errors.email}</p>
			)}
		</div>,
	);

	formFields.push(
		<div key="password-field">
			<label
				htmlFor="password"
				className="block text-sm font-medium text-gray-300 mb-2"
			>
				Password
			</label>
			<div className="relative">
				<input
					type={showPassword ? "text" : "password"}
					id="password"
					name="password"
					value={formData.password}
					onChange={handleInputChange}
					className={`w-full px-4 py-3 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all pr-12 ${
						errors.password
							? "border-red-500 focus:ring-red-500"
							: "border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
					}`}
					placeholder="Enter your password"
				/>
				<button
					key="password-toggle"
					type="button"
					onClick={() => setShowPassword(!showPassword)}
					className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
				>
					{showPassword ? "Hide" : "Show"}
				</button>
			</div>
			{errors.password && (
				<p className="text-red-400 text-sm mt-1">{errors.password}</p>
			)}
		</div>,
	);

	formFields.push(
		<div
			key="confirm-password-field"
			style={{ display: isSignUp ? "block" : "none" }}
		>
			<label
				htmlFor="confirmPassword"
				className="block text-sm font-medium text-gray-300 mb-2"
			>
				Confirm Password
			</label>
			<div className="relative">
				<input
					type={showConfirmPassword ? "text" : "password"}
					id="confirmPassword"
					name="confirmPassword"
					value={formData.confirmPassword}
					onChange={handleInputChange}
					className={`w-full px-4 py-3 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all pr-12 ${
						errors.confirmPassword
							? "border-red-500 focus:ring-red-500"
							: "border-gray-600 focus:ring-cyan-500 focus:border-cyan-500"
					}`}
					placeholder="Confirm your password"
				/>
				<button
					key="confirm-password-toggle"
					type="button"
					onClick={() => setShowConfirmPassword(!showConfirmPassword)}
					className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
				>
					{showConfirmPassword ? "Hide" : "Show"}
				</button>
			</div>
			{errors.confirmPassword && (
				<p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
			)}
		</div>,
	);

	return (
		<div
			key="auth-page"
			className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden"
		>
			<AnimatedBackground intervalMs={4500} />

			<header key="header" className="relative z-10 px-6 py-8">
				<nav
					key="nav"
					className="flex items-center justify-between max-w-7xl mx-auto"
				>
					<div key="logo" className="flex items-center space-x-2">
						<div
							key="logo-icon"
							className="w-8 h-8 bg-gradient-to-r rounded-full flex items-center justify-center"
						>
							<img src="./miku-icon.png" className="scale-[1.2]"></img>
						</div>
						<span
							key="logo-text"
							className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
						>
							Miku
						</span>
					</div>

					<div key="nav-actions" className="flex items-center space-x-4">
						<span key="nav-text" className="text-gray-300">
							{isSignUp ? "Already have an account?" : "New here?"}
						</span>
						<button
							key="nav-toggle"
							onClick={toggleAuthMode}
							className="border-2 border-cyan-500 text-cyan-400 px-6 py-2 rounded-full font-semibold hover:bg-cyan-500 hover:text-white transition-all"
						>
							{isSignUp ? "Sign In" : "Sign Up"}
						</button>
					</div>
				</nav>
			</header>

			<main
				key="main"
				className="relative z-10 px-6 flex items-center justify-center min-h-[calc(100vh-200px)]"
			>
				<div key="main-container" className="max-w-md w-full">
					<div
						key="animated-wrapper"
						className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
					>
						<div
							key="auth-card"
							className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-3xl p-8 shadow-2xl"
						>
							<div key="card-header" className="text-center mb-8">
								<h1 key="card-title" className="text-4xl font-bold mb-2">
									<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
										{isSignUp ? "Join the Game" : "Welcome Back"}
									</span>
								</h1>
								<p key="card-subtitle" className="text-gray-300">
									{isSignUp
										? "Create your account and start playing!"
										: "Ready to dominate the table?"}
								</p>
							</div>

							<div key="social-buttons" className="space-y-3 mb-6">
								<button
									key="google-btn"
									onClick={handleGoogleLogin}
									disabled={oauthLoading.google}
									className="w-full bg-white text-gray-900 py-3 px-4 rounded-xl font-semibold hover:bg-gray-100 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{oauthLoading.google ? (
										<>
											<div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
											<span>Connecting...</span>
										</>
									) : (
										<>
											<span>🔍</span>
											<span>Continue with Google</span>
										</>
									)}
								</button>
							</div>

							<div key="divider" className="flex items-center my-6">
								<div
									key="divider-left"
									className="flex-1 border-t border-gray-600"
								></div>
								<span key="divider-text" className="px-4 text-gray-400 text-sm">
									or
								</span>
								<div
									key="divider-right"
									className="flex-1 border-t border-gray-600"
								></div>
							</div>

							<div key="auth-form" className="space-y-6">
								{formFields}

								<button
									key="submit-btn"
									type="button"
									onClick={handleSubmit}
									disabled={isLoading}
									className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-3 px-4 rounded-xl font-bold text-white hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
								>
									{isLoading ? (
										<div
											key="loading-content"
											className="flex items-center justify-center space-x-2"
										>
											<div
												key="spinner"
												className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
											></div>
											<span key="loading-text">
												{isSignUp ? "Creating Account..." : "Signing In..."}
											</span>
										</div>
									) : isSignUp ? (
										"Create Account"
									) : (
										"Sign In"
									)}
								</button>
							</div>

							<div key="card-footer" className="text-center mt-6">
								<p key="footer-text" className="text-gray-400 text-sm">
									{isSignUp
										? "Already have an account? "
										: "Don't have an account? "}
									<button
										key="footer-toggle"
										onClick={toggleAuthMode}
										className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
									>
										{isSignUp ? "Sign in here" : "Sign up for free"}
									</button>
								</p>
							</div>
						</div>
					</div>
				</div>
			</main>
			{toast.message && (
				<div
					className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 transition-all ${
						toast.type === "success"
							? "bg-green-600 text-white"
							: toast.type === "info"
								? "bg-blue-600 text-white"
								: "bg-red-600 text-white"
					}`}
				>
					{toast.message}
				</div>
			)}
		</div>
	);
}
