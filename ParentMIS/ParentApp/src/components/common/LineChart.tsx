import React from 'react';

interface LineChartProps {
  values: number[];
  labels: string[];
  classAverage?: number[];
  min?: number;
  max?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  values,
  labels,
  classAverage,
  min = 50,
  max = 100,
}) => {
  const W = 300;
  const H = 110;
  const P = 24;

  const X = (i: number) => P + (i * (W - 2 * P)) / (values.length - 1 || 1);
  const Y = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P);

  const pts = values.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
  const clsPts = classAverage
    ? classAverage.map((v, i) => `${X(i)},${Y(v)}`).join(' ')
    : '';

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H + 20}`} width="100%" className="overflow-visible">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5A623" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Shaded Area */}
        <polygon
          points={`${X(0)},${H - P} ${pts} ${X(values.length - 1)},${H - P}`}
          fill="url(#chartGrad)"
        />

        {/* Class Average Comparison (Dashed) */}
        {clsPts && (
          <polyline
            points={clsPts}
            fill="none"
            stroke="#9FB0D3"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        )}

        {/* Student Line */}
        <polyline
          points={pts}
          fill="none"
          stroke="#13213D"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />

        {/* Dots & Value Labels */}
        {values.map((v, i) => {
          const isLatest = i === values.length - 1;
          return (
            <g key={i}>
              <circle
                cx={X(i)}
                cy={Y(v)}
                r={isLatest ? 5.5 : 3.5}
                fill={isLatest ? '#F5A623' : '#13213D'}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <text
                x={X(i)}
                y={Y(v) - 9}
                fontSize="10"
                fontWeight="800"
                fill="#13213D"
                textAnchor="middle"
                fontFamily="Montserrat"
              >
                {v.toFixed(1)}%
              </text>
            </g>
          );
        })}

        {/* X-axis Labels */}
        {labels.map((l, i) => (
          <text
            key={i}
            x={X(i)}
            y={H + 14}
            fontSize="9"
            fontWeight="600"
            fill="#6B7385"
            textAnchor="middle"
            fontFamily="Montserrat"
          >
            {l}
          </text>
        ))}
      </svg>
      {classAverage && (
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-[#6B7385] font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#13213D] rounded-full inline-block" />
            <span>Learner</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-[#9FB0D3] inline-block" />
            <span>Class average</span>
          </div>
        </div>
      )}
    </div>
  );
};
