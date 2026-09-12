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
      legalName: 'WIDETECHNOS ACADEMY PRIVATE LIMITED',
      tradeName: 'WIDETECHNOS ACADEMY',
      gstin: '33AAAAA0000A1Z5',
      sellerState: 'Tamil Nadu',
      sellerStateCode: '33',
      registeredAddress: '123 Tech Park, Anna Salai, Chennai, Tamil Nadu - 600002',
      hsnSacCode: '999249',
      gstRate: 18,
      isInclusive: true
    });
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

// @desc    Get GST Tax Report for GSTR-1 & GSTR-3B filing
// @route   GET /api/admin/gst/report
// @access  Private/Admin
router.get('/report', protect, admin, async (req, res) => {
  try {
    const { startDate, endDate, month, year } = req.query;
    const gstConfig = await getOrInitGstConfig();

    let query = { status: 'success' };

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

    const transactions = await Transaction.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    let totalGrossSales = 0;
    let totalTaxableValue = 0;
    let totalGstCollected = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    let b2bInvoices = [];
    let b2cByState = {};
    let sacSummaryMap = {};

    transactions.forEach(txn => {
      const gross = txn.amount || 0;
      let base = txn.gstDetails?.baseAmount;
      let gst = txn.gstDetails?.gstAmount;
      let cgst = txn.gstDetails?.cgstAmount || 0;
      let sgst = txn.gstDetails?.sgstAmount || 0;
      let igst = txn.gstDetails?.igstAmount || 0;
      const isIntra = txn.gstDetails?.isIntraState ?? true;
      const posState = txn.billingDetails?.buyerState || txn.gstDetails?.posState || gstConfig.sellerState || 'Tamil Nadu';
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
        // Aggregate for B2C by State
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

      // SAC Summary map
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
      sacSummaryMap[sac].totalValue += gross;
      sacSummaryMap[sac].taxableBase += base;
      sacSummaryMap[sac].cgst += cgst;
      sacSummaryMap[sac].sgst += sgst;
      sacSummaryMap[sac].igst += igst;
      sacSummaryMap[sac].totalGst += gst;
    });

    const b2cSummaryList = Object.values(b2cByState);
    const sacSummaryList = Object.values(sacSummaryMap);

    res.json({
      sellerProfile: {
        legalName: gstConfig.legalName,
        tradeName: gstConfig.tradeName,
        gstin: gstConfig.gstin,
        sellerState: gstConfig.sellerState,
        hsnSacCode: gstConfig.hsnSacCode
      },
      summary: {
        totalInvoices: transactions.length,
        totalGrossSales: Math.round(totalGrossSales * 100) / 100,
        totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
        totalGstCollected: Math.round(totalGstCollected * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalIgst: Math.round(totalIgst * 100) / 100,
        b2bCount: b2bInvoices.length,
        b2cCount: transactions.length - b2bInvoices.length
      },
      b2bInvoices,
      b2cSummary: b2cSummaryList,
      sacSummary: sacSummaryList,
      allTransactions: transactions.map(t => ({
        txnid: t.txnid,
        invoiceNo: t.invoiceNo || t.txnid,
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
      }))
    });
  } catch (error) {
    console.error('GST Report generation error:', error);
    res.status(500).json({ message: 'Server error generating GST report' });
  }
});

// @desc    Export GSTR-1 CSV format for tax filing
// @route   GET /api/admin/gst/report/export
// @access  Private/Admin
router.get('/report/export', protect, admin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const gstConfig = await getOrInitGstConfig();

    let query = { status: 'success' };
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    const transactions = await Transaction.find(query).populate('userId', 'name email').sort({ createdAt: -1 });

    let csvContent = 'Invoice No,Invoice Date,Customer Name,Customer GSTIN,Type (B2B/B2C),Place of Supply (State),SAC Code,Gross Total (INR),Taxable Value (INR),GST Rate %,CGST (INR),SGST (INR),IGST (INR),Total Tax (INR)\n';

    transactions.forEach(t => {
      const gross = t.amount || 0;
      const base = t.gstDetails?.baseAmount || Math.round((gross / 1.18) * 100) / 100;
      const gst = t.gstDetails?.gstAmount || Math.round((gross - base) * 100) / 100;
      const cgst = t.gstDetails?.cgstAmount || 0;
      const sgst = t.gstDetails?.sgstAmount || 0;
      const igst = t.gstDetails?.igstAmount || 0;
      const pos = t.billingDetails?.buyerState || gstConfig.sellerState;
      const gstin = t.billingDetails?.buyerGstin || '';
      const isB2B = Boolean(gstin && gstin.trim().length > 5);

      const row = [
        `"${t.invoiceNo || t.txnid}"`,
        `"${new Date(t.createdAt).toISOString().split('T')[0]}"`,
        `"${(t.billingDetails?.buyerName || t.userId?.name || 'Customer').replace(/"/g, '""')}"`,
        `"${gstin}"`,
        `"${isB2B ? 'B2B' : 'B2C'}"`,
        `"${pos}"`,
        `"${t.gstDetails?.hsnSacCode || '999249'}"`,
        gross.toFixed(2),
        base.toFixed(2),
        '18%',
        cgst.toFixed(2),
        sgst.toFixed(2),
        igst.toFixed(2),
        gst.toFixed(2)
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=GST_Report_GSTR1_${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).send('Error exporting GST CSV');
  }
});

export default router;
