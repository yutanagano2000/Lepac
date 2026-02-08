import { toBlob } from "html-to-image";
import { jsPDF } from "jspdf";

export async function captureMapAsPng(
  element: HTMLElement
): Promise<Blob | null> {
  try {
    const blob = await toBlob(element, {
      cacheBust: true,
      filter: (node) => {
        if (node instanceof HTMLElement) {
          const cl = node.classList;
          // Exclude leaflet-draw toolbar (may cause CORS issues)
          if (cl?.contains("leaflet-draw-toolbar") || cl?.contains("leaflet-draw-actions")) {
            return false;
          }
          // Exclude zoom control buttons from export
          if (cl?.contains("leaflet-control-zoom")) {
            return false;
          }
          // Exclude custom DrawingToolbar (positioned at top-left with z-[1000])
          // Check if it's a direct child of the map container at top-left position
          if (node.className?.includes("absolute") && node.className?.includes("top-3") && node.className?.includes("left-3")) {
            return false;
          }
          // Also exclude leaflet controls container
          if (cl?.contains("leaflet-control-container")) {
            return false;
          }
        }
        return true;
      },
    });
    return blob;
  } catch (error) {
    console.error("captureMapAsPng failed:", error);
    return null;
  }
}

export async function captureMapAsPdf(
  element: HTMLElement,
  title: string
): Promise<Blob | null> {
  try {
    const blob = await captureMapAsPng(element);
    if (!blob) return null;

    const imgUrl = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imgUrl;
    });

    const pdf = new jsPDF({
      orientation: img.width > img.height ? "landscape" : "portrait",
      unit: "mm",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const headerHeight = 15;

    // Title header
    pdf.setFontSize(14);
    pdf.text(title, margin, margin + 5);
    pdf.setFontSize(8);
    pdf.text(
      `作成日: ${new Date().toLocaleDateString("ja-JP")}`,
      pageWidth - margin - 40,
      margin + 5
    );

    // Draw a line under header
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, margin + headerHeight - 3, pageWidth - margin, margin + headerHeight - 3);

    // Fit image in remaining space
    const availWidth = pageWidth - margin * 2;
    const availHeight = pageHeight - margin * 2 - headerHeight;
    const ratio = Math.min(availWidth / img.width, availHeight / img.height);
    const imgW = img.width * ratio;
    const imgH = img.height * ratio;

    pdf.addImage(imgUrl, "PNG", margin, margin + headerHeight, imgW, imgH);
    URL.revokeObjectURL(imgUrl);

    return pdf.output("blob");
  } catch (error) {
    console.error("captureMapAsPdf failed:", error);
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
