/**
 * PDF Generator Service
 * Handles conversion of invoice HTML to PDF format
 */

export const generatePDF = async (
  htmlContent: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
    margin?: number | { top: number; right: number; bottom: number; left: number };
  }
) => {
  try {
    // Check if html2pdf is available
    const html2pdf = (window as any).html2pdf;
    
    if (!html2pdf) {
      console.error('html2pdf library not loaded');
      throw new Error('PDF generation library not available. Please refresh the page.');
    }

    const defaultOptions = {
      margin: [10, 10, 10, 10],
      filename: `${filename}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: false, useCORS: true },
      jsPDF: { 
        orientation: options?.orientation || 'portrait', 
        unit: 'mm', 
        format: options?.format || 'a4',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    
    // Remove non-printable elements
    element.querySelectorAll('.no-print, button, [role="button"]').forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.display = 'none';
      }
    });

    // Make the element visible and properly styled for PDF
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.background = 'white';
    element.style.padding = '0';
    element.style.margin = '0';
    
    document.body.appendChild(element);

    // Generate PDF
    await html2pdf().set(defaultOptions).from(element).save();

    // Clean up
    document.body.removeChild(element);

  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

/**
 * Generate PDF from an element
 */
export const generatePDFFromElement = async (
  elementId: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
  }
) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) {
      throw new Error('PDF generation library not available');
    }

    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true) as HTMLElement;

    // Remove non-printable elements
    clone.querySelectorAll('.no-print, button, [role="button"]').forEach(el => {
      if (el instanceof HTMLElement) {
        el.remove();
      }
    });

    // Remove shadows and set proper styling
    const style = document.createElement('style');
    style.textContent = `
      * {
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
      }
    `;
    clone.appendChild(style);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${filename}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        logging: false, 
        useCORS: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        orientation: options?.orientation || 'portrait', 
        unit: 'mm', 
        format: options?.format || 'a4',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    await html2pdf().set(opt).from(clone).save();

  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

/**
 * Download file helper (generic)
 */
export const downloadFile = (data: Blob | string, filename: string, mimeType: string = 'application/octet-stream') => {
  try {
    const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};
