'use client';

import { useMemo } from 'react';
import { renderBoard } from '@backgammon/board-renderer';

export default function BoardArea() {
  const svg = useMemo(() => {
    const result = renderBoard(600);
    return result.svg
      .replace(/ width="[^"]*"/, '')
      .replace(/ height="[^"]*"/, '')
      .replace('<svg', '<svg style="width:100%;height:auto;display:block"');
  }, []);

  return (
    <div className="flex items-center justify-center">
      <div className="w-full" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
