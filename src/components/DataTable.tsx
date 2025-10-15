import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
}

const DataTable = ({ columns, data, onRowClick }: DataTableProps) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const modifier = sortDirection === "asc" ? 1 : -1;
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * modifier;
    }
    return String(aVal).localeCompare(String(bVal)) * modifier;
  });

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>
                {column.sortable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => handleSort(column.key)}
                  >
                    {column.label}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow
              key={index}
              className={onRowClick ? "cursor-pointer" : ""}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;
