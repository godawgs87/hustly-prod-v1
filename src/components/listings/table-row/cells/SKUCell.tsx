import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SKUCellProps {
  sku: string | null;
}

const SKUCell = ({ sku }: SKUCellProps) => {
  const { toast } = useToast();

  const handleCopySKU = () => {
    if (sku) {
      navigator.clipboard.writeText(sku);
      toast({
        description: "SKU copied to clipboard"
      });
    }
  };

  if (!sku) {
    return (
      <TableCell>
        <Badge variant="outline" className="text-xs">
          No SKU
        </Badge>
      </TableCell>
    );
  }

  return (
    <TableCell>
      <div className="flex items-center gap-1">
        <code className="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded">
          {sku}
        </code>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopySKU}
          className="h-6 w-6 p-0"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    </TableCell>
  );
};

export default SKUCell;