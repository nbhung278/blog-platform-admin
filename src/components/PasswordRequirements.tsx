import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSWORD_RULES } from "@/lib/password-rules";

export function PasswordRequirements({ value, className }: { value: string; className?: string }) {
	return (
		<ul className={cn("mt-1 space-y-0.5 text-xs", className)}>
			{PASSWORD_RULES.map((r) => {
				const ok = r.test(value);
				return (
					<li
						key={r.label}
						className={cn(
							"flex items-center gap-1.5",
							ok ? "text-green-600" : "text-muted-foreground",
						)}
					>
						{ok ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
						{r.label}
					</li>
				);
			})}
		</ul>
	);
}
