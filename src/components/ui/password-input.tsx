import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export const PasswordInput = React.forwardRef<
	HTMLInputElement,
	Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, autoComplete = "new-password", ...props }, ref) => {
	const [visible, setVisible] = React.useState(false);

	return (
		<div className="relative">
			<Input
				ref={ref}
				type={visible ? "text" : "password"}
				autoComplete={autoComplete}
				data-1p-ignore
				data-lpignore="true"
				data-form-type="other"
				className={cn("pr-9", className)}
				{...props}
			/>
			<button
				type="button"
				tabIndex={-1}
				onClick={() => setVisible((v) => !v)}
				aria-label={visible ? "Hide password" : "Show password"}
				className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 transition-colors focus-visible:ring-1 focus-visible:outline-none"
			>
				{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
			</button>
		</div>
	);
});
PasswordInput.displayName = "PasswordInput";
