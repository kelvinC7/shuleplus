import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SchoolTrip } from '@/types/shuletrip';
import type { TripDocumentKind } from '@/types/shuletrip';
import { destinationFromPlace, tripCode } from '@/lib/shuletrip-utils';

const NAVY: [number, number, number] = [0, 4, 53];
const AMBER: [number, number, number] = [252, 176, 56];
const GRAY: [number, number, number] = [100, 116, 139];

function money(n: number) {
  return `RWF ${Math.round(n).toLocaleString()}`;
}

function header(doc: jsPDF, title: string, subtitle: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 32, 'F');
  doc.setTextColor(...AMBER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Shule+ · ShuleTrip', 14, 12);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(title, 14, 22);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 14, 28);
  doc.setTextColor(...NAVY);
}

export function downloadTripDocumentPdf(trip: SchoolTrip, kind: TripDocumentKind) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const code = tripCode(trip);
  const dest = destinationFromPlace(trip.place);
  const filenameBase = `${code}-${kind}`.toLowerCase();

  if (kind === 'approval') {
    header(doc, 'Parent approval letter', trip.title);
    let y = 42;
    doc.setFontSize(10);
    doc.text(`Trip code: ${code}`, 14, y);
    y += 6;
    doc.text(`Student: ${trip.studentName}`, 14, y);
    y += 6;
    doc.text(`Date: ${trip.date}`, 14, y);
    y += 6;
    doc.text(`Destination: ${dest}`, 14, y);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Parent / guardian consent', 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    const body =
      trip.consent?.status === 'approved'
        ? `I confirm that I have reviewed the trip schedule, transport arrangements, and emergency contacts. I approve ${trip.studentName} to participate in this school trip.`
        : `Draft letter — complete digital consent in the Parent Portal to attach your signature.`;
    doc.text(doc.splitTextToSize(body, 180), 14, y);
    y += 24;
    if (trip.consent?.by) {
      doc.text(`Signed by: ${trip.consent.by}`, 14, y);
      y += 6;
      doc.text(`Date: ${trip.consent.at}${trip.consent.atIso ? ` (${new Date(trip.consent.atIso).toLocaleString()})` : ''}`, 14, y);
    }
  } else if (kind === 'safety') {
    header(doc, 'Trip safety guidelines', trip.title);
    let y = 42;
    const lines = [
      'Follow instructions from trip lead and supervisors at all times.',
      'Remain with the assigned group during all activities.',
      'Wear school-approved clothing and bring required safety items.',
      `Emergency school line: ${trip.ph}`,
      'Rwanda emergency: 112 · Ambulance: 912',
    ];
    doc.setFontSize(10);
    lines.forEach((line) => {
      doc.text(`• ${line}`, 14, y);
      y += 7;
    });
  } else if (kind === 'packing') {
    header(doc, 'Packing checklist', trip.title);
    autoTable(doc, {
      startY: 40,
      head: [['Item', 'Required']],
      body: trip.pack.map((item) => [item, 'Yes']),
      styles: { fontSize: 10 },
      headStyles: { fillColor: NAVY, textColor: AMBER },
    });
  } else {
    header(doc, 'Trip payment receipt', trip.title);
    let y = 42;
    doc.setFontSize(10);
    doc.text(`Trip fee: ${money(trip.cost)}`, 14, y);
    y += 6;
    doc.text(`Amount paid: ${money(trip.paid)}`, 14, y);
    y += 6;
    doc.text(`Balance: ${money(Math.max(0, trip.cost - trip.paid))}`, 14, y);
    y += 6;
    doc.setTextColor(...GRAY);
    doc.text(`Installments: ${trip.inst} · Due by ${trip.due}`, 14, y);
  }

  doc.save(`${filenameBase}.pdf`);
}
