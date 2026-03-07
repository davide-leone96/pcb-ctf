// src/components/features/settings/PresetManageDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { usePresetStore } from '@/store/presetStore';
import type { PresetListItem } from '@/types/preset';
import { Pencil, Trash2, Check, X, Tag } from 'lucide-react';

interface PresetManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadPreset: (id: string) => void;
}

const PresetManageDialog = ({ open, onOpenChange, onLoadPreset }: PresetManageDialogProps) => {
  const presets = usePresetStore(s => s.presets);
  const activePresetId = usePresetStore(s => s.activePresetId);
  const deletePreset = usePresetStore(s => s.deletePreset);
  const renamePreset = usePresetStore(s => s.renamePreset);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-600 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage presets</DialogTitle>
          <DialogDescription className="text-gray-400">
            Edit, rename, or delete saved configurations.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-1 py-2">
          {presets.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-6">
              No saved presets.
            </p>
          ) : (
            presets.map(preset => (
              <PresetRow
                key={preset.id}
                preset={preset}
                isActive={preset.id === activePresetId}
                onEdit={() => { onLoadPreset(preset.id); onOpenChange(false); }}
                onDelete={async () => { await deletePreset(preset.id); }}
                onRename={async (name) => { await renamePreset(preset.id, name); }}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PresetRow = ({
  preset, isActive, onEdit, onDelete, onRename,
}: {
  preset: PresetListItem;
  isActive: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) => {
  const [renamingOpen, setRenamingOpen] = useState(false);
  const [nameValue, setNameValue] = useState(preset.name);

  const handleRename = () => {
    if (nameValue.trim() && nameValue.trim() !== preset.name) {
      onRename(nameValue.trim());
    }
    setRenamingOpen(false);
  };

  const formattedDate = new Date(preset.updatedAt).toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`rounded-lg border transition-colors ${isActive ? 'border-blue-500/30 bg-blue-600/10' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-700/30'}`}>
      {/* Main row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1 min-w-0">
          {renamingOpen ? (
            <div className="flex items-center gap-1">
              <input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenamingOpen(false); }}
                className="flex-1 bg-gray-700 border border-gray-500 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button onClick={handleRename} className="text-green-400 hover:text-green-300 p-0.5">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setRenamingOpen(false)} className="text-gray-400 hover:text-white p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{preset.name}</span>
                {isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/40 text-blue-300 flex-shrink-0">
                    editing
                  </span>
                )}
              </div>
              {preset.description && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{preset.description}</p>
              )}
              <p className="text-[10px] text-gray-600 mt-0.5">Updated: {formattedDate}</p>
            </>
          )}
        </div>

        {!renamingOpen && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => { setRenamingOpen(true); setNameValue(preset.name); }}
              className="text-gray-500 hover:text-gray-300 p-1 transition-colors"
              title="Rename"
            >
              <Tag className="h-3.5 w-3.5" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="text-gray-500 hover:text-red-400 p-1 transition-colors" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-800 border-gray-600 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &quot;{preset.name}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    This action cannot be undone. The saved configuration will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Edit CTA — full width button, always visible, clearly labelled */}
      {!renamingOpen && (
        <div className="px-3 pb-2">
          <Button
            onClick={onEdit}
            size="sm"
            variant="outline"
            className={`w-full text-xs transition-colors ${
              isActive
                ? 'border-blue-500/50 text-blue-300 hover:bg-blue-600/20'
                : 'border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Pencil className="h-3 w-3 mr-1.5" />
            {isActive ? 'Already editing' : 'Load and edit'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PresetManageDialog;
