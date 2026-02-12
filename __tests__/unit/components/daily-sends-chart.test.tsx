import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailySendsChart } from '@/components/dashboard/daily-sends-chart';

const makeZeroData = (start = 11, end = 20) => {
  const arr = [] as { date: string; count: number }[];
  for (let d = start; d <= end; d++) {
    // use a simple ISO-ish string so component formatting is stable
    const day = `2026-01-${String(d).padStart(2, '0')}`;
    arr.push({ date: day, count: 0 });
  }
  return arr;
};

describe('DailySendsChart — empty-state UX', () => {
  it('renders subtle empty-state caption and shows total 0', () => {
    const data = makeZeroData(11, 20);

    render(
      <DailySendsChart
        data={data}
        startDate={data[0].date}
        endDate={data[data.length - 1].date}
      />
    );

    // caption should be present
    expect(screen.getByText(/No sends in selected range/i)).toBeInTheDocument();

    // total should display 0
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
