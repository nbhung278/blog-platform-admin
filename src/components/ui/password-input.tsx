import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

function PasswordInput({
	className,
	autoComplete = "new-password",
	...props
}: Omit<React.ComponentProps<"input">, "type">) {
	const [visible, setVisible] = React.useState(false);

	return (
		<div className="relative">
			<Input
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
				className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 focus-visible:border-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 transition-colors outline-none focus-visible:ring-[3px]"
			>
				{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
			</button>
		</div>
	);
}

export { PasswordInput };
