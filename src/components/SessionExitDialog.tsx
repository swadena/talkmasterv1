import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface SessionExitDialogProps {
  open: boolean;
  onContinue: () => void;
  onExit: () => void;
}

const SessionExitDialog = ({ open, onContinue, onExit }: SessionExitDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onContinue()}>
      <AlertDialogContent className="max-w-[320px] rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Leave session?</AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">
            This session already used 1 credit. If you leave now, you won't see your results. Are you sure?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onContinue}
            className="w-full rounded-2xl"
          >
            Continue session
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={onExit}
            className="w-full rounded-2xl border-0 bg-surface text-muted-foreground"
          >
            Exit anyway
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SessionExitDialog;
