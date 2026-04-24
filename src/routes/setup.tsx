import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { isPasswordValid } from "@/lib/password-rules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
	const navigate = useNavigate();
	const setup = useAuth((s) => s.setup);
	const loading = useAuth((s) => s.loading);

	const [allowed, setAllowed] = useState<boolean | null>(null);
	const [name, setName] = useState("");
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			try {
				const { data } = await api.get<{ needsSetup: boolean }>("/api/auth/setup-status");
				setAllowed(data.needsSetup);
				if (!data.needsSetup) navigate({ to: "/login" });
			} catch {
				setAllowed(false);
			}
		})();
	}, [navigate]);

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		if (password !== confirm) {
			setError("Passwords do not match");
			return;
		}
		if (!isPasswordValid(password)) {
			setError("Password does not meet requirements");
			return;
		}
		try {
			await setup({ name, username, email, password });
			navigate({ to: "/" });
		} catch (err) {
			const msg =
				(err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
				"Setup failed";
			setError(msg);
		}
	}

	if (allowed === null) {
		return (
			<div className="text-muted-foreground flex min-h-screen items-center justify-center text-sm">
				Loading...
			</div>
		);
	}
	if (!allowed) return null;

	return (
		<div className="bg-muted flex min-h-screen items-center justify-center p-6">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="flex items-center gap-2">
						<ShieldCheck className="h-5 w-5" />
						<CardTitle>Initial setup</CardTitle>
					</div>
					<CardDescription>
						Create the first super admin account. This page is only available once and will be
						locked after setup completes.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="space-y-4" autoComplete="off" onSubmit={onSubmit}>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<Label htmlFor="name">Name</Label>
								<Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="username">Username</Label>
								<Input
									id="username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									pattern="[a-z0-9-]+"
									required
								/>
							</div>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="password">Password</Label>
							<PasswordInput
								id="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
							<PasswordRequirements value={password} />
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="confirm">Confirm password</Label>
							<PasswordInput
								id="confirm"
								value={confirm}
								onChange={(e) => setConfirm(e.target.value)}
								required
							/>
						</div>

						{error && <p className="text-destructive text-sm">{error}</p>}

						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Creating..." : "Create super admin"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
