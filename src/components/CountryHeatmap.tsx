/** @jsxImportSource react */
import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';
import papers from '@data/papers.normalized.json';

type Paper = {
  country?: string;
  corrCountryName?: string;
};

function aggregateByCountry(papers: Paper[]) {
  const counts = new Map<string, number>();

  for (const p of papers) {
    const country = (p.corrCountryName || p.country || '').trim();
    if (!country) continue;

    counts.set(country, (counts.get(country) ?? 0) + 1);
  }

  const locations: string[] = [];
  const z: number[] = [];

  for (const [country, count] of counts.entries()) {
    locations.push(country);
    z.push(count);
  }

  return { locations, z };
}

const CountryHeatmap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const { locations, z } = aggregateByCountry(papers as Paper[]);

    if (!containerRef.current || locations.length === 0) return;

    const data = [
      {
        type: 'choropleth',
        locationmode: 'country names',
        locations,
        z,
        colorbar: {
          title: 'Papers',
          orientation: 'h',
          x: 0.5,
          xanchor: 'center',
          y: -0.25,
          len: 0.7,
          thickness: 16
        }
      } as Partial<Plotly.PlotData>
    ];

    const layout: Partial<Plotly.Layout> = {
      title: 'Survivorship Research by Country',
      geo: {
        projection: { type: 'natural earth' }
      },
      margin: { t: 40, r: 0, b: 80, l: 0 }
    };

    Plotly.newPlot(containerRef.current, data, layout, { responsive: true });

    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '500px' }} />;
};

export default CountryHeatmap;
