// Builds a printable illness report. jsPDF is loaded on demand (dynamic import)
// so it is not part of the main bundle.
import { formatDate, formatNumber } from '../../lib/format.js';

const PAGE = { w: 210, h: 297, margin: 16 };

function hexToRgb(hex) {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Returns a Blob (application/pdf). `accent` is the theme's primary color. */
export async function buildIllnessPdf({ pet, illness, entries, t, accent = '#2F55C4' }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const [r, g, b] = hexToRgb(accent);
  const width = PAGE.w - PAGE.margin * 2;
  let y = PAGE.margin;

  const ensureSpace = (needed) => {
    if (y + needed > PAGE.h - PAGE.margin) {
      doc.addPage();
      y = PAGE.margin;
    }
  };

  doc.setFillColor(r, g, b);
  doc.rect(0, 0, PAGE.w, 6, 'F');
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(illness.title, PAGE.margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  const meta = [
    `${t('pdf.pet')}: ${pet.name} (${t(`species.${pet.species}`)})`,
    `${t('illness.statusLabel')}: ${t(`illness.status.${illness.status}`)}`,
    `${t('illness.period')}: ${formatDate(illness.started_on)}${illness.ended_on ? ` – ${formatDate(illness.ended_on)}` : ''}`,
  ];
  for (const line of meta) {
    doc.text(line, PAGE.margin, y);
    y += 6;
  }
  if (illness.diagnosis) {
    const lines = doc.splitTextToSize(`${t('illness.diagnosis')}: ${illness.diagnosis}`, width);
    doc.text(lines, PAGE.margin, y);
    y += lines.length * 5 + 1;
  }
  if (illness.notes) {
    const lines = doc.splitTextToSize(illness.notes, width);
    doc.text(lines, PAGE.margin, y);
    y += lines.length * 5 + 1;
  }
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(t('illness.entries'), PAGE.margin, y);
  y += 6;

  if (!entries.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(t('illness.noEntries'), PAGE.margin, y);
  }

  for (const e of entries) {
    const details = [
      [t('illness.symptoms'), e.symptoms],
      [t('illness.treatment'), e.treatment],
      [t('common.notes'), e.notes],
    ].filter(([, v]) => v);
    const bodyLines = details.flatMap(([label, value]) =>
      doc.splitTextToSize(`${label}: ${value}`, width - 6),
    );
    ensureSpace(12 + bodyLines.length * 5);

    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.8);
    doc.line(PAGE.margin, y - 1, PAGE.margin, y + 6 + bodyLines.length * 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    const head = [
      formatDate(e.date),
      e.severity != null && `${t('illness.severity')}: ${e.severity}/5`,
      e.temperature_c != null && `${formatNumber(e.temperature_c, 1)} °C`,
    ]
      .filter(Boolean)
      .join('   ·   ');
    doc.text(head, PAGE.margin + 4, y + 3);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(bodyLines, PAGE.margin + 4, y);
    y += bodyLines.length * 5 + 4;
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${t('app.name')} · ${t('pdf.generated', { date: formatDate(new Date()) })}`,
      PAGE.margin,
      PAGE.h - 8,
    );
    doc.text(`${i} / ${pages}`, PAGE.w - PAGE.margin, PAGE.h - 8, { align: 'right' });
  }
  return doc.output('blob');
}
