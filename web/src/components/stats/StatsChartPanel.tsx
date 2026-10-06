import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { JobInfo, StatsTab } from '../../types';
import { BRAND_NAVY } from '../../types';
import {
  type ChartRow,
  chartHasData,
  formatStatValue,
} from '../../utils/statsHelpers';

interface PieItem {
  name: string;
  value: number;
  color: string;
}

interface StatsChartPanelProps {
  selectedTab: StatsTab;
  displayMode: 'hours' | 'money';
  jobs: string[];
  jobInfo: Record<string, JobInfo>;
  weeklyChartData: ChartRow[];
  monthlyChartData: ChartRow[];
  pieChartData: PieItem[];
}

function ChartTooltip({
  active,
  payload,
  displayMode,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  displayMode: 'hours' | 'money';
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      {payload.map((item) => (
        <div key={item.name} className="chart-tooltip-row">
          <span className="legend-dot" style={{ backgroundColor: item.color }} />
          <span>{item.name}</span>
          <strong>{formatStatValue(item.value, displayMode)}</strong>
        </div>
      ))}
    </div>
  );
}

function StackedChart({
  data,
  jobs,
  jobInfo,
  displayMode,
}: {
  data: ChartRow[];
  jobs: string[];
  jobInfo: Record<string, JobInfo>;
  displayMode: 'hours' | 'money';
}) {
  if (!chartHasData(data, jobs)) {
    return <p className="empty-text">Sin datos para este período.</p>;
  }

  return (
    <div className="card chart-card">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={40} />
          <Tooltip
            content={({ active, payload }) => (
              <ChartTooltip
                active={active}
                displayMode={displayMode}
                payload={payload?.map((p) => ({
                  name: String(p.name),
                  value: Number(p.value) || 0,
                  color: String(p.color),
                }))}
              />
            )}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {jobs.map((job) => (
            <Bar
              key={job}
              dataKey={job}
              stackId="a"
              fill={jobInfo[job]?.color || BRAND_NAVY}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StatsChartPanel({
  selectedTab,
  displayMode,
  jobs,
  jobInfo,
  weeklyChartData,
  monthlyChartData,
  pieChartData,
}: StatsChartPanelProps) {
  if (selectedTab === 'weekly') {
    return (
      <StackedChart
        data={weeklyChartData}
        jobs={jobs}
        jobInfo={jobInfo}
        displayMode={displayMode}
      />
    );
  }

  if (selectedTab === 'monthly') {
    return (
      <StackedChart
        data={monthlyChartData}
        jobs={jobs}
        jobInfo={jobInfo}
        displayMode={displayMode}
      />
    );
  }

  if (selectedTab === 'byJob') {
    if (pieChartData.length === 0) {
      return <p className="empty-text">Sin datos para el gráfico.</p>;
    }

    return (
      <div className="card chart-card">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieChartData}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={92}
              paddingAngle={2}
            >
              {pieChartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatStatValue(Number(value) || 0, displayMode)}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="legend-list">
          {pieChartData.map((item) => (
            <div key={item.name} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: item.color }} />
              <span>{item.name}</span>
              <strong>{formatStatValue(item.value, displayMode)}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
