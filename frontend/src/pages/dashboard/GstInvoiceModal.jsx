import React, { useState, useEffect } from 'react';
import { api } from '../../api';

export default function GstInvoiceModal({ txnid, onClose }) {
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!txnid) return;
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const data = await api.getInvoiceDetails(txnid);
        setInvoiceData(data);
      } catch (err) {
        console.error('Invoice load error:', err);
        setError(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [txnid]);

  const handlePrint = () => {
    const printArea = document.getElementById('gst-invoice-printable-area');
    if (!printArea) return;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tax Invoice - ${invoiceData?.invoiceNo || txnid}</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 20px; background: #fff; }
            .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; }
            .header-table { width: 100%; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #dbeafe; color: #1e40af; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .section-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 6px; }
            table.items { width: 100%; border-collapse: collapse; margin: 20px 0; }
            table.items th { background: #f8fafc; text-align: left; padding: 10px; border: 1px solid #cbd5e1; font-size: 12px; }
            table.items td { padding: 10px; border: 1px solid #cbd5e1; font-size: 13px; }
            .total-row { font-weight: bold; background: #f1f5f9; }
            .footer-note { font-size: 11px; color: #64748b; margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            @media print {
              body { padding: 0; }
              .invoice-box { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            ${printArea.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1000);
    }, 500);
  };

  if (!txnid) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(6px)',
      zIndex: 3000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }} onClick={onClose}>
      <div className="modal-content" style={{
        background: '#ffffff',
        color: '#0f172a',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🧾</span>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>TAX INVOICE</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {invoiceData && (
              <button onClick={handlePrint} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🖨️ Print / Download PDF
              </button>
            )}
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading Official GST Tax Invoice...
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <p>{error}</p>
          </div>
        ) : invoiceData ? (
          <div id="gst-invoice-printable-area" style={{ fontFamily: 'system-ui, sans-serif' }}>
            
            {/* Seller Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem 0', color: '#2563eb', fontSize: '1.4rem', fontWeight: 800 }}>
                  {invoiceData.seller?.legalName || 'WIDE VENTURES'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>{invoiceData.seller?.tradeName || 'WIDE VENTURES (WIDE TECH / BROFFY)'}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b', maxWidth: '350px' }}>
                  {invoiceData.seller?.registeredAddress || '8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731'}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }}>
                  GSTIN: <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{invoiceData.seller?.gstin || '32FBEPK9712B1Z0'}</span>
                </p>
              </div>

              <div style={{ textAlign: 'right', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: invoiceData.billingDetails?.isB2B ? '#dbeafe' : '#fef3c7', color: invoiceData.billingDetails?.isB2B ? '#1e40af' : '#92400e', marginBottom: '0.5rem' }}>
                  {invoiceData.billingDetails?.isB2B ? 'B2B TAX INVOICE' : 'B2C TAX INVOICE'}
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Invoice No:</p>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1rem', color: '#0f172a', fontFamily: 'monospace' }}>
                  {invoiceData.invoiceNo}
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Date: {new Date(invoiceData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Place of Supply: <strong>{invoiceData.billingDetails?.buyerState || invoiceData.seller?.sellerState}</strong></p>
              </div>
            </div>

            {/* Buyer Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', margin: '1.5rem 0', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, margin: '0 0 0.4rem 0' }}>Billed To (Customer):</p>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{invoiceData.billingDetails?.buyerName || invoiceData.user?.name}</p>
                <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#475569' }}>{invoiceData.billingDetails?.buyerEmail || invoiceData.user?.email}</p>
                {invoiceData.billingDetails?.buyerAddress && (
                  <p style={{ margin: '0.2rem 0', fontSize: '0.8rem', color: '#64748b' }}>{invoiceData.billingDetails.buyerAddress}</p>
                )}
                <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#0f172a' }}>State: <strong>{invoiceData.billingDetails?.buyerState || 'Tamil Nadu'}</strong></p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, margin: '0 0 0.4rem 0' }}>Tax Identification:</p>
                {invoiceData.billingDetails?.buyerGstin ? (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#16a34a', fontWeight: 700 }}>
                    Buyer GSTIN: <span style={{ fontFamily: 'monospace' }}>{invoiceData.billingDetails.buyerGstin}</span>
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Buyer GSTIN: Unregistered Consumer (B2C)</p>
                )}
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>Transaction ID: <span style={{ fontFamily: 'monospace' }}>{invoiceData.txnid}</span></p>
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1.5rem 0', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderRadius: '6px 0 0 0' }}>Item Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>SAC Code</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Taxable Base (₹)</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Rate</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Total Price (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.85rem 0.75rem' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{invoiceData.itemTitle}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Online Educational Course / Program</div>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontFamily: 'monospace' }}>
                    {invoiceData.gstDetails?.hsnSacCode || '999249'}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>
                    ₹{invoiceData.gstDetails?.baseAmount?.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                    {invoiceData.gstDetails?.rate || 18}%
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    ₹{invoiceData.amount?.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Tax Breakdown Box */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '1.5rem 0' }}>
              <div style={{ width: '320px', background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem', color: '#475569' }}>
                  <span>Taxable Base Value:</span>
                  <span>₹{invoiceData.gstDetails?.baseAmount?.toFixed(2)}</span>
                </div>

                {invoiceData.gstDetails?.isIntraState ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem', color: '#475569' }}>
                      <span>CGST (9%):</span>
                      <span>₹{invoiceData.gstDetails?.cgstAmount?.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem', color: '#475569' }}>
                      <span>SGST (9%):</span>
                      <span>₹{invoiceData.gstDetails?.sgstAmount?.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem', color: '#475569' }}>
                    <span>IGST (18%):</span>
                    <span>₹{invoiceData.gstDetails?.igstAmount?.toFixed(2)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '1px dashed #cbd5e1', marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#2563eb' }}>
                  <span>Total Tax Collected:</span>
                  <span>₹{invoiceData.gstDetails?.gstAmount?.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0 0 0', borderTop: '2px solid #0f172a', marginTop: '0.6rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  <span>Total (Incl. Tax):</span>
                  <span>₹{invoiceData.amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Compliance Note */}
            <div style={{ textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '1.5rem', color: '#64748b', fontSize: '0.78rem' }}>
              <p style={{ margin: '0 0 0.2rem 0' }}>This is a computer-generated tax invoice issued in accordance with Rule 46 of Indian CGST Rules, 2017.</p>
              <p style={{ margin: 0, fontWeight: 600 }}>Thank you for learning with WIDETECHNOS Academy!</p>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
