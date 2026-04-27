import { flexRender, type ColumnDef, type Table as TanstackTable } from "@tanstack/react-table";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableProps<TData, TValue> {
	table: TanstackTable<TData>;
	columns: ColumnDef<TData, TValue>[];
	loading?: boolean;
	emptyText?: string;
}

export function DataTable<TData, TValue>({
	table,
	columns,
	loading,
	emptyText = "No results.",
}: DataTableProps<TData, TValue>) {
	return (
		<div className="space-y-4">
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
									>
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={columns.length} className="text-muted-foreground text-center">
									Loading...
								</TableCell>
							</TableRow>
						) : table.getRowModel().rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={columns.length} className="text-muted-foreground text-center">
									{emptyText}
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
			<DataTablePagination table={table} />
		</div>
	);
}

const PAGE_SIZE_OPTIONS = [5, 10, 50, 100];

function DataTablePagination<TData>({ table }: { table: TanstackTable<TData> }) {
	const { pageIndex, pageSize } = table.getState().pagination;
	const pageCount = table.getPageCount();
	const total = table.getRowCount();

	return (
		<div className="flex items-center justify-between px-1">
			<div className="text-muted-foreground flex items-center gap-3 text-sm">
				{table.getFilteredSelectedRowModel().rows.length > 0 && (
					<span>
						{table.getFilteredSelectedRowModel().rows.length} of {total} selected
					</span>
				)}
				{table.getFilteredSelectedRowModel().rows.length === 0 && (
					<span>
						{total} row{total !== 1 ? "s" : ""}
					</span>
				)}
				<div className="flex items-center gap-1.5">
					<span>Rows per page</span>
					<Select
						value={String(pageSize)}
						onValueChange={(val) => {
							table.setPageSize(Number(val));
						}}
					>
						<SelectTrigger className="h-8 w-[80px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PAGE_SIZE_OPTIONS.map((n) => (
								<SelectItem key={n} value={String(n)}>
									{n}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-sm">
					Page {pageIndex + 1} of {pageCount}
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					<ChevronLeft className="h-4 w-4" />
					Prev
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					Next
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
