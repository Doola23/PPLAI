// html2pdf.js ships no types; we only use the default export's chained API.
declare module 'html2pdf.js' {
  interface Html2Pdf {
    set(opt: Record<string, unknown>): Html2Pdf;
    from(element: HTMLElement): Html2Pdf;
    save(): Promise<void>;
    outputPdf(type: 'blob'): Promise<Blob>;
  }
  const html2pdf: () => Html2Pdf;
  export default html2pdf;
}
