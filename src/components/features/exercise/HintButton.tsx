// src/components/features/exercise/HintButton.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

interface HintButtonProps {
  hintText: string;
}

const HintButton = ({ hintText }: HintButtonProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Lightbulb className="mr-2 h-4 w-4" />
          Hint
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-yellow-400" />
            Suggerimento
          </DialogTitle>
          <DialogDescription className="pt-4 text-base">
            {hintText}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default HintButton;