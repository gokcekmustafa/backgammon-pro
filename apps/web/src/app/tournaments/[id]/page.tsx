import TournamentDetail from './TournamentDetail';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() { return <TournamentDetail />; }
