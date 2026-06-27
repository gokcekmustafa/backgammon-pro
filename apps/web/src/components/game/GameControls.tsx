import Button from '../Button';

export default function GameControls() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" className="text-xs">
        Roll Dice
      </Button>
      <Button variant="secondary" disabled className="text-xs">
        Undo
      </Button>
      <Button variant="ghost" className="text-xs">
        Resign
      </Button>
    </div>
  );
}
