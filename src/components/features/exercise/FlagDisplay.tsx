// src/components/features/exercise/FlagDisplay.tsx

interface FlagDisplayProps {
  flag: string;
}

const FlagDisplay = ({ flag }: FlagDisplayProps) => {
  return (
    <div className="flex items-center rounded-lg bg-black p-4 font-mono text-sm text-green-400 h-full">
      <p className="break-all">
        <span className="text-gray-500">{'> '}</span>
        {flag}
      </p>
    </div>
  );
};

export default FlagDisplay;
