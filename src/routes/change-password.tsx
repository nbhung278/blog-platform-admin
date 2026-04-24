import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { isPasswordValid } from "@/lib/password-rules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChangePasswordPage() {
	const navigate = useNavigate();
	const user = useAuth((s) => s.user);
	const loadMe = useAuth((s) => s.loadMe);

	const [currentPassword, setCurrent] = useState("");
	const [newPassword, setNew] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const forced = user?.mustChangePassword ?? false;

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		if (newPassword !== confirm) {
			setError("Passwords do not match");
			return;
		}
		if (!isPasswordValid(newPassword)) {
			setError("Password does not meet requirements");
			return;
		}
		setLoading(true);
		try {
			await api.post("/api/auth/change-password", { currentPassword, newPassword });
			await loadMe();
			navigate({ to: "/" });
		} catch (err) {
			const msg =
				(err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
				"Failed to change password";
			setError(msg);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="bg-muted flex min-h-screen items-center justify-center p-6">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="flex items-center gap-2">
						<KeyRound className="h-5 w-5" />
						<CardTitle>Change password</CardTitle>
					</div>
					<CardDescription>
						{forced
							? "You must change your password before continuing."
							: "Update your account password."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="space-y-4" autoComplete="off" onSubmit={onSubmit}>
						<div className="space-y-1.5">
							<Label htmlFor="current">Current password</Label>
							<PasswordInput
								id="current"
								autoComplete="current-password"
								value={currentPassword}
								onChange={(e) => setCurrent(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="new">New password</Label>
							<PasswordInput
								id="new"
								value={newPassword}
								onChange={(e) => setNew(e.target.value)}
								required
							/>
							<PasswordRequirements value={newPassword} />
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="confirm">Confirm new password</Label>
							<PasswordInput
								id="confirm"
								value={confirm}
								onChange={(e) => setConfirm(e.target.value)}
								required
							/>
						</div>

						{error && <p className="text-destructive text-sm">{error}</p>}

						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Saving..." : "Update password"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
