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
    orientation?: 'portrait' | 'landscape'; // explain this
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

    // A4 dimensions: 210mm = 794px at 96dpi
    // Reduce to 90% to prevent overflow with margins
    const A4_WIDTH_PX = 794; // 96 DPI
    const SCALE_PERCENT = 0.9; // 90% of full width
    const CONTENT_WIDTH_PX = Math.floor(A4_WIDTH_PX * SCALE_PERCENT); // ~715px
    const A4_HEIGHT_PX = 1123; // 96 DPI

    // Set explicit pixel dimensions on clone - 90% of A4 width
    clone.style.width = CONTENT_WIDTH_PX + 'px';
    clone.style.maxWidth = CONTENT_WIDTH_PX + 'px';
    clone.style.minWidth = CONTENT_WIDTH_PX + 'px';
    clone.style.overflow = 'hidden';
    clone.style.margin = '20px auto';
    clone.style.padding = '10px';
    clone.style.boxSizing = 'border-box';
    clone.style.display = 'block';
    clone.style.backgroundColor = 'white';

    // Recursively fix all children - disable flex, enforce pixel widths
    const fixElement = (el: Element, parentWidth: number = A4_WIDTH_PX) => {
      if (el instanceof HTMLElement) {
        // Always enforce width constraints
        el.style.width = '100%';
        el.style.maxWidth = '100%';
        el.style.minWidth = '100%';
        el.style.boxSizing = 'border-box';
        el.style.overflowX = 'hidden';
        el.style.margin = el.style.margin || '0';
        
        const computed = window.getComputedStyle(el);
        
        // Convert flex/grid to block
        if (computed.display === 'flex' || computed.display === 'grid') {
          el.style.display = 'block';
        }
        
        // Table-specific fixes
        if (el.tagName === 'TABLE') {
          el.style.width = '100%';
          el.style.maxWidth = '100%';
          el.style.tableLayout = 'fixed';
          el.style.borderCollapse = 'collapse';
          el.style.overflow = 'hidden';
        }
        
        // Table cell fixes
        if (el.tagName === 'TD' || el.tagName === 'TH') {
          el.style.wordWrap = 'break-word';
          el.style.overflowWrap = 'break-word';
          el.style.wordBreak = 'break-word';
          el.style.hyphens = 'auto';
          el.style.overflow = 'hidden';
          el.style.maxWidth = '100%';
        }
        
        // Image fixes
        if (el.tagName === 'IMG') {
          el.style.maxWidth = '100%';
          el.style.height = 'auto';
          el.style.width = 'auto';
          el.style.display = 'block';
        }
      }
      
      // Recursively fix all children
      el.childNodes.forEach(child => {
        if (child.nodeType === 1 && child instanceof Element) { // Element node
          fixElement(child, parentWidth);
        }
      });
    };
    
    fixElement(clone);

    // Add aggressive CSS reset - 90% content width
    const style = document.createElement('style');
    style.textContent = `
      #a4-invoice,
      #a4-invoice * {
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
        -moz-box-shadow: none !important;
      }
      #a4-invoice {
        width: ${CONTENT_WIDTH_PX}px !important;
        max-width: ${CONTENT_WIDTH_PX}px !important;
        min-width: ${CONTENT_WIDTH_PX}px !important;
        overflow: hidden !important;
        margin: 20px auto !important;
        padding: 10px !important;
        box-sizing: border-box !important;
      }
      #a4-invoice div {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
      }
      #a4-invoice table {
        width: 100% !important;
        max-width: 100% !important;
        table-layout: fixed !important;
        overflow: hidden !important;
      }
      #a4-invoice th,
      #a4-invoice td {
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        word-wrap: break-word !important;
        overflow: hidden !important;
      }
    `;
    clone.insertBefore(style, clone.firstChild);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${filename}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 1, // Use exact scale to avoid oversizing
        logging: false, 
        useCORS: true,
        backgroundColor: '#ffffff',
        width: CONTENT_WIDTH_PX,
        windowHeight: A4_HEIGHT_PX
      },
      jsPDF: { 
        orientation: options?.orientation || 'portrait', 
        unit: 'mm', 
        format: options?.format || 'a4',
        compress: true
      },
      pagebreak: { mode: ['avoid-all'] }
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
