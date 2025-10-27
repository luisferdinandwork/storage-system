// components/items/bulk-revert-dialog.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Undo, AlertTriangle } from "lucide-react"

interface BulkRevertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItemsCount: number
  onConfirm: () => void
  isReverting: boolean
}

export function BulkRevertDialog({
  open,
  onOpenChange,
  selectedItemsCount,
  onConfirm,
  isReverting
}: BulkRevertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Revert Items from Clearance
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to revert {selectedItemsCount} item{selectedItemsCount !== 1 ? 's' : ''} from clearance? 
            This will move the items back to storage.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isReverting}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isReverting}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isReverting ? (
              <>
                <Undo className="mr-2 h-4 w-4 animate-spin" />
                Reverting...
              </>
            ) : (
              <>
                <Undo className="mr-2 h-4 w-4" />
                Revert {selectedItemsCount} Item{selectedItemsCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}