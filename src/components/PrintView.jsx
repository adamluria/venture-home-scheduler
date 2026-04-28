import React, { useMemo } from 'react';
import { mockAppointments, consultants, getConsultantName } from '../data/mockData.js';
import { APPOINTMENT_TYPES, APPOINTMENT_STATUSES, TERRITORIES } from '../data/theme.js';

/**
 * Printable daily schedule view
 * White background, black text, one section per rep
 * Hides everything except print content
 */
export default function PrintView({ dateString, selectedRegions = [] }) {
  const appts = useMemo(() => {
    return mockAppointments.filter(a => a.date === dateString);
  }, [dateString]);

  const reps = useMemo(() => {
    const selected = selectedRegions.length > 0 ? selectedRegions : Object.keys(TERRITORIES);
    return consultants
      .filter(c => !c.isCloserOnly && c.territories.some(t => selected.includes(t)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedRegions]);

  const repAppointments = (repId) => {
    return appts.filter(a => a.consultant === repId).sort((a, b) => {
      const timeOrder = ['9:00 AM', '11:30 AM', '2:00 PM', '5:00 PM', '7:00 PM'];
      return timeOrder.indexOf(a.time) - timeOrder.indexOf(b.time);
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const now = new Date().toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        color: '#000000',
        padding: '0.5in',
        fontFamily: '"Outfit", sans-serif',
        lineHeight: '1.6',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Print-only styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-view-container {
            max-width: 100%;
            page-break-after: avoid;
          }
          .rep-section {
            page-break-inside: avoid;
            margin-bottom: 0.3in;
          }
          .no-print {
            display: none !important;
          }
        }
        @page {
          size: 8.5in 11in;
          margin: 0.5in;
        }
      `}</style>

      <div className="print-view-container">
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '0.4in',
            borderBottom: '2px solid #000000',
            paddingBottom: '0.3in',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '0.1in',
            }}
          >
            Venture Home — Daily Schedule
          </div>
          <div style={{ fontSize: '14px', color: '#333333' }}>
            {formatDate(dateString)}
          </div>
        </div>

        {/* Rep Sections */}
        {reps.map(rep => {
          const repAppts = repAppointments(rep.id);
          if (repAppts.length === 0) return null;

          return (
            <div key={rep.id} className="rep-section" style={{
              marginBottom: '0.3in',
              pageBreakInside: 'avoid',
            }}>
              {/* Rep Header */}
              <div style={{
                backgroundColor: '#F0F0F0',
                padding: '0.15in 0.2in',
                marginBottom: '0.15in',
                borderLeft: '4px solid #F0A830',
              }}>
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}>
                  {rep.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#666666',
                  marginTop: '0.05in',
                }}>
                  {rep.position.toUpperCase()} • {rep.team}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#666666',
                }}>
                  {rep.territories.join(', ')}
                </div>
              </div>

              {/* Appointments Table */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '10px',
                  marginBottom: '0.2in',
                }}
              >
                <thead>
                  <tr style={{
                    borderBottom: '1px solid #CCCCCC',
                    backgroundColor: '#EEEEEE',
                  }}>
                    <th style={{
                      textAlign: 'left',
                      padding: '0.08in 0.1in',
                      fontWeight: 'bold',
                      fontSize: '9px',
                    }}>
                      Time
                    </th>
                    <th style={{
                      textAlign: 'left',
                      padding: '0.08in 0.1in',
                      fontWeight: 'bold',
                      fontSize: '9px',
                    }}>
                      Customer
                    </th>
                    <th style={{
                      textAlign: 'left',
                      padding: '0.08in 0.1in',
                      fontWeight: 'bold',
                      fontSize: '9px',
                    }}>
                      Address
                    </th>
                    <th style={{
                      textAlign: 'center',
                      padding: '0.08in 0.1in',
                      fontWeight: 'bold',
                      fontSize: '9px',
                    }}>
                      Subject
                    </th>
                    <th style={{
                      textAlign: 'center',
                      padding: '0.08in 0.1in',
                      fontWeight: 'bold',
                      fontSize: '9px',
                    }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {repAppts.map((apt, idx) => (
                    <tr
                      key={apt.id}
                      style={{
                        borderBottom: '1px solid #EEEEEE',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9F9F9',
                      }}
                    >
                      <td style={{
                        padding: '0.08in 0.1in',
                        fontWeight: '500',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}>
                        {apt.time}
                      </td>
                      <td style={{
                        padding: '0.08in 0.1in',
                      }}>
                        {apt.customer}
                      </td>
                      <td style={{
                        padding: '0.08in 0.1in',
                        fontSize: '9px',
                        color: '#555555',
                      }}>
                        {apt.address}
                      </td>
                      <td style={{
                        padding: '0.08in 0.1in',
                        textAlign: 'center',
                        fontSize: '9px',
                        fontWeight: '500',
                      }}>
                        {APPOINTMENT_TYPES[apt.type]?.name || apt.type}
                      </td>
                      <td style={{
                        padding: '0.08in 0.1in',
                        textAlign: 'center',
                        fontSize: '9px',
                        fontWeight: '500',
                        color: '#666666',
                      }}>
                        {APPOINTMENT_STATUSES[apt.status]?.name || apt.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid #CCCCCC',
            paddingTop: '0.2in',
            marginTop: '0.3in',
            fontSize: '9px',
            color: '#666666',
            textAlign: 'right',
          }}
        >
          <div>
            Printed from Venture Home Scheduler
          </div>
          <div>
            {now}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PrintButton component — opens PrintView in a new window for printing
 */
export function PrintButton({ dateString, selectedRegions, children = 'Print Schedule' }) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    const PrintViewHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Venture Home Daily Schedule</title>
          <style>
            * { margin: 0; padding: 0; }
            body {
              font-family: 'Outfit', sans-serif;
              background: white;
              color: black;
              padding: 0.5in;
            }
            @media print {
              body { margin: 0; padding: 0.5in; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .rep-section { page-break-inside: avoid; }
            }
            @page { margin: 0.5in; }
            h1 { font-size: 24px; text-align: center; margin-bottom: 0.2in; border-bottom: 2px solid black; padding-bottom: 0.2in; }
            .rep-section { margin-bottom: 0.3in; page-break-inside: avoid; }
            .rep-header { background: #F0F0F0; padding: 0.15in; margin-bottom: 0.15in; border-left: 4px solid #F0A830; }
            .rep-name { font-weight: bold; font-size: 13px; }
            .rep-meta { font-size: 11px; color: #666; margin-top: 0.05in; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 0.2in; }
            th { text-align: left; padding: 0.08in 0.1in; font-weight: bold; font-size: 9px; background: #EEE; border-bottom: 1px solid #CCC; }
            td { padding: 0.08in 0.1in; border-bottom: 1px solid #EEE; }
            tbody tr:nth-child(odd) { background: #FFF; }
            tbody tr:nth-child(even) { background: #F9F9F9; }
            .footer { border-top: 1px solid #CCC; padding-top: 0.2in; margin-top: 0.3in; font-size: 9px; color: #666; text-align: right; }
          </style>
        </head>
        <body>
          <h1>Venture Home — Daily Schedule</h1>
          <div style="text-align: center; margin-bottom: 0.3in; font-size: 14px; color: #333;">
            ${new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <p style="text-align: center; margin-bottom: 1in; color: #999; font-size: 12px;">
            Loading schedule data...
          </p>
          <div class="footer">
            Printed from Venture Home Scheduler<br />
            ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(PrintViewHtml);
    printWindow.document.close();

    // Trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <button
      onClick={handlePrint}
      style={{
        padding: '8px 16px',
        backgroundColor: '#000000',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '4px',
        fontWeight: '500',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      }}
      onMouseOver={e => {
        e.target.style.backgroundColor = '#333333';
      }}
      onMouseOut={e => {
        e.target.style.backgroundColor = '#000000';
      }}
    >
      {children}
    </button>
  );
}
