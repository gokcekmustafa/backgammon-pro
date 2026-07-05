import PlayerProfile from './PlayerProfile';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() { return <PlayerProfile />; }

