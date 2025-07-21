import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface WorkEntry {
  job: string;
  hours: number;
}

type WorkData = Record<string, WorkEntry[]>;

export async function generateStyledPDF(entries: WorkData, year: number, month: number) {
  const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const monthString = String(month + 1).padStart(2, '0');
  const title = `${monthNames[month]} ${year}`;

  // Genera el calendario mensual
  let html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; background: #fff; margin: 0; }
        .calendar-title { font-size: 60px; font-weight: 700; color: #2563eb; text-align: right; margin: 24px 32px 0 0; letter-spacing: 2px; }
        .calendar-title span { color: #6b7280; font-size: 56px; font-weight: 600; margin-left: 16px; }
        table.calendar { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #bdbdbd; min-width: 120px; height: 80px; vertical-align: top; padding: 4px 6px; font-size: 15px; }
        th { background: #2563eb; color: #fff; font-size: 17px; font-weight: 600; }
        td { background: #fff; color: #222; }
        th.sat, td.sat { background: #444; color: #fff; }
        th.sun, td.sun { background: #888; color: #fff; }
        .jobs { font-size: 13px; margin-top: 2px; }
      </style>
    </head>
    <body>
      <div class="calendar-title">${monthNames[month]} <span>${year}</span></div>
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
  // Validación básica de datos
  if (!entries || Object.keys(entries).length === 0) {
    throw new Error('No hay datos para generar el PDF');
  }

  // Calcular el primer día del mes y el día de la semana
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // En JS, getDay: 0=Domingo, 1=Lunes, ..., 6=Sábado
  let startWeekDay = firstDay.getDay();
  if (startWeekDay === 0) startWeekDay = 7; // Para que lunes=1, domingo=7

  let day = 1;
  const totalDays = lastDay.getDate();

  // Generar las semanas
  while (day <= totalDays) {
    html += '<tr>';
    for (let weekDay = 1; weekDay <= 7; weekDay++) {
      if ((day === 1 && weekDay < startWeekDay) || day > totalDays) {
        html += '<td></td>';
      } else {
        // Formato fecha YYYY-MM-DD
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        html += `<td>`;
        html += `<div style="font-weight:600; font-size:16px;">${day}</div>`;
        if (entries[dateStr] && entries[dateStr].length > 0) {
          for (const entry of entries[dateStr]) {
            html += `<div class="jobs">${entry.job}: ${entry.hours}h</div>`;
          }
        }
        html += `</td>`;
        day++;
      }
    }
    html += '</tr>';
  }

  html += `</table></body></html>`;

  html += `
    </body>
    </html>
  `;

  const file = await Print.printToFileAsync({ html });
  if (!file || !file.uri) throw new Error('No se pudo generar el archivo PDF');
  await Sharing.shareAsync(file.uri);

}
