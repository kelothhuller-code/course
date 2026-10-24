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

  // Escape key handler to ensure modal can always be closed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
            body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1e293b; padding: 20px; background: #fff; }
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

  const handleClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onClose) onClose();
  };

  if (!txnid) return null;

  return (
    <div 
      className="invoice-modal-backdrop" 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem'
      }} 
      onClick={handleClose}
    >
      <div 
        className="invoice-modal-container" 
        style={{
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: '16px',
          maxWidth: '780px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky Modal Top Bar - Never scrolls away! */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.9rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🧾</span>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem', fontWeight: 800 }}>
              TAX INVOICE
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {invoiceData && (
              <button 
                type="button"
                onClick={handlePrint} 
                className="btn btn-primary btn-sm" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                🖨️ Print / PDF
              </button>
            )}
            <button 
              type="button"
              onClick={handleClose} 
              aria-label="Close invoice"
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content Body with Compact, Standard Typography */}
        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1, fontSize: '0.85rem' }}>
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
              
              {/* Seller & Invoice Metadata Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}>
                <div style={{ flex: '1 1 240px' }}>
                  <h2 style={{ margin: '0 0 0.2rem 0', color: '#2563eb', fontSize: '1.2rem', fontWeight: 800 }}>
                    {invoiceData.seller?.legalName || 'WIDE VENTURES'}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                    {invoiceData.seller?.tradeName || 'WIDE VENTURES (WIDE TECH)'}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b', maxWidth: '320px', lineHeight: 1.4 }}>
                    {invoiceData.seller?.registeredAddress || '8/7/a, Thettamala, Wayanad, Kerala - 670731'}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }}>
                    GSTIN: <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{invoiceData.seller?.gstin || '32FBEPK9712B1Z0'}</span>
                  </p>
                </div>

                <div style={{
                  background: invoiceData.isRefunded ? '#fef2f2' : '#f8fafc',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '10px',
                  border: invoiceData.isRefunded ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  minWidth: '200px',
                  flex: '1 1 200px',
                  textAlign: 'left'
                }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: invoiceData.isRefunded ? '#fee2e2' : (invoiceData.billingDetails?.isB2B ? '#dbeafe' : '#fef3c7'),
                    color: invoiceData.isRefunded ? '#b91c1c' : (invoiceData.billingDetails?.isB2B ? '#1e40af' : '#92400e'),
                    marginBottom: '0.35rem'
                  }}>
                    {invoiceData.isRefunded ? '⚠️ REFUND CREDIT NOTE (SEC 9B)' : (invoiceData.billingDetails?.isB2B ? 'B2B TAX INVOICE' : 'B2C TAX INVOICE')}
                  </div>
                  {invoiceData.isRefunded ? (
                    <>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600 }}>Credit Note No:</p>
                      <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', fontSize: '0.88rem', color: '#b91c1c', fontFamily: 'monospace' }}>
                        {invoiceData.creditNoteNo || `CN-${invoiceData.txnid}`}
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Invoice No:</p>
                      <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', fontSize: '0.88rem', color: '#0f172a', fontFamily: 'monospace' }}>
                        {invoiceData.invoiceNo}
                      </p>
                    </>
                  )}
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Date: <strong>{new Date(invoiceData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></p>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Place of Supply: <strong>{invoiceData.billingDetails?.buyerState || invoiceData.seller?.sellerState || 'Kerala'}</strong></p>
                </div>
              </div>

              {/* Billed To / Buyer Info */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                gap: '0.75rem',
                margin: '0.75rem 0',
                background: '#f8fafc',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '0.8rem'
              }}>
                <div>
                  <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, margin: '0 0 0.2rem 0' }}>Billed To (Customer):</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{invoiceData.billingDetails?.buyerName || invoiceData.user?.name}</p>
                  <p style={{ margin: '0.15rem 0', fontSize: '0.78rem', color: '#475569' }}>{invoiceData.billingDetails?.buyerEmail || invoiceData.user?.email}</p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#0f172a' }}>State: <strong>{invoiceData.billingDetails?.buyerState || invoiceData.seller?.sellerState || 'Kerala'}</strong></p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, margin: '0 0 0.2rem 0' }}>Tax Details:</p>
                  {invoiceData.billingDetails?.buyerGstin ? (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#16a34a', fontWeight: 700 }}>
                      Buyer GSTIN: <span style={{ fontFamily: 'monospace' }}>{invoiceData.billingDetails.buyerGstin}</span>
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Unregistered Consumer (B2C)</p>
                  )}
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Txn Ref: <span style={{ fontFamily: 'monospace' }}>{invoiceData.txnid}</span></p>
                </div>
              </div>

              {/* Responsive Line Item (Zero Horizontal Scrolling on Phone) */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                margin: '0.75rem 0',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  <span>ITEM SPECIFICATION</span>
                  <span>SAC: {invoiceData.gstDetails?.hsnSacCode || '999249'}</span>
                </div>
                <div style={{ padding: '0.75rem' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                    {invoiceData.itemTitle}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.6rem' }}>
                    Online Educational & Technology Program (SAC 999249)
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Taxable Base: </span>
                      <strong>₹{invoiceData.gstDetails?.baseAmount?.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>GST Rate: </span>
                      <strong>{invoiceData.gstDetails?.rate || 18}%</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Amount: </span>
                      <strong style={{ color: '#2563eb', fontSize: '0.9rem' }}>₹{invoiceData.amount?.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Breakdown Box - Fluid and Clean */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                margin: '0.75rem 0'
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: '340px',
                  background: invoiceData.isRefunded ? '#fef2f2' : '#f8fafc',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  border: invoiceData.isRefunded ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#475569' }}>
                    <span>{invoiceData.isRefunded ? 'Taxable Base (Reversed):' : 'Taxable Value:'}</span>
                    <span style={{ fontWeight: 600 }}>₹{invoiceData.gstDetails?.baseAmount?.toFixed(2)}</span>
                  </div>

                  {invoiceData.gstDetails?.isIntraState ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#475569' }}>
                        <span>CGST (9%):</span>
                        <span>₹{invoiceData.gstDetails?.cgstAmount?.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#475569' }}>
                        <span>SGST (9%):</span>
                        <span>₹{invoiceData.gstDetails?.sgstAmount?.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#475569' }}>
                      <span>IGST (18%):</span>
                      <span>₹{invoiceData.gstDetails?.igstAmount?.toFixed(2)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderTop: '1px dashed #cbd5e1', marginTop: '0.3rem', fontWeight: 600, color: invoiceData.isRefunded ? '#dc2626' : '#2563eb' }}>
                    <span>{invoiceData.isRefunded ? 'Total GST Reversed:' : 'Total GST (18%):'}</span>
                    <span>₹{invoiceData.gstDetails?.gstAmount?.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0 0 0', borderTop: invoiceData.isRefunded ? '2px solid #b91c1c' : '2px solid #0f172a', marginTop: '0.4rem', fontSize: '1rem', fontWeight: 800, color: invoiceData.isRefunded ? '#b91c1c' : '#0f172a' }}>
                    <span>{invoiceData.isRefunded ? 'Refunded Total:' : 'Total Amount Paid:'}</span>
                    <span>₹{invoiceData.amount?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Official GST Compliance Note */}
              <div style={{
                fontSize: '0.7rem',
                color: '#64748b',
                textAlign: 'center',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.6rem',
                marginTop: '0.75rem'
              }}>
                This is a computer-generated tax invoice issued in compliance with the Central Goods and Services Tax (CGST) Act, 2017. WideTech.in
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom Prominent Close Bar - Instantly Accessible */}
        <div style={{
          padding: '0.65rem 1.25rem',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', maxWidth: '140px', padding: '0.45rem', fontSize: '0.85rem' }}
          >
            ✕ Close Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
