import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatCard — reusable statistic card for dashboards.
 *
 * Props:
 *   title   string       - label below the value
 *   value   string|number - main numeric/text value
 *   icon    React element - lucide icon component
 *   colour  string        - tailwind colour suffix (blue, green, purple, yellow, red)
 *   trend   object        - optional { value: number, label: string }
 *                          positive = up arrow, negative = down arrow, 0 = dash
 */
export default function StatCard({ title, value, icon: Icon, colour = 'blue', trend }) {
  const colourMap = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   ring: 'bg-blue-100'   },
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  ring: 'bg-green-100'  },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'bg-purple-100' },
    yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', ring: 'bg-yellow-100' },
    red:    { bg: 'bg-red-50',    icon: 'text-red-600',    ring: 'bg-red-100'    },
  };
  const c = colourMap[colour] ?? colourMap.blue;

  const TrendIcon =
    !trend ? null
    : trend.value > 0 ? TrendingUp
    : trend.value < 0 ? TrendingDown
    : Minus;

  const trendColour =
    !trend ? ''
    : trend.value > 0 ? 'text-green-600'
    : trend.value < 0 ? 'text-red-500'
    : 'text-gray-400';

  return (
    <div className={`card flex items-start justify-between ${c.bg} border-0`}>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColour}`}>
            {TrendIcon && <TrendIcon size={14} />}
            <span>{trend.label}</span>
          </div>
        )}
      </div>
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${c.ring}`}>
        {Icon && <Icon size={24} className={c.icon} />}
      </div>
    </div>
  );
}
