import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface BillData {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerState?: string;
  customerPincode?: string;
  customerCity?: string;
  billingType: string;
  items: any[];
  subtotal: number;
  gstTotal: number;
  gstPercent: number;
  isInterstate?: boolean;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  paymentType: string;
  billNumber?: string;
}

// Build the HTML string for the memo-style invoice (single source of truth)
export const buildBillTemplateHTML = (billData: BillData, companyInfo?: any): string => {
  const logoHtml = companyInfo?.logo
    ? `<img src="${companyInfo.logo}" crossorigin="anonymous" alt="Logo" style="width:70px;height:70px;object-fit:cover;border-radius:8px;"/>`
    : '';

  return `
      <div style="max-width: 800px; margin: 0 auto; padding: 20px; background: white; font-family: Arial, sans-serif; border: 2px solid #1e40af;">
        <!-- Header Section - SAVERA ELECTRICALS -->
        <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #1e40af; padding-bottom: 8px;">
          <div style="display: flex; justify-content: center; margin: 0 0 4px 0;">${logoHtml}</div>
          <p style="font-size: 14px; color: #1e40af; margin: 0 0 8px 0; font-weight: 500;">${companyInfo?.name}</p>

          <!-- Phone Numbers -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #1e40af; font-weight: 500;">
            <div style="text-align: left;">
              <p style="margin: 0;">${companyInfo?.phone || 'Phone Number'}</p>
              <p style="margin: 0;">${companyInfo?.email || ''}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0;">${companyInfo?.gstNumber || ''}</p>
              <p style="margin: 0;">${companyInfo?.website || ''}</p>
            </div>
          </div>

          <!-- Address -->
          <p style="font-size: 12px; color: #1e40af; margin: 0 0 8px 0; font-weight: 500;">${companyInfo?.address?.street || ''} ${companyInfo?.address?.city || ''} ${companyInfo?.address?.state || ''} ${companyInfo?.address?.pincode || ''}</p>

          <!-- Memo Details -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <div style="text-align: left;">
              <p style="font-size: 14px; color: #1e40af; margin: 0; font-weight: 600;">CASH/CREDIT MEMO</p>
            </div>
            <div style="text-align: right;">
              
              <p style="font-size: 12px; color: #1e40af; margin: 6px 0 0 0;">No.: ${billData.billNumber || 'BILL-XXXXX'}</p>
              <p style="font-size: 12px; color: #1e40af; margin: 2px 0 0 0;">Date: ${new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>
        </div>

        <!-- Customer Information Section -->
        <div style="margin-bottom: 15px; border: 1px solid #1e40af; padding: 5px; background: #f8fafc;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <p style="font-size: 12px; color: #1e40af; margin: 0; font-weight: 600;">Name:</p>
              <p style="font-size: 14px; color: #111827; margin: 0; font-weight: 500; border-bottom: 1px solid #1e40af; padding-bottom: 2px;">${billData.customerName}</p>
            </div>
            <div>
              <p style="font-size: 12px; color: #1e40af; margin: 0; font-weight: 600;">Phone Number:</p>
              <p style="font-size: 14px; color: #111827; margin: 0; font-weight: 500; border-bottom: 1px solid #1e40af; padding-bottom: 2px;">${billData.customerPhone || 'N/A'}</p>
            </div>
          </div>
          <div style="margin-top: 5px;">
            <p style="font-size: 12px; color: #1e40af; margin: 0; font-weight: 600;">Address:</p>
            <p style="font-size: 14px; color: #111827; margin: 0; font-weight: 500; border-bottom: 1px solid #1e40af; padding-bottom: 2px;">${billData.customerAddress || 'N/A'}${billData.customerState ? `, ${billData.customerState}` : ''}${billData.customerPincode ? ` - ${billData.customerPincode}` : ''}</p>
          </div>
        </div>

        <!-- Items Table -->
        <div style="margin-bottom: 15px;">
          <table style="width: 100%; border-collapse: collapse; border: 2px solid #1e40af; font-size: 12px;">
            <thead>
              <tr style="background-color: #1e40af; color: white;">
                <th style="border: 1px solid #1e40af; padding: 8px 6px; text-align: center; font-weight: 600; width: 8%;">Sr.No.</th>
                <th style="border: 1px solid #1e40af; padding: 8px 6px; text-align: left; font-weight: 600; width: 50%;">Particulars</th>
                <th style="border: 1px solid #1e40af; padding: 8px 6px; text-align: center; font-weight: 600; width: 12%;">Qty.</th>
                <th style="border: 1px solid #1e40af; padding: 8px 6px; text-align: right; font-weight: 600; width: 15%;">Rate</th>
                <th style="border: 1px solid #1e40af; padding: 8px 6px; text-align: right; font-weight: 600; width: 15%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${billData.items.map((item, index) => `
                <tr style="${index % 2 === 0 ? 'background-color: #f8fafc;' : 'background-color: white;'}">
                  <td style="border: 1px solid #1e40af; padding: 6px 6px; text-align: center; color: #111827; font-weight: 500;">${index + 1}</td>
                  <td style="border: 1px solid #1e40af; padding: 6px 6px; color: #111827; font-weight: 500;">${item.name || item.itemName || 'Item'}</td>
                  <td style="border: 1px solid #1e40af; padding: 6px 6px; text-align: center; color: #111827; font-weight: 500;">${item.quantity || item.itemQuantity || 1}</td>
                  <td style="border: 1px solid #1e40af; padding: 6px 6px; text-align: right; color: #111827; font-weight: 500;">₹${(item.price || item.itemPrice || 0).toFixed(2)}</td>
                  <td style="border: 1px solid #1e40af; padding: 6px 6px; text-align: right; color: #111827; font-weight: 600;">₹${(item.total || item.itemTotal || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Bill Summary -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
          <div style="width: 280px; border: 2px solid #1e40af; padding: 10px; background: #f8fafc;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
              <span style="color: #1e40af; font-weight: 600;">Total</span>
              <span style="color: #111827; font-weight: 600;">₹${(billData.subtotal || billData.items?.reduce((sum, item) => sum + (item.total || item.itemTotal || 0), 0) || 0).toFixed(2)}</span>
            </div>
            ${(billData.billingType || '').toLowerCase() === "gst" ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                <span style="color: #1e40af; font-weight: 600;">GST (${billData.gstPercent || 18}%)</span>
                <span style="color: #111827; font-weight: 600;">₹${(billData.gstTotal || 0).toFixed(2)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; border-top: 2px solid #1e40af; padding-top: 5px; margin-top: 5px; color: #1e40af;">
              <span>Net Total</span>
              <span>₹${(billData.totalAmount || 0).toFixed(2)}</span>
            </div>
            ${billData.paidAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 12px;">
                <span style="color: #16a34a; font-weight: 600;">Paid Amount</span>
                <span style="color: #16a34a; font-weight: 600;">₹${(billData.paidAmount || 0).toFixed(2)}</span>
              </div>
            ` : ''}
            ${billData.remainingAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 12px;">
                <span style="color: #dc2626; font-weight: 600;">Pending Amount</span>
                <span style="color: #dc2626; font-weight: 600;">₹${(billData.remainingAmount || 0).toFixed(2)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Footer Section -->
        <div style="border-top: 2px solid #1e40af; padding-top: 10px; margin-top: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px;">
            <div style="text-align: left;">
              <p style="font-size: 10px; color: #1e40af; margin: 0; font-weight: 600;">Subject to ${companyInfo?.address?.city || 'Local'} Jurisdiction</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 12px; color: #1e40af; margin: 0; font-weight: 600;">Signature</p>
              <div style="border-bottom: 1px solid #1e40af; width: 120px; height: 20px; margin-top: 3px;"></div>
            </div>
          </div>
          
          <!-- Terms & Conditions -->
          <div style="background: #f8fafc; border: 1px solid #1e40af; padding: 8px; margin-top: 10px;">
            <h4 style="font-size: 12px; color: #1e40af; margin: 0 0 5px 0; font-weight: 600;">Terms & Condition</h4>
            <ul style="font-size: 10px; color: #111827; margin: 0; padding-left: 15px; line-height: 1.2;">
              <li style="margin-bottom: 2px;">Goods once sold will not be taken back or replaced.</li>
              <li style="margin-bottom: 2px;">Pre-Printed stationery order will be accepted on 50% advance payment of total amount.</li>
              <li style="margin-bottom: 2px;">Pre-Printed stationery order will be supplied after 15 days from order accepted by us.</li>
              <li style="margin-bottom: 2px;">Payment will be accepted by cheque/DD/ in favour of ${companyInfo?.name || 'Company Name'}.</li>
              <li style="margin-bottom: 0;">Payment will be made within 8 days from the date of delivery.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
};

export const generatePDFBlobFromHTML = async (html: string): Promise<Blob> => {
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '-9999px';
  tempDiv.style.width = '800px';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.innerHTML = html;
  document.body.appendChild(tempDiv);

  const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210;
  const pageHeight = 295;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  document.body.removeChild(tempDiv);
  return pdf.output('blob');
};

export const openPrintWindowWithHTML = (html: string, title: string) => {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) throw new Error('Could not open print window');
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><meta charset="UTF-8"></head><body>${html}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 500); };</script>
  </body></html>`);
  printWindow.document.close();
};

// Backwards-compatible helper to immediately download a PDF with this template
export const generateBillTemplatePDF = async (billData: BillData, companyInfo?: any): Promise<void> => {
  const html = buildBillTemplateHTML(billData, companyInfo);
  const blob = await generatePDFBlobFromHTML(html);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Invoice-${billData.billNumber || new Date().toISOString().split('T')[0]}.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
};
