import express from 'express';
import GstConfig from '../models/GstConfig.js';
import Transaction from '../models/Transaction.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Helper to get or create default GST config
export const getOrInitGstConfig = async () => {
  let config = await GstConfig.findOne({});
  if (!config) {
    config = await GstConfig.create({
      legalName: 'WIDE VENTURES',
      tradeName: 'WIDE VENTURES (WIDE TECH / BROFFY)',
      gstin: '32FBEPK9712B1Z0',
      sellerState: 'Kerala',
      sellerStateCode: '32',
      registeredAddress: '8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731',
      hsnSacCode: '999249',
      gstRate: 18,
      isInclusive: true
    });
  } else if (config.gstin === '33AAAAA0000A1Z5' || !config.gstin || config.legalName.includes('WIDETECHNOS ACADEMY PRIVATE LIMITED')) {
    config.legalName = 'WIDE VENTURES';
    config.tradeName = 'WIDE VENTURES (WIDE TECH / BROFFY)';
    config.gstin = '32FBEPK9712B1Z0';
    config.sellerState = 'Kerala';
    config.sellerStateCode = '32';
    config.registeredAddress = '8/7/a, Thettamala, Mananthavady Road, Wayanad, Kerala - 670731';
    await config.save();
  }
  return config;
};

// @desc    Get GST configuration profile
// @route   GET /api/admin/gst/config
// @access  Private/Admin (or Public for checkout)
router.get('/config', async (req, res) => {
  try {
    const config = await getOrInitGstConfig();
    res.json(config);
  } catch (error) {
    console.error('Fetch GST config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update GST configuration profile
// @route   PUT /api/admin/gst/config
// @access  Private/Admin
router.put('/config', protect, admin, async (req, res) => {
  try {
    let config = await getOrInitGstConfig();
    
    const {
      legalName, tradeName, gstin, sellerState, sellerStateCode,
      registeredAddress, phone, email, hsnSacCode, gstRate, isInclusive
    } = req.body;

    if (legalName) config.legalName = legalName;
    if (tradeName) config.tradeName = tradeName;
    if (gstin) config.gstin = gstin.toUpperCase().trim();
    if (sellerState) config.sellerState = sellerState;
    if (sellerStateCode) config.sellerStateCode = sellerStateCode;
    if (registeredAddress) config.registeredAddress = registeredAddress;
    if (phone) config.phone = phone;
    if (email) config.email = email;
    if (hsnSacCode) config.hsnSacCode = hsnSacCode;
    if (gstRate !== undefined) config.gstRate = Number(gstRate);
    if (isInclusive !== undefined) config.isInclusive = isInclusive;
    config.updatedAt = new Date();

    await config.save();
    res.json({ message: 'GST settings updated successfully', config });
  } catch (error) {
    console.error('Update GST config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get paginated GST bills and tax invoices with search and filters
// @route   GET /api/admin/gst/bills
// @access  Private/Admin
router.get('/bills', protect, admin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    let query = { status: { $in: ['success', 'refunded'] } };

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.isB2B === 'true') {
      query['billingDetails.isB2B'] = true;
    } else if (req.query.isB2B === 'false') {
      query['billingDetails.isB2B'] = { $ne: true };
    }

    const { startDate, endDate, month, year, search } = req.query;

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    } else if (month && year) {
      const m = parseInt(month) - 1;
      const y = parseInt(year);
      query.createdAt = {
        $gte: new Date(y, m, 1),
        $lte: new Date(y, m + 1, 0, 23, 59, 59, 999)
      };
    }

    if (search && typeof search === 'string') {
      const safeSearch = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (safeSearch) {
        query.$or = [
          { txnid: { $regex: safeSearch, $options: 'i' } },
          { invoiceNo: { $regex: safeSearch, $options: 'i' } },
          { creditNoteNo: { $regex: safeSearch, $options: 'i' } },
          { 'billingDetails.buyerName': { $regex: safeSearch, $options: 'i' } },
          { 'billingDetails.buyerEmail': { $regex: safeSearch, $options: 'i' } },
          { 'billingDetails.buyerGstin': { $regex: safeSearch, $options: 'i' } }
        ];
      }
    }

    const total = await Transaction.countDocuments(query);
    const bills = await Transaction.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      bills,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Fetch GST bills error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get GST Tax Report for GSTR-1 & GSTR-3B filing (including Credit Notes/Refunds Sec 9B)
// @route   GET /api/admin/gst/report
// @access  Private/Admin
router.get('/report', protect, admin, async (req, res) => {
  try {
    const { startDate, endDate, month, year, search } = req.query;
    const gstConfig = await getOrInitGstConfig();

    let query = { status: { $in: ['success', 'refunded'] } };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    } else if (month && year) {
      const m = parseInt(month) - 1;
      const y = parseInt(year);
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    if (search && typeof search === 'string') {
      const safeSearch = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (safeSearch) {
        query.$or = [
          { txnid: { $regex: safeSearch, $options: 'i' } },
          { invoiceNo: { $regex: safeSearch, $options: 'i' } },
          { creditNoteNo: { $regex: safeSearch, $options: 'i' } },
          { 'billingDetails.buyerName': { $regex: safeSearch, $options: 'i' } },
          { 'billingDetails.buyerEmail': { $regex: safeSearch, $options: 'i' } },
          { 'billingDetails.buyerGstin': { $regex: safeSearch, $options: 'i' } }
        ];
      }
    }

    const transactions = await Transaction.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    let totalGrossSales = 0;
    let totalTaxableValue = 0;
    let totalGstCollected = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    let totalRefundsCount = 0;
    let totalRefundedAmount = 0;
    let totalRefundedBase = 0;
    let totalRefundedGst = 0;
    let totalRefundedCgst = 0;
    let totalRefundedSgst = 0;
    let totalRefundedIgst = 0;

    let b2bInvoices = [];
    let b2cByState = {};
    let creditNotesList = [];
    let sacSummaryMap = {};

    transactions.forEach(txn => {
      const isRefunded = txn.status === 'refunded';
      const gross = txn.amount || 0;
      let base = txn.gstDetails?.baseAmount;
      let gst = txn.gstDetails?.gstAmount;
      let cgst = txn.gstDetails?.cgstAmount || 0;
      let sgst = txn.gstDetails?.sgstAmount || 0;
      let igst = txn.gstDetails?.igstAmount || 0;
      const isIntra = txn.gstDetails?.isIntraState ?? true;
      const posState = txn.billingDetails?.buyerState || txn.gstDetails?.posState || gstConfig.sellerState || 'Kerala';
      const sac = txn.gstDetails?.hsnSacCode || gstConfig.hsnSacCode || '999249';
      const isB2B = Boolean(txn.billingDetails?.buyerGstin && txn.billingDetails.buyerGstin.trim().length > 5);

      // If old transaction created prior to GST fields update, compute on the fly
      if (base === undefined || base === 0) {
        const rate = gstConfig.gstRate || 18;
        base = Math.round((gross / (1 + rate / 100)) * 100) / 100;
        gst = Math.round((gross - base) * 100) / 100;
        if (posState.toLowerCase() === gstConfig.sellerState.toLowerCase()) {
          cgst = Math.round((gst / 2) * 100) / 100;
          sgst = Math.round((gst - cgst) * 100) / 100;
          igst = 0;
        } else {
          igst = gst;
          cgst = 0;
          sgst = 0;
        }
      }

      if (!isRefunded) {
        // Sales Invoices
        totalGrossSales += gross;
        totalTaxableValue += base;
        totalGstCollected += gst;
        totalCgst += cgst;
        totalSgst += sgst;
        totalIgst += igst;

        const formattedTxn = {
          id: txn._id,
          invoiceNo: txn.invoiceNo || txn.txnid,
          txnid: txn.txnid,
          date: txn.createdAt,
          buyerName: txn.billingDetails?.buyerName || txn.userId?.name || 'Customer',
          buyerEmail: txn.billingDetails?.buyerEmail || txn.userId?.email || '',
          buyerState: posState,
          buyerGstin: txn.billingDetails?.buyerGstin || '',
          isB2B,
          grossAmount: gross,
          taxableBase: base,
          gstRate: txn.gstDetails?.rate || 18,
          gstAmount: gst,
          cgst,
          sgst,
          igst,
          isIntraState: isIntra,
          hsnSacCode: sac
        };

        if (isB2B) {
          b2bInvoices.push(formattedTxn);
        } else {
          if (!b2cByState[posState]) {
            b2cByState[posState] = {
              posState,
              count: 0,
              grossSales: 0,
              taxableBase: 0,
              gstRate: 18,
              cgst: 0,
              sgst: 0,
              igst: 0,
              totalGst: 0
            };
          }
          b2cByState[posState].count += 1;
          b2cByState[posState].grossSales += gross;
          b2cByState[posState].taxableBase += base;
          b2cByState[posState].cgst += cgst;
          b2cByState[posState].sgst += sgst;
          b2cByState[posState].igst += igst;
          b2cByState[posState].totalGst += gst;
        }
      } else {
        // Credit Notes / Refunds (GSTR-1 Sec 9B)
        const refAmt = txn.refundDetails?.refundAmount || gross;
        const refBase = txn.refundDetails?.refundBaseAmount || base;
        const refGst = txn.refundDetails?.refundGstAmount || gst;
        const refCgst = txn.refundDetails?.refundCgstAmount || cgst;
        const refSgst = txn.refundDetails?.refundSgstAmount || sgst;
        const refIgst = txn.refundDetails?.refundIgstAmount || igst;

        totalRefundsCount += 1;
        totalRefundedAmount += refAmt;
        totalRefundedBase += refBase;
        totalRefundedGst += refGst;
        totalRefundedCgst += refCgst;
        totalRefundedSgst += refSgst;
        totalRefundedIgst += refIgst;

        creditNotesList.push({
          id: txn._id,
          creditNoteNo: txn.creditNoteNo || `CN-${txn.txnid}`,
          originalInvoiceNo: txn.invoiceNo || txn.txnid,
          txnid: txn.txnid,
          originalDate: txn.createdAt,
          refundDate: txn.refundDetails?.refundDate || txn.updatedAt || txn.createdAt,
          buyerName: txn.billingDetails?.buyerName || txn.userId?.name || 'Customer',
          buyerEmail: txn.billingDetails?.buyerEmail || txn.userId?.email || '',
          buyerState: posState,
          buyerGstin: txn.billingDetails?.buyerGstin || '',
          isB2B,
          refundAmount: refAmt,
          refundBaseAmount: refBase,
          refundGstAmount: refGst,
          cgstReversed: refCgst,
          sgstReversed: refSgst,
          igstReversed: refIgst,
          reason: txn.refundDetails?.refundReason || 'Student Cancellation',
          isIntraState: isIntra,
          hsnSacCode: sac
        });
      }

      // SAC Summary map (Net calculation)
      if (!sacSummaryMap[sac]) {
        sacSummaryMap[sac] = {
          hsnSacCode: sac,
          description: 'Online Educational Services / E-learning Courses',
          count: 0,
          totalValue: 0,
          taxableBase: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalGst: 0
        };
      }
      sacSummaryMap[sac].count += 1;
      const multiplier = isRefunded ? -1 : 1;
      sacSummaryMap[sac].totalValue += (multiplier * gross);
      sacSummaryMap[sac].taxableBase += (multiplier * base);
      sacSummaryMap[sac].cgst += (multiplier * cgst);
      sacSummaryMap[sac].sgst += (multiplier * sgst);
      sacSummaryMap[sac].igst += (multiplier * igst);
      sacSummaryMap[sac].totalGst += (multiplier * gst);
    });

    const b2cSummaryList = Object.values(b2cByState);
    const sacSummaryList = Object.values(sacSummaryMap);

    // Compute Net Liabilities (GSTR-3B Table 3.1 & 4)
    const netGrossSales = totalGrossSales - totalRefundedAmount;
    const netTaxableTurnover = totalTaxableValue - totalRefundedBase;
    const netGstPayable = totalGstCollected - totalRefundedGst;
    const netCgstPayable = totalCgst - totalRefundedCgst;
    const netSgstPayable = totalSgst - totalRefundedSgst;
    const netIgstPayable = totalIgst - totalRefundedIgst;

    const successCount = transactions.filter(t => t.status === 'success').length;

    res.json({
      sellerProfile: {
        legalName: gstConfig.legalName,
        tradeName: gstConfig.tradeName,
        gstin: gstConfig.gstin,
        sellerState: gstConfig.sellerState,
        hsnSacCode: gstConfig.hsnSacCode
      },
      summary: {
        // Gross Sales (Table 4 & 7)
        totalInvoices: successCount,
        totalGrossSales: Math.round(totalGrossSales * 100) / 100,
        totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
        totalGstCollected: Math.round(totalGstCollected * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalIgst: Math.round(totalIgst * 100) / 100,
        b2bCount: b2bInvoices.length,
        b2cCount: successCount - b2bInvoices.length,

        // Credit Notes / Refunds (GSTR-1 Sec 9B)
        totalRefundsCount,
        totalRefundedAmount: Math.round(totalRefundedAmount * 100) / 100,
        totalRefundedBase: Math.round(totalRefundedBase * 100) / 100,
        totalRefundedGst: Math.round(totalRefundedGst * 100) / 100,
        totalRefundedCgst: Math.round(totalRefundedCgst * 100) / 100,
        totalRefundedSgst: Math.round(totalRefundedSgst * 100) / 100,
        totalRefundedIgst: Math.round(totalRefundedIgst * 100) / 100,

        // Net Liability (GSTR-3B)
        netGrossSales: Math.round(netGrossSales * 100) / 100,
        netTaxableTurnover: Math.round(netTaxableTurnover * 100) / 100,
        netGstPayable: Math.round(netGstPayable * 100) / 100,
        netCgstPayable: Math.round(netCgstPayable * 100) / 100,
        netSgstPayable: Math.round(netSgstPayable * 100) / 100,
        netIgstPayable: Math.round(netIgstPayable * 100) / 100
      },
      b2bInvoices,
      b2cSummary: b2cSummaryList,
      creditNotes: creditNotesList,
      sacSummary: sacSummaryList,
      allTransactions: transactions.map(t => ({
        id: t._id,
        txnid: t.txnid,
        invoiceNo: t.invoiceNo || t.txnid,
        creditNoteNo: t.creditNoteNo || '',
        status: t.status,
        date: t.createdAt,
        buyerName: t.billingDetails?.buyerName || t.userId?.name || 'Customer',
        buyerGstin: t.billingDetails?.buyerGstin || 'N/A (B2C)',
        buyerState: t.billingDetails?.buyerState || gstConfig.sellerState,
        gross: t.amount,
        base: t.gstDetails?.baseAmount || Math.round((t.amount / 1.18) * 100) / 100,
        gst: t.gstDetails?.gstAmount || Math.round((t.amount - (t.amount / 1.18)) * 100) / 100,
        cgst: t.gstDetails?.cgstAmount || 0,
        sgst: t.gstDetails?.sgstAmount || 0,
        igst: t.gstDetails?.igstAmount || 0,
        refundDetails: t.refundDetails
      }))
    });
  } catch (error) {
    console.error('GST Report generation error:', error);
    res.status(500).json({ message: 'Server error generating GST report' });
  }
});

// @desc    Export comprehensive GSTR-1 CSV format (Invoices & Credit Notes Sec 9B)
// @route   GET /api/admin/gst/report/export
// @access  Private/Admin
router.get('/report/export', protect, admin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const gstConfig = await getOrInitGstConfig();

    let query = { status: { $in: ['success', 'refunded'] } };
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    const transactions = await Transaction.find(query).populate('userId', 'name email').sort({ createdAt: -1 });

    let csvContent = 'Document Type,Document No,Original Invoice Ref,Date,Customer Name,Customer GSTIN,Category,Place of Supply,SAC Code,Gross Value (INR),Taxable Base (INR),Rate %,CGST (INR),SGST (INR),IGST (INR),Total GST (INR),Status\n';

    transactions.forEach(t => {
      const isRefunded = t.status === 'refunded';
      const gross = t.amount || 0;
      const base = t.gstDetails?.baseAmount || Math.round((gross / 1.18) * 100) / 100;
      const gst = t.gstDetails?.gstAmount || Math.round((gross - base) * 100) / 100;
      const cgst = t.gstDetails?.cgstAmount || 0;
      const sgst = t.gstDetails?.sgstAmount || 0;
      const igst = t.gstDetails?.igstAmount || 0;
      const pos = t.billingDetails?.buyerState || gstConfig.sellerState;
      const gstin = t.billingDetails?.buyerGstin || '';
      const isB2B = Boolean(gstin && gstin.trim().length > 5);

      const docType = isRefunded ? 'Credit Note (Sec 9B)' : 'Tax Invoice';
      const docNo = isRefunded ? (t.creditNoteNo || `CN-${t.txnid}`) : (t.invoiceNo || t.txnid);
      const origRef = isRefunded ? (t.invoiceNo || t.txnid) : 'N/A';
      const sign = isRefunded ? '-' : '';

      const row = [
        `"${docType}"`,
        `"${docNo}"`,
        `"${origRef}"`,
        `"${new Date(isRefunded ? (t.refundDetails?.refundDate || t.updatedAt || t.createdAt) : t.createdAt).toISOString().split('T')[0]}"`,
        `"${(t.billingDetails?.buyerName || t.userId?.name || 'Customer').replace(/"/g, '""')}"`,
        `"${gstin}"`,
        `"${isB2B ? 'B2B' : 'B2C'}"`,
        `"${pos}"`,
        `"${t.gstDetails?.hsnSacCode || '999249'}"`,
        `${sign}${gross.toFixed(2)}`,
        `${sign}${base.toFixed(2)}`,
        '18%',
        `${sign}${cgst.toFixed(2)}`,
        `${sign}${sgst.toFixed(2)}`,
        `${sign}${igst.toFixed(2)}`,
        `${sign}${gst.toFixed(2)}`,
        `"${t.status.toUpperCase()}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=GSTR1_Tax_Report_${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).send('Error exporting GST CSV');
  }
});

// @desc    Export official GSTR-1 government offline JSON file (D2)
// @route   GET /api/admin/gst/report/export-json
// @access  Private/Admin
router.get('/report/export-json', protect, admin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const gstConfig = await getOrInitGstConfig();

    let query = { status: { $in: ['success', 'refunded'] } };
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    const transactions = await Transaction.find(query).populate('userId', 'name email').sort({ createdAt: -1 });

    const now = new Date();
    const fpMonth = String(now.getMonth() + 1).padStart(2, '0');
    const fpYear = String(now.getFullYear());
    const fp = `${fpMonth}${fpYear}`;

    let totalGross = 0;
    const b2bMap = {};
    const b2csMap = {};
    const cdnrList = [];
    const cdnurList = [];
    const hsnMap = {};

    transactions.forEach(t => {
      const isRefunded = t.status === 'refunded';
      const gross = t.amount || 0;
      const base = t.gstDetails?.baseAmount || Math.round((gross / 1.18) * 100) / 100;
      const cgst = t.gstDetails?.cgstAmount || 0;
      const sgst = t.gstDetails?.sgstAmount || 0;
      const igst = t.gstDetails?.igstAmount || 0;
      const gstin = t.billingDetails?.buyerGstin?.toUpperCase().trim() || '';
      const isB2B = Boolean(gstin && gstin.length > 5);
      const pos = t.billingDetails?.buyerState || gstConfig.sellerState;
      const sac = t.gstDetails?.hsnSacCode || '999249';

      if (!isRefunded) {
        totalGross += gross;

        if (isB2B) {
          if (!b2bMap[gstin]) {
            b2bMap[gstin] = { ctin: gstin, inv: [] };
          }
          b2bMap[gstin].inv.push({
            inum: t.invoiceNo || t.txnid,
            idt: new Date(t.createdAt).toISOString().split('T')[0],
            val: gross,
            pos: pos,
            rchrg: 'N',
            inv_typ: 'R',
            itms: [{
              num: 1,
              itm_det: {
                txval: base,
                rt: 18,
                iamt: igst,
                camt: cgst,
                samt: sgst,
                csamt: 0
              }
            }]
          });
        } else {
          const isIntra = pos.trim().toLowerCase() === gstConfig.sellerState.trim().toLowerCase();
          const key = `${pos}_18`;
          if (!b2csMap[key]) {
            b2csMap[key] = {
              sply_ty: isIntra ? 'INTRA' : 'INTER',
              pos: pos,
              typ: 'OE',
              rt: 18,
              txval: 0,
              iamt: 0,
              camt: 0,
              samt: 0,
              csamt: 0
            };
          }
          b2csMap[key].txval = Math.round((b2csMap[key].txval + base) * 100) / 100;
          b2csMap[key].iamt = Math.round((b2csMap[key].iamt + igst) * 100) / 100;
          b2csMap[key].camt = Math.round((b2csMap[key].camt + cgst) * 100) / 100;
          b2csMap[key].samt = Math.round((b2csMap[key].samt + sgst) * 100) / 100;
        }
      } else {
        // Credit Notes (Section 9B)
        const cnItem = {
          nt_num: t.creditNoteNo || `CN-${t.txnid}`,
          nt_dt: new Date(t.refundDetails?.refundDate || t.updatedAt).toISOString().split('T')[0],
          inum: t.invoiceNo || t.txnid,
          idt: new Date(t.createdAt).toISOString().split('T')[0],
          val: gross,
          itms: [{
            num: 1,
            itm_det: {
              txval: base,
              rt: 18,
              iamt: igst,
              camt: cgst,
              samt: sgst,
              csamt: 0
            }
          }]
        };

        if (isB2B) {
          cdnrList.push({ ctin: gstin, nt: [cnItem] });
        } else {
          cdnurList.push({
            typ: 'B2CL',
            nt_num: cnItem.nt_num,
            nt_dt: cnItem.nt_dt,
            inum: cnItem.inum,
            idt: cnItem.idt,
            val: gross,
            itms: cnItem.itms
          });
        }
      }

      // HSN 12
      if (!hsnMap[sac]) {
        hsnMap[sac] = {
          num: Object.keys(hsnMap).length + 1,
          hsn_sc: sac,
          desc: 'Online Educational Services / E-learning Courses',
          uqc: 'OTH',
          qty: 0,
          val: 0,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0
        };
      }
      const mult = isRefunded ? -1 : 1;
      hsnMap[sac].qty += 1;
      hsnMap[sac].val = Math.round((hsnMap[sac].val + mult * gross) * 100) / 100;
      hsnMap[sac].txval = Math.round((hsnMap[sac].txval + mult * base) * 100) / 100;
      hsnMap[sac].iamt = Math.round((hsnMap[sac].iamt + mult * igst) * 100) / 100;
      hsnMap[sac].camt = Math.round((hsnMap[sac].camt + mult * cgst) * 100) / 100;
      hsnMap[sac].samt = Math.round((hsnMap[sac].samt + mult * sgst) * 100) / 100;
    });

    const gstr1Payload = {
      gstin: gstConfig.gstin,
      fp,
      gt: Math.round(totalGross * 100) / 100,
      cur_gt: Math.round(totalGross * 100) / 100,
      b2b: Object.values(b2bMap),
      b2cs: Object.values(b2csMap),
      cdnr: cdnrList,
      cdnur: cdnurList,
      hsn: {
        data: Object.values(hsnMap)
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=GSTR1_Offline_${fp}_${Date.now()}.json`);
    res.status(200).json(gstr1Payload);
  } catch (error) {
    console.error('Export GSTR-1 JSON error:', error);
    res.status(500).json({ message: 'Error exporting GSTR-1 JSON', error: error.message });
  }
});

export default router;
