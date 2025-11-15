import { useEffect, useRef } from 'preact/hooks';
import Plotly from 'plotly.js-dist';
import type { Collaborator } from '~/utils/types';

const formatHover = (person: Collaborator) => {
  const location = [person.city, person.country].filter(Boolean).join(', ');
  return `${person.name}<br>${person.role ?? ''}<br>${location}<extra></extra>`;
};

interface CollaboratorMapProps {
  people: Collaborator[];
}

const CollaboratorMap = ({ people }: CollaboratorMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) {
      return undefined;
    }

    const points = people.filter(
      (person) => typeof person.lat === 'number' && typeof person.lng === 'number'
    );

    if (!points.length) {
      return undefined;
    }

    const data: Partial<Plotly.PlotData>[] = [
      {
        type: 'scattergeo',
        lat: points.map((person) => person.lat!),
        lon: points.map((person) => person.lng!),
        text: points.map((person) => formatHover(person)),
        mode: 'markers',
        marker: {
          size: 8,
          color: '#4f46e5',
          line: { width: 1, color: '#eef2ff' }
        },
        hovertemplate: '%{text}'
      }
    ];

    const layout: Partial<Plotly.Layout> = {
      geo: {
        projection: { type: 'natural earth' },
        landcolor: '#f8fafc',
        showcountries: true,
        countrycolor: '#cbd5f5'
      },
      margin: { t: 10, r: 0, b: 0, l: 0 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    };

    Plotly.newPlot(target, data, layout, {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d']
    });

    return () => {
      Plotly.purge(target);
    };
  }, [people]);

  return <div ref={containerRef} className="h-[450px] w-full" />;
};

export default CollaboratorMap;
