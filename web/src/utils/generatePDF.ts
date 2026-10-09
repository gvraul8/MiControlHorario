import type { JobData, WorkEntry } from '../types';
import { BRAND_GREEN, BRAND_NAVY, JOB_COLORS } from '../types';
import { loadPdfBrandingImages, PDF_AUTHOR_HANDLE } from './pdfBranding';

type WorkData = Record<string, WorkEntry[]>;
type JobMap = Record<string, JobData>;

interface PdfBranding {
  appIcon: string;
  authorIcon: string;
}

export function buildReportHtml(
  entries: WorkData,
  year: number,
  month: number,
  userName: string,
  jobList: JobMap,
  branding: PdfBranding,
): string {
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const monthString = String(month + 1).padStart(2, '0');

  const jobSummary: Record<string, { hours: number; money: number }> = {};
  let totalHours = 0;
  let totalMoney = 0;

  Object.entries(entries).forEach(([date, dayEntries]) => {
    if (date.startsWith(`${year}-${monthString}`)) {
      dayEntries.forEach((entry) => {
        const rate = jobList[entry.job]?.rate || 0;
        const money = entry.hours * rate;

        if (!jobSummary[entry.job]) {
          jobSummary[entry.job] = { hours: 0, money: 0 };
        }

        jobSummary[entry.job].hours += entry.hours;
        jobSummary[entry.job].money += money;
        totalHours += entry.hours;
        totalMoney += money;
      });
    }
  });

  const chartConfig = {
    type: 'pie',
    data: {
      labels: Object.keys(jobSummary),
      datasets: [{
        data: Object.values(jobSummary).map((j) => j.hours),
        backgroundColor: JOB_COLORS,
      }],
    },
    options: {
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  };
  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=420&height=320`;

  let summaryHtml = '<div class="summary"><div class="summary-layout">';
  summaryHtml += '<div class="summary-col-left">';
  summaryHtml += '<h2>Resumen Mensual</h2>';
  summaryHtml += `<p class="summary-total summary-total-hours"><strong>Total Horas Trabajadas:</strong> ${totalHours.toFixed(2)}h</p>`;
  summaryHtml += `<p class="summary-total summary-total-money"><strong>Total Ganado:</strong> ${totalMoney.toFixed(2)} €</p>`;
  summaryHtml += '<h3>Desglose por Trabajo</h3><ul>';
  for (const [job, data] of Object.entries(jobSummary)) {
    summaryHtml += `<li><strong>${job}:</strong> ${data.hours.toFixed(2)} horas - ${data.money.toFixed(2)} €</li>`;
  }
  summaryHtml += '</ul></div>';
  summaryHtml += '<div class="summary-col-right">';
  summaryHtml += `<img class="summary-chart" src="${chartUrl}" width="420" height="320" alt="Horas por trabajo" />`;
  summaryHtml += '</div></div></div>';

  let html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 20px; }
        .calendar-title { font-size: 60px; font-weight: 700; color: ${BRAND_NAVY}; text-align: right; margin: 24px 32px 0 0; letter-spacing: 2px; }
        .calendar-title span { color: #6b7280; font-size: 56px; font-weight: 600; margin-left: 16px; }
        table.calendar { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #bdbdbd; min-width: 120px; height: 80px; vertical-align: top; padding: 4px 6px; font-size: 15px; }
        th { background: ${BRAND_NAVY}; color: #fff; font-size: 17px; font-weight: 600; }
        td { background: #fff; color: #222; }
        th.sat, td.sat { background: #444; color: #fff; }
        th.sun, td.sun { background: #888; color: #fff; }
        .jobs { font-size: 13px; margin-top: 2px; }
        .summary { margin-top: 30px; padding-top: 20px; border-top: 2px solid ${BRAND_NAVY}; }
        .summary-layout {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 28px;
        }
        .summary-col-left {
          flex: 1 1 55%;
          min-width: 0;
        }
        .summary-col-right {
          flex: 0 1 45%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 4px;
        }
        .summary-chart {
          max-width: 100%;
          height: auto;
        }
        .summary h2 { font-size: 24px; color: ${BRAND_NAVY}; margin-top: 0; }
        .summary h3 { font-size: 18px; color: ${BRAND_NAVY}; margin: 16px 0 10px; }
        .summary-total { font-size: 18px; margin: 0 0 8px; }
        .summary-total-hours { color: ${BRAND_NAVY}; }
        .summary-total-money { color: ${BRAND_GREEN}; margin-bottom: 4px; }
        .summary ul { list-style-type: none; padding: 0; margin: 0; }
        .summary li { font-size: 16px; margin-bottom: 8px; }
        .pdf-brand-bar {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
          margin: 0 12px 18px;
          padding: 8px 16px 8px;
          border-bottom: 1px solid rgba(26, 61, 82, 0.1);
        }
        .pdf-brand-main {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pdf-app-icon {
          width: 80px;
          height: 80px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .pdf-app-name {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.15;
          color: ${BRAND_NAVY};
        }
        .pdf-app-name .brand-green { color: ${BRAND_GREEN}; }
        .pdf-brand-author {
          display: flex;
          align-items: center;
          gap: 5px;
          margin: 2px 0 0 106px;
          font-size: 14px;
          font-weight: 500;
          color: #9ca3af;
          letter-spacing: 0.02em;
        }
        .pdf-author-icon {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          object-fit: cover;
          flex-shrink: 0;
          opacity: 0.75;
        }
        .pdf-user-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-right: 32px;
        }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="pdf-brand-bar">
        <div class="pdf-brand-main">
          <img class="pdf-app-icon" src="${branding.appIcon}" alt="Mi Control Horario" />
          <div class="pdf-app-name">
            <span class="brand-green">Mi</span>
            <span> Control </span>
            <span class="brand-green">Horario</span>
          </div>
        </div>
        <div class="pdf-brand-author">
          <span>by ${PDF_AUTHOR_HANDLE}</span>
          <img class="pdf-author-icon" src="${branding.authorIcon}" alt="" />
        </div>
      </div>
      <div class="pdf-user-row">
        <div style="font-size: 24px; font-weight: bold; color: #333; margin-left: 20px;">${userName || 'Usuario'}</div>
        <div class="calendar-title">${monthNames[month]} <span>${year}</span></div>
      </div>
      <table class="calendar">
        <tr>
          <th>Lunes</th>
          <th>Martes</th>
          <th>Miércoles</th>
          <th>Jueves</th>
          <th>Viernes</th>
          <th class="sat">Sábado</th>
          <th class="sun">Domingo</th>
        </tr>
  `;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startWeekDay = firstDay.getDay();
  if (startWeekDay === 0) startWeekDay = 7;

  let day = 1;
  const totalDays = lastDay.getDate();

  while (day <= totalDays) {
    html += '<tr>';
    for (let weekDay = 1; weekDay <= 7; weekDay++) {
      if ((day === 1 && weekDay < startWeekDay) || day > totalDays) {
        html += '<td></td>';
      } else {
        const dateStr = `${year}-${monthString}-${String(day).padStart(2, '0')}`;
        html += '<td>';
        html += `<div style="font-weight:600; font-size:16px;">${day}</div>`;
        if (entries[dateStr]?.length) {
          for (const entry of entries[dateStr]) {
            html += `<div class="jobs">${entry.job}: ${entry.hours}h</div>`;
          }
        }
        html += '</td>';
        day++;
      }
    }
    html += '</tr>';
  }

  html += `</table>${summaryHtml}</body></html>`;
  return html;
}

function monthHasEntries(entries: WorkData, year: number, month: number): boolean {
  const monthString = String(month + 1).padStart(2, '0');
  const prefix = `${year}-${monthString}`;
  return Object.entries(entries).some(
    ([date, dayEntries]) => date.startsWith(prefix) && dayEntries.length > 0,
  );
}

const MONTH_NAMES_FILE = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function monthlyReportFileBaseName(year: number, month: number): string {
  const monthLabel = MONTH_NAMES_FILE[month] ?? String(month + 1);
  return `mi-control-horario-${monthLabel}-${year}`;
}

export async function buildMonthlyReportHtml(
  entries: WorkData,
  year: number,
  month: number,
  userName: string,
  jobList: JobMap,
): Promise<string> {
  if (!monthHasEntries(entries, year, month)) {
    throw new Error('No hay registros en el mes seleccionado');
  }

  const branding = await loadPdfBrandingImages();
  return buildReportHtml(entries, year, month, userName, jobList, branding);
}
