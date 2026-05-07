import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Visit } from '../types.ts';

function formatDateTime(isoStr: string): string {
  return new Date(isoStr.replace(' ', 'T') + 'Z')
    .toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Brussels',
    });
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function status(v: Visit): string {
  if (!v.signed_out_at) {
    const signedIn = new Date(v.signed_in_at.replace(' ', 'T') + 'Z').getTime();
    return Date.now() - signedIn > 4 * 60 * 60 * 1000 ? '⚠ 4h+ inside' : 'Inside';
  }
  return 'Left';
}

export function exportVisitsPdf(visits: Visit[], fromDate: string, toDate: string): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Brussels',
  });

  // Header band
  doc.setFillColor(0, 91, 150); // --brand-primary
  doc.rect(0, 0, pageW, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('CluePoints — Visitor Register', 14, 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Exported: ${now}`, pageW - 14, 13, { align: 'right' });

  // Date range subtitle
  const rangeLabel = fromDate === toDate
    ? `Date: ${formatDate(fromDate)}`
    : `Period: ${formatDate(fromDate)} → ${formatDate(toDate)}`;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(rangeLabel, 14, 30);

  // Summary stats
  const inside = visits.filter(v => !v.signed_out_at).length;
  const reminders = visits.filter(v => v.reminder_sent).length;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Total visitors: ${visits.length}   ·   Currently inside: ${inside}   ·   Reminders sent: ${reminders}`,
    14, 36,
  );

  // Table
  autoTable(doc, {
    startY: 42,
    head: [['Name', 'Email', 'Phone', 'Reason', 'Person to meet', 'Sign in', 'Sign out', 'Status', 'Reminder']],
    body: visits.map(v => [
      `${v.first_name} ${v.last_name}`,
      v.email,
      v.phone ?? '—',
      v.reason,
      v.person_to_meet ?? '—',
      formatDateTime(v.signed_in_at),
      v.signed_out_at ? formatDateTime(v.signed_out_at) : '—',
      status(v),
      v.reminder_sent ? 'Yes' : 'No',
    ]),
    headStyles: {
      fillColor: [0, 91, 150],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 45 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
      5: { cellWidth: 30 },
      6: { cellWidth: 30 },
      7: { cellWidth: 22 },
      8: { cellWidth: 18 },
    },
    margin: { left: 14, right: 14 },
  });

  const dateTag = fromDate === toDate ? fromDate : `${fromDate}_${toDate}`;
  doc.save(`visitor-register_${dateTag}.pdf`);
}
