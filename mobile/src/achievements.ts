export interface Achievement {
  id: string;
  mark: string;
  name: string;
  desc: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first',    mark: '◆', name: 'First merge',  desc: 'Make your first merge' },
  { id: 'combo',    mark: '◇', name: 'Combo',        desc: 'Trigger a chain of 2' },
  { id: 'cascade',  mark: '◈', name: 'Cascade',      desc: 'Trigger a chain of 4' },
  { id: 'reach128', mark: '◐', name: 'Eighth power', desc: 'Build a 128 tile' },
  { id: 'reach256', mark: '◑', name: 'Heavyweight',  desc: 'Build a 256 tile' },
  { id: 'reach512', mark: '◒', name: 'Half a kilo',  desc: 'Build a 512 tile' },
  { id: 'reach1024',mark: '◓', name: 'Quad K',       desc: 'Build a 1024 tile' },
  { id: 'reach2048',mark: '★', name: 'Stack master', desc: 'Build a 2048 tile' },
  { id: 'veteran',  mark: '●', name: 'Veteran',      desc: 'Play 10 games' },
  { id: 'daily',    mark: '☼', name: 'Daily player', desc: 'Complete a daily run' },
  { id: 'zen',      mark: '∞', name: 'Zen master',   desc: 'Score 5000 in Zen' },
  { id: 'race',     mark: '⚡', name: 'Speed demon',  desc: 'Score 1500 in Race' },
];
